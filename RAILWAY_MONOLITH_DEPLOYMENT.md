# 🐳 Railway Monolith Deployment Guide

## 🎯 新的部署策略

你说得对！使用 Docker 单体部署确实比多服务部署更简单。我已经为你创建了一个**单容器解决方案**，包含所有服务。

## ✅ 解决方案优势

### 🔥 **为什么这个方案更好：**
- ✅ **单个 Railway 服务** - 避免多服务复杂性
- ✅ **一次性部署** - 所有组件在一个容器中
- ✅ **成本更低** - 只需一个 Railway 服务
- ✅ **简化管理** - 统一的日志和监控
- ✅ **避免服务间通信问题** - 所有服务在同一容器内

## 🏗️ 架构说明

### 单容器内运行的服务：
```
┌─────────────────────────────────────┐
│           Railway 容器               │
├─────────────────────────────────────┤
│  🌐 Nginx (Port 80) - 反向代理      │
│  ├── / → Frontend (Next.js)         │
│  ├── /api → Backend (FastAPI)       │
│  └── /admin → Admin 静态文件         │
├─────────────────────────────────────┤
│  🐍 Backend (Port 8000) - FastAPI   │
│  ⚛️  Frontend (Port 3000) - Next.js │
│  📊 Admin - 静态文件                 │
├─────────────────────────────────────┤
│  👨‍💼 Supervisord - 进程管理          │
└─────────────────────────────────────┘
```

## 🚀 立即部署

### 1. 运行部署脚本
```bash
# 登录 Railway (如果还没登录)
railway login

# 运行单体部署脚本
./scripts/deploy-monolith-railway.sh
```

### 2. 手动部署步骤
如果脚本不工作，手动执行：

```bash
# 创建数据库服务
railway add --database postgresql
railway add --database redis

# 创建应用服务
railway service create nexus-app

# 部署
railway up --service nexus-app
```

## 📁 关键文件

| 文件 | 作用 |
|------|------|
| `Dockerfile.railway` | 多阶段构建，包含所有服务 |
| `railway.toml` | Railway 配置 |
| `docker-compose.railway.yml` | 备用方案（如果需要） |

## 🔧 部署后配置

### 必需的环境变量
在 Railway 仪表板中设置：

```bash
# 应用机密
SECRET_KEY=your-secret-key
FIRST_SUPERUSER=admin@example.com  
FIRST_SUPERUSER_PASSWORD=your-password

# API 密钥
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key

# 可选
SENTRY_DSN=your-sentry-dsn
```

### 数据库连接
Railway 会自动提供数据库连接变量：
- `POSTGRES_*` - PostgreSQL 连接信息
- `REDIS_*` - Redis 连接信息

## 🎯 访问你的应用

部署成功后：
- **主应用**: `https://your-railway-domain.railway.app/`
- **API 文档**: `https://your-railway-domain.railway.app/api/docs`
- **管理面板**: `https://your-railway-domain.railway.app/admin`

## 📊 监控和调试

### 查看日志
```bash
# 查看所有服务日志
railway logs --service nexus-app

# 实时跟踪日志
railway logs --service nexus-app --follow
```

### 服务状态
所有服务由 supervisord 管理：
- Backend (FastAPI)
- Frontend (Next.js)  
- Nginx (反向代理)

## 🔄 更新部署

当你需要更新代码时：
```bash
# 简单重新部署
railway up --service nexus-app
```

## 🆚 对比

| 多服务部署 | 单体部署 |
|------------|----------|
| 4+ 个 Railway 服务 | 1 个 Railway 服务 |
| 复杂的服务间通信 | 内部通信 |
| 更高成本 | 更低成本 |
| 分离关注点 | 简化管理 |
| 更难调试 | 统一日志 |

## 🚨 立即行动

**删除之前失败的服务，然后运行：**

```bash
./scripts/deploy-monolith-railway.sh
```

这个解决方案将彻底解决你的 "Nixpacks build failed" 问题！ 🎉