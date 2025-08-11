# Frontend 开发 - Next.js + TypeScript

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 开发服务器
pnpm dev           # http://localhost:3000

# 构建
pnpm build && pnpm start
```

## 🧪 测试和检查

```bash
pnpm test              # 单元测试
pnpm test:e2e          # E2E 测试 (Playwright)
pnpm typecheck         # TypeScript 检查
pnpm lint --fix        # ESLint 检查和修复
```

## 📁 项目结构

```
app/                   # Next.js App Router
├── (auth)/           # 认证页面组  
├── (withSidebar)/    # 带侧边栏页面
├── api/              # API 路由
└── globals.css       # 全局样式

components/
├── ui/               # shadcn/ui 基础组件
├── ai/               # AI 相关组件
├── layout/           # 布局组件
└── actions/          # Server Actions

lib/                  # 工具和配置
hooks/                # 自定义 React Hooks
```

## 🔧 常用命令

```bash
# 生成 API 客户端
pnpm generate-client

# 分析包大小
pnpm analyze

# Storybook (如果配置)
pnpm storybook
```

## 🎨 技术栈

- **框架**: Next.js 14 App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **状态**: React Context + Zustand
- **测试**: Jest + Playwright

## ⚙️ 核心配置

**环境变量**:
- `NEXT_PUBLIC_API_URL` - 后端 API 地址
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 配置
- `NEXTAUTH_SECRET` - 认证密钥

**重要文件**:
- `next.config.mjs` - Next.js 配置
- `tailwind.config.js` - Tailwind 配置
- `components.json` - shadcn/ui 配置