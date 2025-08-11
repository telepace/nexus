# 浏览器扩展 - Plasmo Framework

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式 (热重载)
pnpm dev

# 构建生产版本
pnpm build

# 打包扩展
pnpm package
```

## 🔧 浏览器加载

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 文件夹

## 🧪 测试

```bash
# E2E 测试
cd e2e && pnpm test

# 调试模式
cd e2e && pnpm test:debug

# 类型检查
pnpm typecheck
```

## 📁 项目结构

```
background.ts         # 后台脚本 (Service Worker)
sidepanel.tsx        # 侧边栏面板
options.tsx          # 设置页面

components/          # React 组件
├── ui/             # 基础 UI 组件
├── AuthSection.tsx # 认证组件
└── StreamingAnalysis.tsx # 流式分析

contents/           # 内容脚本
└── page-observer.ts # 页面观察器

lib/                # 工具函数
├── auth.ts         # 认证管理
├── api-client.ts   # API 客户端
└── types.ts        # TypeScript 类型

stores/             # 状态管理
└── useExtensionStore.ts
```

## 🎯 核心功能

- **内容分析**: 自动检测和分析网页内容
- **AI 助手**: 基于页面内容的智能问答
- **侧边栏**: 集成的分析和聊天界面
- **实时更新**: WebSocket 实时通信

## 🔧 多浏览器构建

```bash
# 构建所有目标
pnpm build

# 特定浏览器
pnpm build --target=chrome-mv3
pnpm build --target=firefox-mv2
```

## ⚙️ 核心配置

**环境变量**:
- `PLASMO_PUBLIC_API_URL` - API 地址
- `PLASMO_PUBLIC_WS_URL` - WebSocket 地址

**权限** (manifest.json):
- `activeTab` - 当前标签页访问
- `storage` - 本地存储
- `sidePanel` - 侧边栏面板