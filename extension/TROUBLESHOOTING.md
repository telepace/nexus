# 🔧 Nexus Extension 故障排除指南

本文档帮助您解决浏览器扩展的常见问题。

## 🚨 常见错误及解决方案

### 1. "No registered remote function called handleHistoryStateUpdate"

**原因**: Plasmo远程函数未正确注册
**解决方案**:
```bash
# 1. 清理构建缓存
cd extension
pnpm run clean

# 2. 重新构建
pnpm run build:local

# 3. 重新加载扩展
```

### 2. "401 Unauthorized" API错误

**原因**: 认证token过期或无效
**解决方案**:
```javascript
// 在浏览器控制台执行以下代码清除认证缓存
chrome.storage.local.clear().then(() => {
  console.log('Storage cleared, please login again');
});
```

### 3. "Message port closed before a response was received"

**原因**: 扩展通信连接不稳定
**解决方案**:
1. 刷新当前页面
2. 重新加载扩展
3. 重启浏览器

### 4. Content Script 连接失败

**症状**: 侧边栏显示"页面内容脚本未加载"
**解决方案**:
```bash
# 1. 检查页面是否支持content script注入
# 2. 刷新页面
# 3. 检查扩展权限
```

## 🔄 重建扩展步骤

### 开发环境
```bash
# 1. 清理
pnpm run clean

# 2. 安装依赖
pnpm install

# 3. 本地开发构建
pnpm run dev:local

# 4. 在Chrome中加载extension/build/chrome-mv3目录
```

### 生产环境
```bash
# 1. 清理
pnpm run clean

# 2. 生产构建
pnpm run build:prod

# 3. 打包
pnpm run package:prod
```

## 🐛 调试工具

### 检查扩展状态
```javascript
// 在任何页面的控制台执行
chrome.runtime.sendMessage({type: 'PING'}, (response) => {
  console.log('Extension status:', response);
});
```

### 检查认证状态
```javascript
// 检查存储的认证信息
chrome.storage.local.get(['accessToken', 'user'], (result) => {
  console.log('Auth info:', result);
});
```

### 查看错误日志
```javascript
// 在background page控制台查看
chrome.runtime.sendMessage({type: 'GET_ERROR_STATS'}, (stats) => {
  console.log('Error statistics:', stats);
});
```

## 📋 检查清单

当遇到问题时，请按顺序检查：

- [ ] 扩展是否正确加载？
- [ ] 是否有控制台错误？
- [ ] 网络连接是否正常？
- [ ] 认证token是否有效？
- [ ] API服务器是否可访问？
- [ ] 页面是否支持content script？

## 🔧 环境配置

### 开发环境变量
```bash
# .env.local
PLASMO_PUBLIC_API_URL=http://localhost:8000
PLASMO_PUBLIC_FRONTEND_URL=http://localhost:3000
PLASMO_PUBLIC_DEBUG_MODE=true
```

### 生产环境变量
```bash
# .env.production
PLASMO_PUBLIC_API_URL=https://api.nexus-app.com
PLASMO_PUBLIC_FRONTEND_URL=https://app.nexus-app.com
PLASMO_PUBLIC_DEBUG_MODE=false
```

## 📞 获取帮助

如果以上方法都无法解决问题：

1. 查看浏览器开发者工具的Console标签
2. 查看Extensions页面的错误信息  
3. 收集相关错误日志
4. 在GitHub上创建issue

## 🔄 完全重置

如果需要完全重置扩展状态：

```javascript
// 清除所有扩展数据
chrome.storage.local.clear();
chrome.storage.sync.clear();

// 重新加载扩展
chrome.runtime.reload();
```

## ⚡ 性能优化

### 减少错误日志
```javascript
// 在生产环境中禁用详细日志
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
}
```

### 优化消息传递
- 减少不必要的消息发送
- 使用批量操作
- 实现适当的错误重试机制 