# WithSidebar Layout - Notion 风格设计

这个路由组包含了所有需要侧边栏导航的页面，采用了 Notion 风格的极简美学设计。

## 页面结构

### Home (`/home`) - 主页
- **设计理念**: Notion 风格的极简主页
- **功能**: 
  - 智能问候语（根据时间变化）
  - 大型输入区域，支持 Ask/Research/Build 三种模式
  - 学习轨迹展示
  - 洞察积累模块
  - GitHub 风格的贡献图
  - 右侧边栏包含推荐空间、待处理内容、热门话题、统计概览

### Content Library (`/content-library`) - 内容库
- 管理和浏览所有内容项目

### Dashboard (`/dashboard`) - 数据仪表板  
- 传统的数据统计和分析面板
- 项目指标和活动历史

### Favorites (`/favorites`) - 收藏夹
- 收藏的内容和项目

### Prompts (`/prompts`) - 提示管理
- AI 提示词的管理和组织

## 设计特点

### 美学风格
- **极简主义**: 干净的线条、充足的留白、微妙的阴影
- **Notion 风格**: 圆角、细腻的边框、优雅的颜色搭配
- **响应式设计**: 适配不同屏幕尺寸

### 导航设计
- **侧边栏**: 诗意的导航美学，动态指示器
- **顶部导航**: 极简的工具栏，半透明效果
- **Logo**: 点击返回 Home 页面

### 交互细节
- **悬停效果**: 微妙的状态变化
- **过渡动画**: 流畅的页面切换
- **视觉反馈**: 清晰的交互状态

## 技术实现

### 布局系统
- 使用 SidebarProvider 管理侧边栏状态
- 响应式的侧边栏折叠
- 移动端友好的导航体验

### 数据获取
- 使用现有的 dashboard API (metrics & activities)
- 保持数据获取逻辑不变
- 错误处理和加载状态

### 组件设计
- ContributionGraph: GitHub 风格的活动可视化
- 响应式网格布局
- 可重用的卡片组件

## 路由配置

根路径 (`/`) 自动重定向到 `/home`，确保用户始终能够访问到主页面。

导航顺序：
1. Home - 主页和工作中心
2. Content Library - 内容管理
3. Dashboard - 数据分析
4. Favorites - 个人收藏
5. Prompts - 工具管理

## 最新更新

### 新的 Home 页面设计
- **新增** `/home` - 全新的 Notion 风格主页，包含：
  - 时间相关的动态问候语
  - 大型输入区域，支持 Ask/Research/Build 模式
  - 学习轨迹展示
  - AI洞察积累
  - GitHub 风格的贡献图
  - 推荐空间、待处理内容、热门话题等右侧边栏
  
- **调整** `/dashboard` - 保留为传统数据仪表板
  - 专注于数据统计和指标展示
  - 保持原有的卡片式布局
  
### 导航更新
- **主页链接**：Logo 和导航都指向新的 `/home` 页面
- **页面顺序**：Home → Content Library → Dashboard → Favorites → Prompts

## 结构优化

### 问题解决
1. **侧边栏闪烁问题**：之前 `MainLayout` 中 `defaultOpen={false}` 导致首次渲染时侧边栏折叠，然后 `useEffect` 读取 cookie 再展开，造成闪烁
2. **页面遗漏侧边栏**：`/favorites` 页面没有使用 `MainLayout`，导致没有侧边栏

### 新架构优势
1. **统一管理**：所有需要侧边栏的页面都在 `(withSidebar)` route group 下，统一在 `layout.tsx` 中处理
2. **消除闪烁**：
   - 桌面端默认展开，移动端默认折叠
   - 客户端 hydration 后读取 cookie 状态
   - 避免 SSR/客户端状态不匹配
3. **一致体验**：所有主功能页面拥有一致的侧边栏和布局

## 包含的页面
- `/home` - Notion 风格主页（新）
- `/dashboard` - 数据仪表板  
- `/content-library` - 内容库  
- `/favorites` - 我的收藏
- `/settings` - 设置

## 设计理念

### Home 页面设计特点
1. **Notion 风格美学**：
   - 极简的顶部导航
   - 灰白色调主题
   - 细致的圆角和阴影
   - 优雅的图标和排版

2. **功能导向设计**：
   - 主要输入区域突出
   - 支持多种工作模式
   - 个性化内容展示
   - 直观的数据可视化

3. **响应式布局**：
   - 3列网格布局（主内容2列 + 边栏1列）
   - 移动端自适应
   - 合理的内容层次

## 使用方式
页面组件无需再手动包裹 `MainLayout`，直接编写页面内容即可：

```tsx
export default function MyPage() {
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

侧边栏、设置面板、添加内容模态窗口等都会自动提供。 