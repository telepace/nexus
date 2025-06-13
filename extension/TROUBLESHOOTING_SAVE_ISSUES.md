# 插件保存功能问题排查指南

## 🚨 常见问题

### 1. "Failed to notify background: The message port closed before a response was received"

**问题描述**：页面刷新或导航时出现消息端口关闭错误

**解决方案**：
- 这是正常现象，页面导航时content script会被销毁
- 已在代码中添加错误处理，该错误不会影响功能
- 如果持续出现，请重新加载插件

### 2. "❌ 保存失败：未登录" 但界面显示已登录

**可能原因**：
1. Token已过期但本地缓存未更新
2. API端点错误
3. 网络连接问题
4. 服务器认证配置问题

**排查步骤**：

#### Step 1: 检查认证状态
1. 点击插件底部的 "🔍 调试认证状态" 按钮
2. 查看浏览器控制台的调试信息
3. 根据调试结果进行下一步操作

#### Step 2: 检查控制台日志
打开浏览器开发者工具，查看以下关键日志：

```
[DashboardView] Debug: Checking auth status
[DashboardView] Debug: Storage data: {accessToken: "...", user: {...}}
[DashboardView] Debug: API test response: 200 OK
```

#### Step 3: 重新登录
如果调试显示token无效：
1. 点击 "退出登录"
2. 重新登录插件
3. 重试保存功能

#### Step 4: 检查API配置
确认环境变量配置正确：
- `PLASMO_PUBLIC_API_URL` 应指向正确的后端服务器
- 后端服务器应该正在运行

## 🔧 手动修复步骤

### 清除插件数据
1. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
2. 找到 Nexus 插件
3. 点击 "详细信息"
4. 向下滚动，点击 "清除存储空间"
5. 重新登录

### 重新加载插件
1. 在扩展管理页面关闭插件
2. 重新启用插件
3. 重新登录并测试保存功能

## 📋 调试信息收集

如果问题仍然存在，请收集以下信息：

### 浏览器控制台日志
```
// 查找以下前缀的日志
[DashboardView]
[Background]
[API]
[PageObserver]
```

### 网络请求日志
在开发者工具的 Network 面板中查看：
- `/api/v1/users/me` 请求的状态码
- `/api/v1/content/create` 请求的状态码和响应

### 存储状态
在控制台运行：
```javascript
chrome.storage.local.get(['accessToken', 'user'], console.log)
```

## 🚀 已修复的问题

### v0.1.1 修复内容：
1. ✅ 修复了 API 端点错误 (`/api/v1/auth/me` → `/api/v1/users/me`)
2. ✅ 改进了错误处理和调试信息
3. ✅ 添加了消息端口关闭错误的处理
4. ✅ 增强了认证状态检查的可靠性
5. ✅ 添加了调试工具和详细日志

### 数据流程验证：
1. **用户登录** → Token存储到 `chrome.storage.local`
2. **点击保存** → Content script提取页面内容
3. **发送消息** → Background script接收保存请求
4. **认证检查** → 验证token有效性
5. **API调用** → 调用 `/api/v1/content/create` 保存内容
6. **结果反馈** → 显示成功或错误消息

## 📞 获取帮助

如果问题仍未解决，请提供：
1. 完整的控制台日志
2. 调试认证状态的结果
3. 网络请求的详细信息
4. 操作系统和浏览器版本 