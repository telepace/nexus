# Railway部署问题修复指南

## 🚨 问题诊断

你遇到的问题是典型的Railway配置错误：

### 问题现象
- ❌ Railway使用Nixpacks而不是Docker构建
- ❌ 连续的Out of Memory (OOM)错误
- ❌ Python依赖安装过程消耗大量内存
- ❌ 部署失败，服务无法启动

### 根本原因
1. **配置缺失**：`railway.toml`缺少正确的构建配置
2. **部署方式错误**：Railway没有识别到应该使用Docker
3. **资源不足**：Nixpacks构建Python项目消耗过多内存

## 🛠️ 解决方案

### 1. 项目结构调整

现在项目已经配置为独立服务部署模式：

```
nexus/
├── railway.toml              # 根配置（仅环境变量）
├── backend/railway.toml      # Backend服务配置
├── frontend/railway.toml     # Frontend服务配置
├── admin/railway.toml        # Admin服务配置
└── docker-compose.yml        # 本地开发用
```

### 2. Railway项目重新配置

#### 步骤1：删除现有部署
```bash
# 在Railway Dashboard中删除当前失败的服务
```

#### 步骤2：创建独立服务
在Railway Dashboard中创建以下服务：

1. **PostgreSQL数据库**
   - 点击 "Add Service" → "Database" → "PostgreSQL"

2. **Redis缓存**
   - 点击 "Add Service" → "Database" → "Redis"

3. **Backend服务**
   - 点击 "Add Service" → "GitHub Repo"
   - 选择你的仓库
   - 设置Root Directory为 `backend`
   - Railway会自动检测到 `backend/railway.toml`

4. **Frontend服务**
   - 重复上述步骤，Root Directory设为 `frontend`

5. **Admin服务**
   - 重复上述步骤，Root Directory设为 `admin`

#### 步骤3：配置环境变量

在Railway Dashboard中为每个服务设置必要的环境变量：

**全局变量（所有服务共享）：**
```bash
SECRET_KEY=your-secret-key-here
FIRST_SUPERUSER=admin@yourdomain.com
FIRST_SUPERUSER_PASSWORD=your-password
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

**Backend特定变量：**
```bash
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=https://your-frontend-domain.railway.app
```

### 3. 部署顺序

按以下顺序部署服务：

1. ✅ **PostgreSQL** (Railway托管)
2. ✅ **Redis** (Railway托管)  
3. ✅ **Backend** (依赖数据库)
4. ✅ **Frontend** (依赖Backend API)
5. ✅ **Admin** (依赖Backend API)

### 4. 验证部署

#### 检查Backend健康状态
```bash
curl https://your-backend-domain.railway.app/api/v1/utils/health-check/
```

#### 检查Frontend访问
```bash
curl https://your-frontend-domain.railway.app/
```

#### 检查服务间通信
确保Frontend能够访问Backend API。

## 🔧 故障排除

### 内存不足问题
如果仍然遇到OOM错误：

1. **增加内存限制**
   - 在Railway Dashboard中调整服务的内存限制
   - 推荐：Backend 1GB，Frontend 512MB

2. **优化Docker构建**
   - 使用多阶段构建减少镜像大小
   - 清理不必要的依赖和缓存

### 环境变量问题
确保所有必要的环境变量都已设置：

```bash
# 检查Backend环境变量
railway variables --service backend

# 检查Frontend环境变量  
railway variables --service frontend
```

### 数据库连接问题
确保Backend能够连接到Railway PostgreSQL：

```bash
# 查看Backend日志
railway logs --service backend

# 检查数据库连接
railway connect postgresql
```

## 📝 最佳实践

### 1. 服务依赖管理
- 使用Railway的服务引用语法：`${{ serviceName.VARIABLE }}`
- 确保服务按正确顺序启动

### 2. 环境变量管理
- 敏感信息使用Railway的环境变量功能
- 避免在代码中硬编码配置

### 3. 监控和日志
- 定期检查服务日志
- 设置健康检查端点
- 使用Sentry进行错误追踪

## 🚀 部署命令

使用Railway CLI进行部署：

```bash
# 登录Railway
railway login

# 链接到项目
railway link

# 部署Backend
railway up --service backend

# 部署Frontend
railway up --service frontend

# 部署Admin
railway up --service admin

# 查看所有服务状态
railway status
```

## ⚠️ 注意事项

1. **不要使用docker-compose.yml**
   - Railway不支持直接部署docker-compose文件
   - 每个服务需要独立部署

2. **服务间通信**
   - 使用Railway的内部域名进行服务间通信
   - 公共域名用于外部访问

3. **数据持久化**
   - 使用Railway托管的PostgreSQL和Redis
   - 避免在容器中存储持久化数据

4. **成本控制**
   - 监控资源使用情况
   - 根据需要调整服务规模

完成这些配置后，你的Nexus项目应该能够在Railway上正常部署和运行。 