# Nexus 开发指南

## 📋 项目结构
```
nexus/
├── backend/          # FastAPI + Python
├── frontend/         # Next.js + TypeScript  
├── extension/        # Chrome 扩展
├── docker-compose.yml
└── scripts/          # 部署脚本
```

## 🚀 工作流程
<workflow>
1. **需求分析** - 理解问题和需求
2. **需求文档** - EARS 语法，保存到 `specs/specname/requirements.md`
3. **技术方案** - 基于现有架构设计，保存到 `specs/specname/design.md`
4. **任务拆分** - 具体任务列表，保存到 `specs/specname/tasks.md`
5. **代码实现** - 遵循项目规范
6. **质量检查** - 测试和代码检查
</workflow>

## ⚡ 快速命令

### 🐳 服务管理
```bash
docker compose exec db psql -U postgres -d app  # 连接数据库
```

### 🛠 开发

可以使用 makefile 命令，使用 `make help` 查看所有命令

### 🗄️ 数据库
```bash
# PostgreSQL 快捷命令
\dt                    # 查看表
\d table_name         # 表结构  
\q                    # 退出

# 常用操作
cd backend && uv run alembic revision --autogenerate -m "描述" # 创建迁移
```

### 🔧 工具
```bash
# GitHub
gh issue create --title "标题" --label "bug"
gh pr create --title "feat: 功能" --body "描述"

# Railway 部署
railway login && railway deploy

# 健康检查
curl http://localhost:8000/api/v1/utils/health-check/
```

## 🌐 服务地址

**本地开发**
- API: http://localhost:8000 (docs: /docs)
- 前端: http://localhost:3000
- 数据库: localhost:5432 (postgres/telepace)
- Redis: localhost:6379

## 🚨 故障排除

```bash
# 服务状态检查
docker-compose ps
curl http://localhost:8000/api/v1/utils/health-check/

# 重置环境
docker-compose down -v && docker-compose up --build

# 数据库连接测试  
cd backend && python test_db.py
```

## ⚙️ 环境变量

```env
# 必需配置
DATABASE_URL=postgresql://postgres:telepace@db/app
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-...

# 可选配置
SUPABASE_URL=https://your-project.supabase.co
SENTRY_DSN=https://...
```

## 📋 开发规范

- **提交**: `feat:` `fix:` `docs:` 等语义化前缀
- **分支**: 从 main 创建功能分支，PR 合并
- **测试**: 提交前运行 `pytest` 和 `pnpm test`
- **代码**: Python 用 Ruff，TS 用 ESLint