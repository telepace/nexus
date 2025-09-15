"""
安全服务 - 综合安全强化实现
API限流、输入验证、内容加密、安全审计
"""

import asyncio
import hashlib
import hmac
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
from cryptography.fernet import Fernet
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field, validator
from sqlmodel import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.models import User, ContentItem

logger = logging.getLogger(__name__)


class SecurityConfig(BaseModel):
    """安全配置"""
    api_rate_limit: int = 100  # 每分钟请求数
    login_attempt_limit: int = 5  # 登录尝试次数
    session_timeout: int = 1800  # 30分钟
    password_min_length: int = 8
    require_mfa: bool = False
    audit_retention_days: int = 90


class RateLimitRule(BaseModel):
    """限流规则"""
    endpoint: str
    max_requests: int
    time_window: int  # 秒
    per_user: bool = False


class SecurityAuditLog(BaseModel):
    """安全审计日志"""
    timestamp: datetime
    user_id: Optional[str] = None
    ip_address: str
    user_agent: str
    endpoint: str
    action: str
    risk_level: str  # low, medium, high, critical
    details: Dict[str, Any]


class APIRateLimiter:
    """API限流器"""
    
    def __init__(self):
        # 限流规则配置
        self.rules = [
            RateLimitRule(endpoint="/api/v1/auth/login", max_requests=5, time_window=300),  # 5分钟5次
            RateLimitRule(endpoint="/api/v1/auth/register", max_requests=3, time_window=3600),  # 1小时3次
            RateLimitRule(endpoint="/api/v1/content", max_requests=50, time_window=60, per_user=True),  # 用户每分钟50次
            RateLimitRule(endpoint="/api/v1/ai", max_requests=20, time_window=60, per_user=True),  # AI请求限制
            RateLimitRule(endpoint="*", max_requests=100, time_window=60),  # 全局限制
        ]
    
    async def check_rate_limit(self, request: Request, user_id: Optional[str] = None) -> bool:
        """检查请求是否超出限流"""
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        for rule in self.rules:
            if self._match_endpoint(endpoint, rule.endpoint):
                key = self._generate_key(rule, endpoint, client_ip, user_id)
                
                if not await self._check_limit(key, rule):
                    await self._log_rate_limit_exceeded(client_ip, endpoint, rule)
                    return False
        
        return True
    
    def _match_endpoint(self, endpoint: str, pattern: str) -> bool:
        """匹配端点模式"""
        if pattern == "*":
            return True
        return endpoint.startswith(pattern)
    
    def _generate_key(self, rule: RateLimitRule, endpoint: str, ip: str, user_id: Optional[str]) -> str:
        """生成限流键"""
        if rule.per_user and user_id:
            return f"rate_limit:user:{user_id}:{endpoint}:{rule.time_window}"
        else:
            return f"rate_limit:ip:{ip}:{endpoint}:{rule.time_window}"
    
    async def _check_limit(self, key: str, rule: RateLimitRule) -> bool:
        """检查具体限制"""
        try:
            current_requests = await redis_client.get(key)
            
            if current_requests is None:
                # 首次请求
                await redis_client.setex(key, rule.time_window, 1)
                return True
            
            current_count = int(current_requests)
            if current_count >= rule.max_requests:
                return False
            
            # 增加计数
            await redis_client.incr(key)
            return True
            
        except Exception as e:
            logger.error(f"限流检查失败: {e}")
            return True  # 错误时允许通过
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        return request.client.host if request.client else "unknown"
    
    async def _log_rate_limit_exceeded(self, ip: str, endpoint: str, rule: RateLimitRule):
        """记录限流超出"""
        logger.warning(f"Rate limit exceeded: IP={ip}, endpoint={endpoint}, limit={rule.max_requests}/{rule.time_window}s")
        
        # 记录到安全审计日志
        audit_log = SecurityAuditLog(
            timestamp=datetime.now(timezone.utc),
            ip_address=ip,
            user_agent="",
            endpoint=endpoint,
            action="rate_limit_exceeded",
            risk_level="medium",
            details={"rule": rule.dict()}
        )
        await SecurityService().log_security_event(audit_log)


