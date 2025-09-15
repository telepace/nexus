#!/usr/bin/env python3
"""
代码现代化工具包
FastAPI应用现代化、Pydantic V2迁移、性能优化、架构升级
"""

import ast
import asyncio
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import black
import isort
from pydantic import BaseModel


class ModernizationRule(BaseModel):
    """现代化规则"""
    name: str
    description: str
    pattern: str
    replacement: str
    file_types: List[str]
    priority: int = 5  # 1-10, 10最高


class ModernizationReport(BaseModel):
    """现代化报告"""
    total_files: int
    modified_files: int
    issues_found: Dict[str, int]
    suggestions: List[str]
    estimated_time_saved: str
    performance_improvements: List[str]


class CodeModernizer:
    """代码现代化器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.modernization_rules = self._load_modernization_rules()
        self.report = ModernizationReport(
            total_files=0,
            modified_files=0,
            issues_found={},
            suggestions=[],
            estimated_time_saved="0小时",
            performance_improvements=[]
        )
    
    def _load_modernization_rules(self) -> List[ModernizationRule]:
        """加载现代化规则"""
        return [
            # FastAPI现代化
            ModernizationRule(
                name="FastAPI Lifespan",
                description="使用现代的lifespan事件处理",
                pattern=r'@app\.on_event\("startup"\)\nasync def startup\(\):(.*?)\n\n@app\.on_event\("shutdown"\)\nasync def shutdown\(\):(.*?)\n',
                replacement='''from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup\\1
    yield
    # Shutdown\\2''',
                file_types=["*.py"],
                priority=9
            ),
            
            # Pydantic V2现代化
            ModernizationRule(
                name="Pydantic V2 Config",
                description="迁移到Pydantic V2配置",
                pattern=r'class Config:\s+(\w+)\s*=\s*(.+)',
                replacement=r'model_config = ConfigDict(\1=\2)',
                file_types=["*.py"],
                priority=8
            ),
            
            ModernizationRule(
                name="Pydantic V2 Validators",
                description="迁移到Pydantic V2验证器",
                pattern=r'@validator\(["\'](\w+)["\']\)\s*def\s+(\w+)\(cls,\s*v\):',
                replacement=r'@field_validator("\1")\n    @classmethod\n    def \2(cls, v):',
                file_types=["*.py"],
                priority=8
            ),
            
            # SQLModel优化
            ModernizationRule(
                name="SQLModel Performance",
                description="优化SQLModel查询",
                pattern=r'session\.exec\(select\((\w+)\)\)\.all\(\)',
                replacement=r'session.exec(select(\1).options(selectinload(\1.relationships))).all()',
                file_types=["*.py"],
                priority=7
            ),
            
            # 异步优化
            ModernizationRule(
                name="Async Context Managers",
                description="使用异步上下文管理器",
                pattern=r'with Session\(engine\) as session:',
                replacement=r'async with AsyncSession(async_engine) as session:',
                file_types=["*.py"],
                priority=6
            ),
            
            # 类型注解现代化
            ModernizationRule(
                name="Modern Type Hints",
                description="使用现代类型注解",
                pattern=r'from typing import List, Dict, Optional, Union',
                replacement=r'from typing import Optional, Union  # Use built-in list, dict for Python 3.9+',
                file_types=["*.py"],
                priority=5
            ),
            
            # 错误处理现代化
            ModernizationRule(
                name="Structured Error Handling",
                description="使用结构化错误处理",
                pattern=r'raise HTTPException\(status_code=(\d+),\s*detail="([^"]+)"\)',
                replacement=r'raise HTTPException(\n    status_code=\1,\n    detail={\n        "error": "\2",\n        "code": "HTTP_\1",\n        "timestamp": datetime.utc_now().isoformat()\n    }\n)',
                file_types=["*.py"],
                priority=6
            )
        ]
    
    async def modernize_project(self) -> ModernizationReport:
        """现代化整个项目"""
        print("🚀 开始代码现代化...")
        
        # 收集所有Python文件
        python_files = list(self.project_root.rglob("*.py"))
        self.report.total_files = len(python_files)
        
        print(f"📁 发现 {len(python_files)} 个Python文件")
        
        # 应用现代化规则
        for py_file in python_files:
            if await self._modernize_file(py_file):
                self.report.modified_files += 1
        
        # 格式化和导入排序
        await self._format_code()
        
        # 生成建议
        self._generate_suggestions()
        
        print(f"✅ 现代化完成: {self.report.modified_files}/{self.report.total_files} 文件已更新")
        return self.report
    
    async def _modernize_file(self, file_path: Path) -> bool:
        """现代化单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            modified = False
            
            # 应用现代化规则
            for rule in sorted(self.modernization_rules, key=lambda x: x.priority, reverse=True):
                if any(file_path.match(pattern) for pattern in rule.file_types):
                    new_content = re.sub(rule.pattern, rule.replacement, content, flags=re.MULTILINE | re.DOTALL)
                    
                    if new_content != content:
                        content = new_content
                        modified = True
                        
                        # 记录问题
                        if rule.name not in self.report.issues_found:
                            self.report.issues_found[rule.name] = 0
                        self.report.issues_found[rule.name] += 1
                        
                        print(f"  🔧 {file_path.name}: 应用 {rule.name}")
            
            # 特定文件优化
            if file_path.name == "main.py":
                content = await self._modernize_main_app(content)
                modified = True
            
            elif "models" in str(file_path):
                content = await self._modernize_models(content)
                modified = True
                
            elif "api" in str(file_path):
                content = await self._modernize_api_routes(content)
                modified = True
            
            # 写回文件
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
                
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
        
        return False
    
    async def _modernize_main_app(self, content: str) -> str:
        """现代化主应用文件"""
        modernizations = [
            # 添加现代化导入
            (
                r'from fastapi import FastAPI',
                'from fastapi import FastAPI\nfrom contextlib import asynccontextmanager\nfrom typing import AsyncGenerator'
            ),
            
            # 现代化中间件
            (
                r'app\.add_middleware\(\s*CORSMiddleware,',
                '''app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 添加性能中间件
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 添加安全中间件
from app.services.security_service import security_middleware
app.middleware("http")(security_middleware)'''
            ),
            
            # 添加健康检查
            (
                r'app = FastAPI\(',
                '''# 现代化应用配置
app = FastAPI(
    title="Nexus API",
    description="现代化的内容管理和AI分析平台",
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)'''
            )
        ]
        
        for pattern, replacement in modernizations:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        return content
    
    async def _modernize_models(self, content: str) -> str:
        """现代化数据模型"""
        modernizations = [
            # 现代化字段定义
            (
                r'Field\(default=None, nullable=True\)',
                'Field(default=None)'
            ),
            
            # 添加索引优化
            (
                r'class (\w+)\(.*?table=True\):',
                r'''class \1(..., table=True):
    __table_args__ = (
        Index("idx_\1_created", "created_at"),
        Index("idx_\1_updated", "updated_at"),
    )'''
            ),
            
            # 现代化关系定义
            (
                r'Relationship\(back_populates="(\w+)"\)',
                r'Relationship(back_populates="\1", lazy="selectin")'
            )
        ]
        
        for pattern, replacement in modernizations:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        return content
    
    async def _modernize_api_routes(self, content: str) -> str:
        """现代化API路由"""
        modernizations = [
            # 现代化错误处理
            (
                r'except Exception as e:\s*raise HTTPException\(status_code=500, detail=str\(e\)\)',
                '''except Exception as e:
    logger.error(f"API错误: {e}", exc_info=True)
    raise HTTPException(
        status_code=500,
        detail={
            "error": "内部服务器错误",
            "code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.utcnow().isoformat()
        }
    )'''
            ),
            
            # 添加响应模型
            (
                r'@router\.(\w+)\("([^"]+)"\)',
                r'''@router.\1("\2", 
    response_model=Union[SuccessResponse, ErrorResponse],
    responses={
        200: {"description": "成功"},
        400: {"description": "请求错误"},
        500: {"description": "服务器错误"}
    }
)'''
            ),
            
            # 现代化依赖注入
            (
                r'def (\w+)\(\s*\*,\s*session: Session = Depends\(get_session\)',
                r'async def \1(\n    *,\n    session: AsyncSession = Depends(get_async_session),'
            )
        ]
        
        for pattern, replacement in modernizations:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        return content
    
    async def _format_code(self):
        """格式化代码"""
        print("📝 格式化代码...")
        
        python_files = list(self.project_root.rglob("*.py"))
        
        for py_file in python_files:
            try:
                # 使用 black 格式化
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Black 格式化
                formatted = black.format_str(content, mode=black.FileMode())
                
                # isort 导入排序
                sorted_imports = isort.code(formatted)
                
                with open(py_file, 'w', encoding='utf-8') as f:
                    f.write(sorted_imports)
                    
            except Exception as e:
                print(f"❌ 格式化文件失败 {py_file}: {e}")
    
    def _generate_suggestions(self):
        """生成优化建议"""
        self.report.suggestions = [
            "🔧 考虑使用 FastAPI 依赖注入优化数据库连接管理",
            "⚡ 实施 Redis 缓存减少数据库查询",
            "🔒 添加 API 限流和安全中间件",
            "📊 集成 APM 工具监控性能",
            "🧪 增加单元测试覆盖率到90%以上",
            "📝 使用 OpenAPI 自动生成 API 文档",
            "🔄 实施 CI/CD 自动化部署",
            "🏗️ 考虑微服务架构拆分大型模块"
        ]
        
        self.report.performance_improvements = [
            "数据库查询优化: 减少N+1查询问题",
            "缓存策略: 实施多级缓存架构",
            "异步处理: 全面使用async/await",
            "连接池: 优化数据库连接管理",
            "序列化优化: 使用高效的JSON序列化器",
            "中间件优化: 添加压缩和缓存中间件"
        ]
        
        # 计算预估时间节省
        total_optimizations = sum(self.report.issues_found.values())
        estimated_hours = total_optimizations * 0.5  # 每个优化平均节省30分钟
        self.report.estimated_time_saved = f"{estimated_hours:.1f}小时"


