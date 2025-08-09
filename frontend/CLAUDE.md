# Frontend 开发指南 - Next.js + TypeScript

## 📋 前端架构概览

这是一个基于 Next.js 14 App Router 的现代 React 应用，使用 TypeScript、Tailwind CSS 和各种现代前端技术栈。

## 🏗️ 项目结构

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   ├── (withSidebar)/     # 带侧边栏的页面布局
│   ├── api/               # API 路由
│   ├── globals.css        # 全局样式
│   └── layout.tsx         # 根布局
├── components/            # 可复用组件
│   ├── ui/               # 基础 UI 组件 (shadcn/ui)
│   ├── layout/           # 布局组件
│   ├── ai/               # AI 相关组件
│   └── actions/          # Server Actions
├── hooks/                # 自定义 React Hooks
├── lib/                  # 工具函数和配置
├── styles/               # 样式文件
└── __tests__/            # 测试文件
```

## 🚀 快速开始

### 本地开发
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问应用
# http://localhost:3000
```

### 构建和部署
```bash
# 构建生产版本
pnpm build

# 本地预览生产构建
pnpm start

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
pnpm lint:fix
```

## 🧪 测试

### 测试命令
```bash
# 运行所有测试
pnpm test

# 监视模式测试
pnpm test:watch

# 测试覆盖率
pnpm test:coverage

# E2E 测试
pnpm test:e2e

# Playwright UI 模式
pnpm test:e2e:ui
```

### 测试结构
- **单元测试**: 组件和函数的独立测试
- **集成测试**: 组件间交互测试
- **E2E 测试**: 完整用户流程测试 (Playwright)

## 🎨 技术栈

### 核心技术
- **Next.js 14**: React 框架，使用 App Router
- **TypeScript**: 静态类型检查
- **Tailwind CSS**: 实用优先的 CSS 框架
- **shadcn/ui**: 现代 UI 组件库

### 状态管理
- **React Context**: 全局状态管理
- **Zustand**: 轻量级状态管理 (如有需要)
- **Server State**: Next.js 服务器状态

### 开发工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Jest**: 单元测试框架
- **Playwright**: E2E 测试框架

## 🎯 开发最佳实践

### 组件开发
1. **函数组件**: 使用函数组件和 React Hooks
2. **TypeScript**: 为所有组件添加类型注解
3. **Props 接口**: 明确定义组件 props 类型
4. **错误边界**: 使用错误边界处理组件错误

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  children: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', onClick, children }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        variants[variant],
        sizes[size]
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

### 路由和导航
1. **App Router**: 使用 Next.js 14 App Router
2. **动态路由**: 使用文件系统路由
3. **路由组**: 使用括号组织相关路由
4. **中间件**: 实现认证和权限检查

### 样式管理
1. **Tailwind CSS**: 优先使用 Tailwind 类
2. **CSS 变量**: 使用 CSS 变量定义主题
3. **组件样式**: 使用 `cn()` 函数合并类名
4. **响应式设计**: 移动优先的响应式设计

### 状态管理
1. **本地状态**: 使用 `useState` 和 `useReducer`
2. **全局状态**: 使用 React Context 或 Zustand
3. **服务器状态**: 使用 SWR 或 TanStack Query
4. **表单状态**: 使用 react-hook-form

## 🔐 认证和安全

### 认证流程
```tsx
// 认证 Hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const login = async (email: string, password: string) => {
    // 登录逻辑
  }

  const logout = async () => {
    // 登出逻辑
  }

  return { user, login, logout, loading }
}

// 路由保护
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  if (!user) redirect('/login')
  
  return <>{children}</>
}
```

### 权限管理
- 基于角色的访问控制
- 路由级权限检查
- 组件级权限控制
- API 调用权限验证

## 🤖 AI 功能集成

### AI 组件
项目包含多个 AI 相关组件，用于内容分析、智能问答等功能。

```tsx
// AI 分析组件
export function AIAnalysisPanel({ contentId }: { contentId: string }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const analyzeContent = async () => {
    setIsLoading(true)
    try {
      const result = await api.analyzeContent(contentId)
      setAnalysis(result)
    } catch (error) {
      console.error('分析失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={analyzeContent} disabled={isLoading}>
        {isLoading ? '分析中...' : '开始分析'}
      </Button>
      {analysis && <AnalysisResult analysis={analysis} />}
    </div>
  )
}
```