class InputValidator:
    """输入验证器"""
    
    # 危险模式
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # XSS
        r'javascript:',  # JavaScript URLs
        r'on\w+\s*=',  # Event handlers
        r'expression\s*\(',  # CSS expression
        r'union\s+select',  # SQL injection
        r'drop\s+table',  # SQL drop
        r'exec\s*\(',  # Code execution
        r'eval\s*\(',  # Code evaluation
        r'system\s*\(',  # System commands
        r'\.\./.*\.\.',  # Path traversal
    ]
    
    # 文件类型白名单
    ALLOWED_FILE_TYPES = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'document': ['pdf', 'doc', 'docx', 'txt', 'md'],
        'audio': ['mp3', 'wav', 'ogg'],
        'video': ['mp4', 'webm', 'ogv']
    }
    
    def validate_input(self, text: str, field_name: str = "input") -> str:
        """验证和清理文本输入"""
        if not text:
            return text
        
        # 检查长度
        if len(text) > 50000:  # 50KB 限制
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} 长度超出限制 (最大50KB)"
            )
        
        # 检查危险模式
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"检测到危险输入模式: {pattern} in {field_name}")
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} 包含不安全内容"
                )
        
        # 基础清理
        cleaned_text = self._sanitize_html(text)
        return cleaned_text
    
    def validate_url(self, url: str) -> str:
        """验证URL安全性"""
        if not url:
            return url
        
        # 检查协议
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(
                status_code=400,
                detail="URL 必须使用 HTTP 或 HTTPS 协议"
            )
        
        # 检查危险域名
        dangerous_domains = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.']
        if any(domain in url.lower() for domain in dangerous_domains):
            raise HTTPException(
                status_code=400,
                detail="不允许访问内网地址"
            )
        
        return url
    
    def validate_file_upload(self, filename: str, content_type: str, file_size: int) -> bool:
        """验证文件上传"""
        # 文件名检查
        if not filename or '..' in filename or '/' in filename:
            raise HTTPException(
                status_code=400,
                detail="无效的文件名"
            )
        
        # 扩展名检查
        file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
        allowed_extensions = []
        for category in self.ALLOWED_FILE_TYPES.values():
            allowed_extensions.extend(category)
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {file_ext}"
            )
        
        # 文件大小检查 (10MB)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="文件大小超出限制 (最大10MB)"
            )
        
        return True
    
    def _sanitize_html(self, text: str) -> str:
        """基础HTML清理"""
        # 简单的HTML实体转义
        text = text.replace('<', '&lt;').replace('>', '&gt;')
        text = text.replace('"', '&quot;').replace("'", '&#x27;')
        return text