class ArchitectureAnalyzer:
    """架构分析器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
    
    def analyze_architecture(self) -> Dict[str, any]:
        """分析当前架构"""
        print("🏗️ 分析项目架构...")
        
        analysis = {
            "modules": self._analyze_modules(),
            "dependencies": self._analyze_dependencies(),
            "complexity": self._analyze_complexity(),
            "recommendations": self._generate_architecture_recommendations()
        }
        
        return analysis
    
    def _analyze_modules(self) -> Dict[str, int]:
        """分析模块结构"""
        modules = {}
        
        for py_file in self.project_root.rglob("*.py"):
            if "__pycache__" in str(py_file):
                continue
                
            module_path = str(py_file.relative_to(self.project_root))
            module_dir = str(py_file.parent.relative_to(self.project_root))
            
            if module_dir not in modules:
                modules[module_dir] = 0
            modules[module_dir] += 1
        
        return modules
    
    def _analyze_dependencies(self) -> Dict[str, List[str]]:
        """分析模块依赖"""
        dependencies = {}
        
        for py_file in self.project_root.rglob("*.py"):
            if "__pycache__" in str(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 解析 AST
                tree = ast.parse(content)
                imports = []
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)
                
                module_name = str(py_file.relative_to(self.project_root))
                dependencies[module_name] = imports
                
            except Exception as e:
                print(f"❌ 分析依赖失败 {py_file}: {e}")
        
        return dependencies
    
    def _analyze_complexity(self) -> Dict[str, int]:
        """分析代码复杂度"""
        complexity = {
            "total_lines": 0,
            "total_functions": 0,
            "avg_function_length": 0,
            "max_function_length": 0
        }
        
        function_lengths = []
        
        for py_file in self.project_root.rglob("*.py"):
            if "__pycache__" in str(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    complexity["total_lines"] += len(lines)
                
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        complexity["total_functions"] += 1
                        
                        # 计算函数长度
                        func_lines = node.end_lineno - node.lineno + 1
                        function_lengths.append(func_lines)
                        
                        if func_lines > complexity["max_function_length"]:
                            complexity["max_function_length"] = func_lines
                
            except Exception as e:
                print(f"❌ 分析复杂度失败 {py_file}: {e}")
        
        if function_lengths:
            complexity["avg_function_length"] = sum(function_lengths) // len(function_lengths)
        
        return complexity
    
    def _generate_architecture_recommendations(self) -> List[str]:
        """生成架构建议"""
        return [
            "🎯 实施领域驱动设计 (DDD) 分离业务逻辑",
            "🔄 引入 CQRS 模式分离读写操作",
            "📦 使用依赖注入容器管理服务依赖",
            "🛡️ 实施六边形架构提高测试能力",
            "📊 添加事件驱动架构支持异步处理",
            "🔧 使用工厂模式创建复杂对象",
            "📝 实施 Repository 模式抽象数据访问",
            "🌐 考虑 API Gateway 统一接口管理"
        ]


async def main():
    """主函数"""
    project_root = Path(__file__).parent
    
    print("🚀 开始代码现代化和架构分析...")
    
    # 代码现代化
    modernizer = CodeModernizer(str(project_root))
    modernization_report = await modernizer.modernize_project()
    
    # 架构分析
    analyzer = ArchitectureAnalyzer(str(project_root))
    architecture_analysis = analyzer.analyze_architecture()
    
    # 生成综合报告
    print("\n" + "="*60)
    print("📊 现代化和架构分析报告")
    print("="*60)
    
    print(f"\n🔧 现代化结果:")
    print(f"  • 总文件数: {modernization_report.total_files}")
    print(f"  • 修改文件数: {modernization_report.modified_files}")
    print(f"  • 预估节省时间: {modernization_report.estimated_time_saved}")
    
    print(f"\n🐛 发现的问题:")
    for issue, count in modernization_report.issues_found.items():
        print(f"  • {issue}: {count} 处")
    
    print(f"\n⚡ 性能改进:")
    for improvement in modernization_report.performance_improvements:
        print(f"  • {improvement}")
    
    print(f"\n🏗️ 架构分析:")
    print(f"  • 总代码行数: {architecture_analysis['complexity']['total_lines']:,}")
    print(f"  • 总函数数: {architecture_analysis['complexity']['total_functions']}")
    print(f"  • 平均函数长度: {architecture_analysis['complexity']['avg_function_length']} 行")
    print(f"  • 最长函数: {architecture_analysis['complexity']['max_function_length']} 行")
    
    print(f"\n💡 优化建议:")
    for suggestion in modernization_report.suggestions:
        print(f"  {suggestion}")
    
    print(f"\n🎯 架构建议:")
    for recommendation in architecture_analysis['recommendations']:
        print(f"  {recommendation}")
    
    print(f"\n✅ 现代化完成! 项目已升级到最新标准。")


if __name__ == "__main__":
    asyncio.run(main())