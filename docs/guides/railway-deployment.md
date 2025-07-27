# Railway 部署指南

本指南将帮助您在 Railway 平台上部署 Nexus 全栈应用程序。

## 📋 部署概览

Nexus 是一个多服务架构的应用，包含以下组件：

- **Backend**: FastAPI Python 应用 (端口 8000)
- **Frontend**: Next.js 应用 (端口 3000) 
- **Admin**: Vite 管理面板 (端口 5173)
- **Website**: Next.js 文档站点 (端口 3000)
- **PostgreSQL**: 数据库服务
- **Redis**: 缓存服务

## 🚀 快速开始

### 1. 准备工作

确保您有以下账号和工具：

- [Railway](https://railway.app/) 账号
- [Railway CLI](https://docs.railway.app/quick-start) 已安装
- Git 仓库访问权限

### 2. 安装 Railway CLI

```bash
# macOS
brew install railway

# Linux/WSL
curl -fsSL https://railway.app/install.sh | sh

# Windows
iwr https://railway.app/install.ps1 | iex
```

### 3. 登录 Railway

```bash
railway login
```

## 📦 部署步骤

### 步骤 1: 创建 Railway 项目

```bash
# 在项目根目录
railway init
```

选择 "Create a new project" 并给项目命名（建议使用 "nexus"）。

### 步骤 2: 添加数据库服务

```bash
# 添加 PostgreSQL
railway add postgresql

# 添加 Redis
railway add redis
```

这将自动创建托管的数据库实例并设置连接环境变量。

### 步骤 3: 设置环境变量

使用提供的环境变量模板 `.env.example.railway` 作为参考：

```bash
# 必需的环境变量
railway variables set SECRET_KEY=your-super-secret-key-here
railway variables set FIRST_SUPERUSER=admin@yourdomain.com
railway variables set FIRST_SUPERUSER_PASSWORD=your-secure-password

# AI 配置
railway variables set OPENAI_API_KEY=sk-your-openai-key
railway variables set OR_API_KEY=sk-or-v1-your-openrouter-key
railway variables set LITELLM_MASTER_KEY=your-litellm-master-key

# 可选：监控和存储
railway variables set SENTRY_DSN=your-sentry-dsn
railway variables set SUPABASE_URL=your-supabase-url
railway variables set SUPABASE_ANON_KEY=your-supabase-key
```

### 步骤 4: 部署各个服务

#### 4.1 部署 Backend

```bash
# 切换到 backend 目录
cd backend

# 部署 backend 服务
railway deploy --service backend

# 或者如果是第一次部署
railway up --service backend
```

#### 4.2 部署 Frontend

```bash
# 切换到 frontend 目录  
cd ../frontend

# 设置 frontend 特定的环境变量
railway variables set NEXT_PUBLIC_API_URL=https://backend-production.up.railway.app

# 部署 frontend 服务
railway deploy --service frontend
```

#### 4.3 部署 Admin

```bash
# 切换到 admin 目录
cd ../admin

# 部署 admin 服务
railway deploy --service admin
```

#### 4.4 部署 Website

```bash
# 切换到 website 目录
cd ../website

# 部署 website 服务
railway deploy --service website
```

### 步骤 5: 配置域名和 CORS

部署完成后，Railway 会为每个服务分配域名。您需要更新 CORS 配置：

```bash
# 获取各服务的域名
railway service list

# 更新 CORS 配置
railway variables set BACKEND_CORS_ORIGINS='["https://frontend-domain.railway.app", "https://admin-domain.railway.app"]'
```

## 🔧 配置详解

### 服务配置文件

每个服务目录下都有 `railway.toml` 配置文件：

- `backend/railway.toml`: Backend 服务配置
- `frontend/railway.toml`: Frontend 服务配置  
- `admin/railway.toml`: Admin 服务配置
- `website/railway.toml`: Website 服务配置
- `railway.toml`: 项目级配置

### 环境变量自动解析

Railway 支持动态环境变量引用：

```toml
DATABASE_URL = "${{ PostgreSQL.DATABASE_URL }}"
REDIS_URL = "${{ Redis.REDIS_URL }}"
FRONTEND_URL = "https://${{ frontend.RAILWAY_PUBLIC_DOMAIN }}"
```

### 健康检查

每个服务都配置了健康检查：

- **Backend**: `/api/v1/utils/health-check/`
- **Frontend**: `/api/health`
- **Admin**: `/` (根路径)
- **Website**: `/` (根路径)

## 🔍 监控和调试

### 查看日志

```bash
# 查看特定服务日志
railway logs --service backend
railway logs --service frontend

# 实时跟踪日志
railway logs --service backend --follow
```

### 连接数据库

```bash
# 连接 PostgreSQL
railway connect postgresql

# 获取数据库连接信息
railway variables --service postgresql
```

### 重新部署

```bash
# 重新部署特定服务
railway deploy --service backend

# 重新部署所有服务
railway deploy
```

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败

**症状**: Backend 启动失败，日志显示数据库连接错误

**解决方案**:
- 确认已添加 PostgreSQL 服务
- 检查环境变量 `DATABASE_URL` 是否正确设置
- 验证数据库迁移是否成功执行

```bash
# 检查数据库变量
railway variables --service postgresql

# 手动运行迁移
railway run --service backend alembic upgrade head
```

#### 2. CORS 错误

**症状**: 前端无法访问后端 API

**解决方案**:
- 更新 `BACKEND_CORS_ORIGINS` 环境变量
- 确保包含所有前端域名

```bash
railway variables set BACKEND_CORS_ORIGINS='["https://your-frontend.railway.app", "https://your-admin.railway.app"]'
```

#### 3. 构建失败

**症状**: 部署过程中构建失败

**解决方案**:
- 检查 `railway.toml` 配置
- 确认依赖项是否正确安装
- 查看构建日志获取详细错误

```bash
# 查看构建日志
railway logs --service your-service

# 本地测试构建
cd service-directory
npm run build  # 或对应的构建命令
```

#### 4. 服务间通信失败

**症状**: 服务无法相互访问

**解决方案**:
- 检查环境变量中的服务 URL
- 确认网络配置正确
- 验证健康检查端点

#### 5. AI 功能不工作

**症状**: AI 分析功能失败

**解决方案**:
- 检查 AI API 密钥配置
- 验证 LiteLLM 配置
- 检查模型访问权限

```bash
# 检查 AI 相关变量
railway variables | grep -E "(OPENAI|OR_|LITELLM)"
```

### 调试命令

```bash
# 检查服务状态
railway status

# 查看环境变量
railway variables

# 重启服务
railway restart --service backend

# 获取服务详情
railway service --service backend
```

## 📈 性能优化

### 资源分配建议

- **Backend**: 1GB RAM, 1 vCPU
- **Frontend**: 512MB RAM, 0.5 vCPU
- **Admin**: 512MB RAM, 0.5 vCPU  
- **Website**: 512MB RAM, 0.5 vCPU
- **PostgreSQL**: 2GB RAM (按需调整)
- **Redis**: 256MB RAM

### 缓存优化

确保 Redis 正确配置：

```bash
# 验证 Redis 连接
railway connect redis

# 检查缓存配置
railway variables | grep REDIS
```

### 构建优化

- 使用 Docker 层缓存
- 优化依赖安装顺序
- 启用构建缓存

## 🔐 安全配置

### 必需的安全设置

1. **强密钥**: 使用强随机的 `SECRET_KEY`
2. **HTTPS**: Railway 自动提供 HTTPS
3. **CORS**: 严格配置允许的域名
4. **环境变量**: 不要在代码中硬编码敏感信息

### 生产环境检查清单

- [ ] 设置强 `SECRET_KEY`
- [ ] 配置管理员账号
- [ ] 设置 CORS 允许域名
- [ ] 配置错误监控 (Sentry)
- [ ] 设置备份策略
- [ ] 配置日志收集
- [ ] 验证所有健康检查
- [ ] 测试服务间通信

## 🔄 持续部署

### Git 集成

Railway 支持 Git 自动部署：

1. 连接 GitHub 仓库
2. 设置分支部署规则
3. 配置 PR 预览环境

### 环境管理

```bash
# 创建新环境
railway environment create staging

# 切换环境
railway environment use staging

# 为不同环境设置变量
railway variables set --environment staging DEBUG=true
```

## 📞 获取帮助

- [Railway 文档](https://docs.railway.app/)
- [Nexus 项目文档](../README.md)
- [问题报告](https://github.com/telepace/nexus/issues)

---

## 📝 部署检查清单

部署完成后，验证以下功能：

- [ ] Backend API 健康检查响应正常
- [ ] Frontend 页面可以正常加载
- [ ] Admin 面板可以访问
- [ ] Website 文档站点正常
- [ ] 数据库连接正常
- [ ] Redis 缓存工作
- [ ] AI 功能正常（如果已配置）
- [ ] 用户注册/登录功能
- [ ] 文件上传功能（如果使用 Supabase）
- [ ] 邮件发送功能（如果已配置）

恭喜！您已成功在 Railway 上部署了 Nexus 应用程序。🎉