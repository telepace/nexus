# Backend 开发 - FastAPI + Python

## 🚀 快速开始

```bash
# 安装依赖
uv sync

# 启动开发服务器  
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# API 文档: http://localhost:8000/docs
```

## 🧪 测试和检查

```bash
uv run pytest                    # 运行测试
uv run pytest -v --tb=short     # 详细输出
uv run ruff check . --fix       # 代码检查和修复
uv run mypy app/                 # 类型检查
```

## 🗄️ 数据库

```bash
# 迁移
uv run alembic upgrade head                        # 应用迁移
uv run alembic revision --autogenerate -m "描述"   # 创建迁移
uv run alembic downgrade -1                        # 回滚

# 初始化数据
uv run python app/initial_data.py
uv run python scripts/init-default-data.py
```

## 📁 项目结构

```
app/
├── api/           # FastAPI 路由
├── core/          # 配置和依赖
├── crud/          # 数据库操作
├── models/        # SQLModel 数据模型  
├── schemas/       # Pydantic 模式
├── services/      # 业务逻辑
├── utils/         # 工具函数
└── tests/         # 测试文件
```

## 🔧 常用脚本

```bash
# 数据库测试
python test_db.py

# AI 配置检查
python check_ai_config.py

# 创建测试内容
python scripts/create-test-content.py
```

## ⚙️ 核心配置

**环境变量**:
- `DATABASE_URL` - 数据库连接
- `SECRET_KEY` - JWT 密钥
- `OPENAI_API_KEY` - AI 服务
- `REDIS_URL` - Redis 缓存

**重要文件**:
- `pyproject.toml` - 依赖配置
- `alembic.ini` - 数据库迁移配置
- `app/core/config.py` - 应用配置