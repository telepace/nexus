# 技术方案设计

## 技术架构概述

基于 Next.js App Router 的国际化路由优化方案，实现英文默认语言使用根路径，其他语言使用路径前缀。

## 当前架构分析

### 现有结构
- 使用 `[locale]` 动态路由处理国际化
- 中间件处理语言检测和重定向
- 支持 `en` 和 `zh` 两种语言
- 默认语言为 `en`

### 问题分析
1. 当前所有路径都需要语言前缀，包括英文
2. 根路径 `/` 被重定向到 `/en/`
3. URL 显示不够简洁

## 技术方案

### 1. 路由结构调整

```
app/
├── (auth)/              # 英文认证页面 (根路径)
├── (withSidebar)/       # 英文主要页面 (根路径)
├── (standalone)/        # 英文独立页面 (根路径)
├── [locale]/           # 其他语言页面
│   ├── (auth)/
│   ├── (withSidebar)/
│   └── (standalone)/
└── layout.tsx          # 根布局
```

### 2. 中间件重构策略

#### 语言检测逻辑
```typescript
function getLocaleFromPath(pathname: string): { locale: string; pathnameWithoutLocale: string } {
  const [, firstSegment, ...rest] = pathname.split('/');
  
  // 检查是否为非英文语言路径
  if (locales.includes(firstSegment) && firstSegment !== 'en') {
    return {
      locale: firstSegment,
      pathnameWithoutLocale: '/' + rest.join('/')
    };
  }
  
  // 默认为英文，处理根路径情况
  return {
    locale: 'en',
    pathnameWithoutLocale: pathname
  };
}
```

#### 重定向规则
1. **根路径访问**: `/` → 保持不变，识别为英文
2. **英文路径访问**: `/en/xxx` → 可选重定向到 `/xxx`
3. **其他语言**: `/zh/xxx` → 保持不变
4. **缺失语言前缀**: `/xxx` → 识别为英文路径

### 3. 布局组件调整

#### 根布局 (app/layout.tsx)
- 处理英文内容的默认布局
- 包含 I18nProvider 初始化为 'en'

#### 语言特定布局 (app/[locale]/layout.tsx)
- 处理非英文语言的布局
- 验证语言参数有效性

### 4. 组件适配

#### 语言切换器
```typescript
// 路径生成逻辑调整
const generateLocalePath = (locale: string, currentPath: string) => {
  if (locale === 'en') {
    // 英文返回根路径
    return currentPath.replace(/^\/[a-z]{2}\//, '/');
  } else {
    // 其他语言添加前缀
    return `/${locale}${currentPath.replace(/^\/[a-z]{2}\//, '/')}`;
  }
};
```

## 数据库设计

无需修改数据库结构，现有用户设置和内容结构保持不变。

## 接口设计

### API 路由
现有 API 路由无需修改，继续支持语言参数传递。

### 客户端请求
需要调整语言检测逻辑，确保正确识别当前语言环境。

## 测试策略

### 单元测试
1. 中间件语言检测逻辑测试
2. 路径生成函数测试
3. 布局组件渲染测试

### 集成测试
1. 路由跳转测试
2. 语言切换功能测试
3. 认证重定向测试

### E2E 测试
1. 用户访问根路径体验测试
2. 多语言切换流程测试
3. 书签和直接访问测试

## 安全性考虑

1. **路径验证**: 确保语言参数验证逻辑正确
2. **重定向安全**: 防止重定向循环
3. **认证保护**: 确保认证逻辑在新路由结构下正常工作

## 实施风险与缓解

### 风险分析
1. **SEO 影响**: URL 结构变化可能影响搜索引擎收录
2. **用户书签**: 现有用户书签失效
3. **向后兼容**: `/en/` 路径的处理

### 缓解措施
1. **301 重定向**: 为 `/en/` 路径提供重定向支持
2. **渐进迁移**: 保持 `/en/` 路径一段时间的兼容性
3. **用户通知**: 必要时通知用户 URL 变化

## 性能优化

1. **静态生成**: 根路径页面使用静态生成
2. **缓存策略**: 优化语言检测缓存
3. **懒加载**: 非英文语言组件懒加载