### 实时更新
- 使用 Server-Sent Events (SSE) 实现实时更新
- WebSocket 连接用于实时通信
- 乐观更新提升用户体验

## 📱 响应式设计

### 设计系统
```css
/* 断点系统 */
sm: 640px   /* 小型设备 */
md: 768px   /* 中型设备 */
lg: 1024px  /* 大型设备 */
xl: 1280px  /* 超大设备 */
2xl: 1536px /* 2K 设备 */
```

### 移动优先
1. **布局**: 从移动设备开始设计，逐步增强
2. **导航**: 使用汉堡菜单和底部导航
3. **交互**: 考虑触摸交互和手势
4. **性能**: 优化移动设备性能

## 🔧 API 集成

### API 客户端
```typescript
// API 客户端配置
const api = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    return response.json()
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    // POST 请求逻辑
  }
}
```

### 错误处理
1. **全局错误处理**: 统一处理 API 错误
2. **错误边界**: 组件级错误捕获
3. **重试机制**: 网络错误自动重试
4. **用户反馈**: 清晰的错误提示

## 🎨 UI/UX 组件

### 基础组件 (shadcn/ui)
- Button, Input, Select, Dialog 等
- 完全可定制的样式
- 支持深色模式
- 无障碍访问支持

### 自定义组件
```tsx
// 内容渲染器
export function ContentRenderer({ content, type }: ContentRendererProps) {
  switch (type) {
    case 'markdown':
      return <MarkdownRenderer content={content} />
    case 'json':
      return <JsonRenderer content={content} />
    default:
      return <div>{content}</div>
  }
}

// 虚拟化列表
export function VirtualizedList<T>({ items, renderItem }: VirtualizedListProps<T>) {
  return (
    <div className="virtual-list">
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  )
}
```

## 🌐 国际化 (i18n)

### 多语言支持
```typescript
// i18n 配置
export const i18n = {
  locales: ['en', 'zh', 'zh-CN', 'zh-TW'],
  defaultLocale: 'en'
}

// 使用翻译
function HomePage() {
  const t = useTranslations('HomePage')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  )
}
```

### 区域设置
- 自动语言检测
- 用户偏好记忆
- 动态语言切换
- RTL 语言支持

## ⚡ 性能优化

### 代码分割
```tsx
// 动态导入
const LazyComponent = dynamic(() => import('./LazyComponent'), {
  loading: () => <LoadingSpinner />
})

// 路由级代码分割
const DashboardPage = lazy(() => import('./pages/Dashboard'))
```

### 图片优化
```tsx
// Next.js Image 组件
import Image from 'next/image'

function OptimizedImage({ src, alt }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      placeholder="blur"
      loading="lazy"
    />
  )
}
```

### 缓存策略
1. **浏览器缓存**: 利用 HTTP 缓存头
2. **应用缓存**: 使用 SWR 或 TanStack Query
3. **静态生成**: ISG 和 SSG 优化
4. **CDN 缓存**: 静态资源 CDN 分发

## 🚨 常见问题

### 构建问题
1. **TypeScript 错误**: 检查类型定义和配置
2. **依赖冲突**: 使用 `pnpm ls` 检查依赖树
3. **内存不足**: 增加 Node.js 内存限制

### 运行时问题
1. **Hydration 错误**: 确保服务端和客户端渲染一致
2. **API 连接问题**: 检查环境变量和网络配置
3. **路由问题**: 确保 App Router 配置正确

## 📚 学习资源

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### UI 组件库
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Headless UI](https://headlessui.com/)

## ⚙️ 环境变量

### 必需环境变量
```env
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# 第三方服务
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 分析
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 可选环境变量
```env
# 开发设置
NEXT_PUBLIC_DEBUG=true
ANALYZE=true

# 监控
SENTRY_DSN=your-sentry-dsn

# 功能开关
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES=false
```

---

## 📝 开发提醒

1. **组件可复用性**: 设计可复用的组件接口
2. **性能考虑**: 避免不必要的重新渲染
3. **无障碍访问**: 遵循 WCAG 2.1 标准
4. **移动优先**: 始终考虑移动用户体验
5. **类型安全**: 充分利用 TypeScript 的类型系统