# Nexus Extension - Side Panel 设置指南

## 🎯 功能概述

Nexus 浏览器扩展现在使用 **Side Panel** 界面，提供更好的用户体验：

- ✅ 与 web 端共享登录状态 (localhost:3000)
- ✅ 支持多种登录方式
- ✅ AI 智能摘要和页面保存功能
- ✅ 自动状态同步

## 📁 运行目录

**重要提醒**：所有扩展相关的命令都必须在 `extension/` 目录下运行！

```bash
# 进入扩展目录
cd extension

# 然后运行任何扩展相关命令
pnpm run dev:local
pnpm run build:local
```

## 🚀 安装步骤

### 1. 构建扩展
```bash
# 确保在 extension/ 目录下
cd extension

# 本地开发版本
pnpm run build:local  

# 生产版本
pnpm run build:prod   
```

### 2. 加载到 Chrome
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 "开发者模式"
4. 点击 "加载已解压的扩展程序"
5. 选择 `extension/build/chrome-mv3-prod` 目录

### 3. 激活 Side Panel
1. 安装后点击工具栏中的 Nexus 图标
2. 或者右键点击图标选择 "在侧边栏中打开"
3. 扩展会在浏览器右侧打开 Side Panel

## 🔐 登录方式

### 方式 1: 从网页同步 (推荐)
1. 先在 `http://localhost:3000` 登录 web 端
2. 在 Side Panel 中点击 "从网页同步登录状态"
3. 自动获取登录状态

### 方式 2: 直接登录
1. 在 Side Panel 中输入邮箱和密码
2. 点击登录按钮

### 方式 3: 跳转网页登录
1. 点击 "在网页中登录" 按钮
2. 跳转到 web 端登录页面
3. 登录后回到扩展自动同步

## 📱 主要功能

### 登录后功能
- **打开仪表板**: 跳转到 web 端主页
- **内容库**: 访问已保存的内容
- **保存页面**: 一键保存当前页面到内容库
- **AI 总结**: 智能生成当前页面摘要

### 智能功能
- 自动提取页面核心内容
- AI 摘要生成并在模态框中显示
- 页面保存状态通知
- 登录状态自动同步

## 🔧 开发模式

### 启动开发服务器
```bash
# 确保在 extension/ 目录下
cd extension
pnpm run dev:local
```

### 热重载
开发模式支持热重载，修改代码后：
1. 保存文件
2. 在 `chrome://extensions/` 中点击刷新按钮
3. 或者重新加载扩展

## 🌐 端口配置

- **Backend API**: `http://localhost:8000`
- **Frontend Web**: `http://localhost:3000`
- **扩展会自动连接这些服务**

## 🛠️ 故障排除

### 常见问题

1. **`ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` 错误**
   - ✅ 确保在 `extension/` 目录下运行命令
   - ❌ 不要在主项目目录下运行扩展命令

2. **Side Panel 不显示**
   - 确认已安装扩展
   - 检查是否在 `chrome://extensions/` 中启用
   - 尝试刷新扩展

3. **登录同步失败**
   - 确认 web 端已登录 (`localhost:3000`)
   - 检查 cookies 权限
   - 查看控制台错误信息

4. **API 调用失败**
   - 确认后端服务正在运行 (`localhost:8000`)
   - 检查网络连接
   - 查看 CSP 配置

### 调试方法

1. **查看扩展日志**
   - 在 `chrome://extensions/` 中找到 Nexus 扩展
   - 点击 "检查视图" -> "sidepanel.html"
   - 查看控制台输出

2. **检查权限**
   ```javascript
   // 在扩展控制台中
   chrome.permissions.getAll(console.log)
   ```

3. **验证存储**
   ```javascript
   // 检查扩展存储
   chrome.storage.local.get(null, console.log)
   ```

## 📋 文件结构

```
extension/
├── sidepanel.tsx            # Side Panel 入口
├── components/
│   ├── SidePanelApp.tsx     # 主应用组件 (重命名)
│   ├── LoginForm.tsx        # 登录表单
│   └── DashboardView.tsx    # 功能面板
├── lib/
│   ├── auth.ts              # 认证逻辑
│   ├── useAuth.ts           # React Hook
│   └── api.ts               # API 调用
├── contents/
│   └── page-handler.ts      # 内容脚本
└── build/
    └── chrome-mv3-prod/     # 构建输出
```

## ⚙️ 构建系统

项目使用 **Plasmo 框架**，它提供了：
- ✅ 自动化的 Chrome MV3 manifest 生成
- ✅ TypeScript 和 React 支持
- ✅ 热重载开发环境
- ✅ 优化的生产构建

~~不再需要自定义的 `build-with-assets.js` 脚本~~

## 🔄 与 Web 端同步

扩展会自动监听 web 端的登录状态变化：
- 在 web 端登录 → 扩展自动同步
- 在 web 端登出 → 扩展自动清除状态
- 使用相同的 API 和认证机制

这样用户在任何一端的操作都会在另一端生效，提供无缝的跨平台体验！ 