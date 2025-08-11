# 脚本工具集

## 🚀 部署脚本

```bash
# Railway 部署
./scripts/deploy-railway.sh           # 多服务部署
./scripts/railway-complete-setup.sh  # 完整环境配置
./scripts/emergency-railway-fix.sh   # 紧急修复

# Docker 构建
./scripts/build-push.sh              # 构建并推送镜像
```

## 🗄️ 数据库工具

```bash
# 数据库测试和管理
python scripts/db-test-utils.py      # 连接和性能测试
python scripts/conflict_detector.py  # 冲突检测
python scripts/init-default-data.py  # 初始化数据
```

## 🧪 测试工具

```bash
# 测试脚本
./scripts/test-local.sh              # 本地测试环境
./scripts/check-railway-setup.sh    # Railway 配置检查

# 项目验证
node scripts/check-structure.js     # 项目结构检查
python scripts/validate_project.py  # 项目验证
```

## 🔧 构建工具

```bash
# 客户端生成
./scripts/generate-client.sh        # 前端 API 客户端
./scripts/generate-admin-client.sh  # 管理端客户端

# 服务管理
./scripts/start-services.sh         # 启动所有服务
python scripts/manage_models.py     # AI 模型管理
```

## 🔍 质量检查

```bash
# 安全和质量
./scripts/fix-security-vulnerabilities.sh  # 安全漏洞修复
./scripts/check-ui-violations.sh          # UI 规范检查
```

## ⚙️ 常用脚本示例

### 数据库测试
```python
# scripts/db-test-utils.py 主要用法
python scripts/db-test-utils.py test-connection
python scripts/db-test-utils.py test-tables
python scripts/db-test-utils.py performance-test
```

### 项目结构检查
```bash
# 检查项目完整性
node scripts/check-structure.js

# 输出验证报告
python scripts/validate_project.py > project-report.json
```

### AI 模型管理
```bash
# 列出所有模型
python scripts/manage_models.py list

# 测试模型可用性
python scripts/manage_models.py test gpt-4

# 添加新模型配置
python scripts/manage_models.py add model-config.json
```