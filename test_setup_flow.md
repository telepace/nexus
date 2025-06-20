# Setup 流程优化测试指南

## 修改内容总结

我们对 `/setup` 流程进行了优化，主要变更如下：

### 1. 核心逻辑调整
- **Web 端用户**：登录后直接跳转到 `/content-library`，不强制进入 `/setup`
- **插件端用户**：登录后仍然跳转到 `/setup`，完成插件初始化

### 2. 修改的文件

#### 前端文件
1. `extension/components/LoginForm.tsx` - 修改登录 URL 使用 `from=extension`
2. `frontend/app/login/page.tsx` - 根据来源设置不同的默认 `callbackUrl`
3. `frontend/components/actions/google-auth-action.ts` - 支持传递来源参数

#### 后端文件
1. `backend/app/api/routes/login.py` - 支持 `from_source` 参数，根据来源设置用户状态
2. `backend/app/api/routes/google_oauth.py` - Google OAuth 登录时根据来源设置用户状态
3. `backend/app/crud/__init__.py` - 默认设置用户 `is_setup_complete = True`

### 3. 关键变更点

#### 用户状态设置逻辑
- **Web 端登录**：`is_setup_complete = True`（自动完成 setup）
- **插件端登录**：`is_setup_complete = False`（需要完成 setup 流程）

#### URL 参数识别
- 插件端使用 `?from=extension` 标识
- 前端根据此参数设置不同的 `callbackUrl`

## 测试场景

### 场景 1: Web 端首次注册/登录
1. 访问 `http://localhost:3000/login`
2. 使用邮箱密码或 Google 登录
3. **预期结果**: 直接跳转到 `/content-library`，不经过 `/setup`

### 场景 2: 插件端首次登录
1. 打开浏览器插件
2. 点击"在网页中登录"按钮
3. 在打开的页面中登录（URL 应包含 `?from=extension`）
4. **预期结果**: 跳转到 `/setup` 页面，完成插件设置

### 场景 3: 已完成 setup 的用户
1. 插件用户完成 setup 后，`is_setup_complete = True`
2. 再次访问任何页面
3. **预期结果**: 不会被重定向到 `/setup`

### 场景 4: middleware 行为验证
1. Web 用户访问受保护页面（如 `/content-library`）
2. **预期结果**: 正常访问，不被重定向到 `/setup`
3. 插件用户（setup 未完成）访问受保护页面
4. **预期结果**: 被重定向到 `/setup`

## 验证检查点

### 前端检查
- [ ] 登录页面根据 `from=extension` 参数设置正确的 `callbackUrl`
- [ ] Google 登录按钮传递正确的来源参数
- [ ] 插件登录 URL 包含 `from=extension` 参数

### 后端检查
- [ ] 登录接口正确处理 `from_source` 参数
- [ ] Web 用户登录后 `is_setup_complete = True`
- [ ] 插件用户登录后 `is_setup_complete = False`
- [ ] Google OAuth 流程正确设置用户状态

### 数据库检查
```sql
-- 检查用户的 setup 状态
SELECT email, is_setup_complete, google_id, created_at 
FROM users 
ORDER BY created_at DESC;
```

## 可能的问题和解决方案

### 问题 1: 现有用户状态
- **问题**: 现有用户可能 `is_setup_complete = False`
- **解决**: 可以运行数据库迁移脚本，将现有 Web 用户设置为已完成

### 问题 2: 缓存问题
- **问题**: 前端可能缓存了用户状态
- **解决**: 清除浏览器缓存或重新登录

### 问题 3: Session 问题
- **问题**: Google OAuth session 可能不正确保存来源信息
- **解决**: 检查 session 配置和 Redis/内存存储

## 数据库迁移脚本（可选）

如果需要将现有用户设置为已完成 setup：

```sql
-- 将所有现有用户（非插件用户）设置为已完成 setup
UPDATE users 
SET is_setup_complete = true 
WHERE is_setup_complete = false 
  AND created_at < '2024-01-XX';  -- 替换为实际的迁移日期
``` 