class ContentEncryption:
    """内容加密服务"""
    
    def __init__(self):
        self.fernet = Fernet(settings.APP_SYMMETRIC_ENCRYPTION_KEY.encode())
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """加密敏感数据"""
        if not data:
            return data
        
        try:
            encrypted_data = self.fernet.encrypt(data.encode())
            return encrypted_data.decode()
        except Exception as e:
            logger.error(f"数据加密失败: {e}")
            raise HTTPException(status_code=500, detail="数据加密失败")
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """解密敏感数据"""
        if not encrypted_data:
            return encrypted_data
        
        try:
            decrypted_data = self.fernet.decrypt(encrypted_data.encode())
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"数据解密失败: {e}")
            raise HTTPException(status_code=500, detail="数据解密失败")
    
    def hash_password(self, password: str) -> str:
        """密码哈希"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_api_signature(self, payload: str, secret: str) -> str:
        """生成API签名"""
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def verify_api_signature(self, payload: str, signature: str, secret: str) -> bool:
        """验证API签名"""
        expected_signature = self.generate_api_signature(payload, secret)
        return hmac.compare_digest(signature, expected_signature)


class SecurityService:
    """安全服务主类"""
    
    def __init__(self):
        self.rate_limiter = APIRateLimiter()
        self.input_validator = InputValidator()
        self.content_encryption = ContentEncryption()
        self.config = SecurityConfig()
    
    async def validate_request(self, request: Request, user_id: Optional[str] = None) -> bool:
        """验证请求安全性"""
        # 检查限流
        if not await self.rate_limiter.check_rate_limit(request, user_id):
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")
        
        return True
    
    async def log_security_event(self, audit_log: SecurityAuditLog):
        """记录安全事件"""
        try:
            # 存储到Redis (临时存储)
            key = f"security_log:{audit_log.timestamp.isoformat()}"
            await redis_client.setex(
                key,
                self.config.audit_retention_days * 24 * 3600,
                json.dumps(audit_log.dict(), default=str)
            )
            
            # 高风险事件立即报警
            if audit_log.risk_level in ['high', 'critical']:
                await self._send_security_alert(audit_log)
            
        except Exception as e:
            logger.error(f"安全事件记录失败: {e}")
    
    async def _send_security_alert(self, audit_log: SecurityAuditLog):
        """发送安全警报"""
        logger.critical(f"安全警报: {audit_log.action} - {audit_log.details}")
        # 这里可以集成邮件、Slack、钉钉等通知服务
    
    async def get_security_stats(self) -> Dict[str, Any]:
        """获取安全统计"""
        try:
            # 获取最近24小时的安全事件
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(hours=24)
            
            # 从Redis获取日志
            pattern = "security_log:*"
            keys = await redis_client.keys(pattern)
            
            logs = []
            for key in keys:
                log_data = await redis_client.get(key)
                if log_data:
                    log = json.loads(log_data)
                    log_time = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
                    if start_time <= log_time <= end_time:
                        logs.append(log)
            
            # 统计分析
            stats = {
                "total_events": len(logs),
                "risk_levels": {},
                "top_actions": {},
                "unique_ips": set(),
                "failed_logins": 0,
                "rate_limit_violations": 0
            }
            
            for log in logs:
                # 风险等级统计
                risk_level = log.get('risk_level', 'unknown')
                stats['risk_levels'][risk_level] = stats['risk_levels'].get(risk_level, 0) + 1
                
                # 动作统计
                action = log.get('action', 'unknown')
                stats['top_actions'][action] = stats['top_actions'].get(action, 0) + 1
                
                # IP统计
                stats['unique_ips'].add(log.get('ip_address', ''))
                
                # 特定事件统计
                if action == 'login_failed':
                    stats['failed_logins'] += 1
                elif action == 'rate_limit_exceeded':
                    stats['rate_limit_violations'] += 1
            
            stats['unique_ips'] = len(stats['unique_ips'])
            
            return stats
            
        except Exception as e:
            logger.error(f"获取安全统计失败: {e}")
            return {"error": "统计数据获取失败"}
    
    def validate_content_input(self, content: str) -> str:
        """验证内容输入"""
        return self.input_validator.validate_input(content, "content")
    
    def validate_url_input(self, url: str) -> str:
        """验证URL输入"""
        return self.input_validator.validate_url(url)
    
    def encrypt_user_data(self, data: str) -> str:
        """加密用户数据"""
        return self.content_encryption.encrypt_sensitive_data(data)
    
    def decrypt_user_data(self, encrypted_data: str) -> str:
        """解密用户数据"""
        return self.content_encryption.decrypt_sensitive_data(encrypted_data)


# 全局安全服务实例
security_service = SecurityService()


# 中间件函数
async def security_middleware(request: Request, call_next):
    """安全中间件"""
    start_time = time.time()
    
    try:
        # 记录请求开始
        client_ip = security_service.rate_limiter._get_client_ip(request)
        
        # 基础安全检查
        await security_service.validate_request(request)
        
        # 处理请求
        response = await call_next(request)
        
        # 记录成功请求
        process_time = time.time() - start_time
        if process_time > 5:  # 慢请求警告
            audit_log = SecurityAuditLog(
                timestamp=datetime.now(timezone.utc),
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                action="slow_request",
                risk_level="medium",
                details={"process_time": process_time}
            )
            await security_service.log_security_event(audit_log)
        
        return response
        
    except HTTPException as e:
        # 记录安全异常
        audit_log = SecurityAuditLog(
            timestamp=datetime.now(timezone.utc),
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", ""),
            endpoint=request.url.path,
            action="security_exception",
            risk_level="high" if e.status_code == 429 else "medium",
            details={"status_code": e.status_code, "detail": e.detail}
        )
        await security_service.log_security_event(audit_log)
        raise
        
    except Exception as e:
        # 记录系统错误
        audit_log = SecurityAuditLog(
            timestamp=datetime.now(timezone.utc),
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", ""),
            endpoint=request.url.path,
            action="system_error",
            risk_level="high",
            details={"error": str(e)}
        )
        await security_service.log_security_event(audit_log)
        raise


# 装饰器：输入验证
def validate_input(field_name: str = "input"):
    """输入验证装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 查找需要验证的参数
            for key, value in kwargs.items():
                if isinstance(value, str) and key.endswith(('_content', '_text', '_input')):
                    kwargs[key] = security_service.validate_content_input(value)
                elif isinstance(value, str) and key.endswith('_url'):
                    kwargs[key] = security_service.validate_url_input(value)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator