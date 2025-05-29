# Nexus Browser Extension

AI-powered reading assistant that helps you understand, save, and interact with web content.

## 项目状态

✅ **重构完成** - 已按照 MVP 设计完成基础架构重构
⚠️ **编译问题** - 当前存在 Node.js 版本兼容性问题

## 架构概览

### 核心文件结构
```
extension/
├── sidepanel.tsx             # 主 UI 入口 (Side Panel)
├── background.ts             # 后台服务
├── contents/
│   └── extractor.ts         # 网页内容提取
├── options.tsx              # 设置页面
├── lib/
│   ├── auth.ts              # 认证管理
│   ├── api.ts               # API 调用
│   ├── types.ts             # TypeScript 类型
│   └── utils.ts             # 工具函数
├── stores/
│   └── useExtensionStore.ts # Zustand 状态管理
├── components/
│   ├── ui/
│   │   └── Button.tsx       # 基础 UI 组件
│   ├── AuthSection.tsx      # 认证状态组件
│   ├── PageInfo.tsx         # 页面信息组件
│   └── PromptSection.tsx    # AI 功能组件
└── style.css                # 全局样式
```

### 技术栈
- **框架**: Plasmo (Browser Extension Framework)
- **UI**: React + TypeScript + Tailwind CSS
- **状态管理**: Zustand
- **图标**: Lucide React
- **样式**: Tailwind CSS + CSS Modules

### 核心功能
1. **认证管理** - 与 Web 端登录状态同步
2. **内容提取** - 智能提取网页主要内容
3. **AI 处理** - 智能摘要、关键要点提取
4. **知识库** - 保存内容到个人知识库
5. **设置管理** - API 配置和用户设置

## 环境要求

### Node.js 版本问题
当前项目需要 Node.js 版本 >= 20.3.0，但系统当前版本为 20.0.0。

**解决方案**:
```bash
# 使用 nvm 升级 Node.js
nvm install 20.3.0
nvm use 20.3.0

# 或者使用 n
n 20.3.0
```

### 依赖安装
```bash
pnpm install
```

## 开发命令

### 本地开发
```bash
# 本地环境 (localhost:8000 API)
pnpm dev:local

# 开发环境
pnpm dev:staging

# 生产环境
pnpm dev
```

### 构建打包
```bash
# 本地环境构建
pnpm build:local

# 开发环境构建
pnpm build:staging

# 生产环境构建
pnpm build:prod
```

### 打包发布
```bash
# 本地环境打包
pnpm package

# 开发环境打包
pnpm package:staging

# 生产环境打包
pnpm package:prod
```

## 环境配置

项目支持多环境配置，通过环境变量控制：

- `PLASMO_PUBLIC_API_URL` - API 服务器地址
- `PLASMO_PUBLIC_FRONTEND_URL` - 前端应用地址

### 环境对应关系
| 环境 | API 地址 | 前端地址 |
|------|----------|----------|
| 本地 | http://localhost:8000 | http://localhost:3000 |
| 开发 | https://api-staging.nexus-app.com | https://staging.nexus-app.com |
| 生产 | https://api.nexus-app.com | https://app.nexus-app.com |

## 登录机制

### 与 Web 端统一登录
1. **Cookie 共享** - 优先使用浏览器 Cookie 进行认证
2. **状态同步** - 插件可同步 Web 端登录状态
3. **自动跳转** - 未登录时自动跳转到 Web 端登录页面

### 认证流程
1. 用户在 Web 端登录
2. 插件检测到 Cookie 中的认证信息
3. 调用 `/users/me` 接口验证身份
4. 保存用户信息到本地存储

## 权限说明

### Manifest 权限
- `storage` - 本地数据存储
- `scripting` - 内容脚本注入
- `activeTab` - 当前标签页访问
- `<all_urls>` - 跨域 API 请求

### 内容安全策略
```json
{
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:8000 https://* http://*;"
}
```

## 下一步计划

### 短期目标 (1-2 周)
1. ✅ 解决 Node.js 版本兼容性问题
2. ✅ 完成基础编译和打包
3. ✅ 测试基础功能流程
4. ✅ 完善错误处理

### 中期目标 (2-4 周)
1. 🔄 添加 Side Panel 支持
2. 🔄 优化 UI/UX 体验
3. 🔄 添加更多 AI Prompt 类型
4. 🔄 实现流式响应处理

### 长期目标 (1-2 月)
1. 📋 添加快捷键支持
2. 📋 实现离线功能
3. 📋 添加数据同步
4. 📋 性能优化

## 故障排除

### 常见问题

1. **编译失败 - Sharp 模块错误**
   ```bash
   # 重新安装依赖
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. **认证失败**
   - 确保已在 Web 端登录
   - 检查 API 地址配置
   - 清除浏览器缓存

3. **内容提取失败**
   - 检查页面是否支持内容提取
   - 确认 Content Script 权限

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

MIT License
