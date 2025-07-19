# AI分析卡片标题动态化技术方案设计

## 架构概述

本次实现主要涉及以下核心组件：
1. `AnalysisContentRenderer.tsx` - 分析内容渲染器
2. `UnifiedAIAnalysisCard.tsx` - 统一AI分析卡片
3. `ModernAnalysisInterface.tsx` - 现代分析界面
4. 使用AnalysisContentRenderer的父组件

## 技术栈

- **前端框架**: React 18 + TypeScript
- **样式系统**: Tailwind CSS + 全局CSS变量
- **组件库**: shadcn/ui
- **状态管理**: React Hooks (useState, useCallback, useEffect)

## 技术选型

### AI分析卡片标题动态化策略
- 在AnalysisContentRenderer中添加点击处理函数
- 将extendable文本作为参数传递给AI分析系统
- 修改AI分析卡片组件支持自定义标题
- 保持向后兼容性，默认显示"AI分析"

## 数据库/接口设计

无需修改数据库或接口设计，仅修改前端显示逻辑和参数传递。

## 测试策略

### 单元测试
- 测试extendable按钮点击处理
- 测试动态标题传递
- 测试组件渲染状态

### 集成测试
- 测试extendable按钮到AI分析的完整流程
- 测试深色/浅色模式切换
- 测试响应式布局

### 视觉测试
- 验证动态标题显示
- 验证动画效果

## 安全性

- 保持现有的XSS防护措施
- 确保用户输入的安全处理
- 维护现有的权限控制

## 实现细节

### AI分析卡片标题动态化

```typescript
// 修改前：固定的点击处理
onClick={() => setIsExpanded(!isExpanded)}

// 修改后：支持AI分析触发
onClick={() => {
  if (block.expandable) {
    // 触发AI分析，传递extendable文本作为标题
    onExpandableClick?.(block.expandable, block.c);
  } else {
    setIsExpanded(!isExpanded);
  }
}}

// 新增：AI分析卡片支持自定义标题
interface AIAnalysisCardProps {
  title?: string; // 可选的标题，默认为"AI分析"
  // ... 其他属性
}
```

## 性能优化

- 使用React.memo优化组件重渲染
- 使用useCallback优化函数引用
- 使用useMemo优化计算密集型操作

## 兼容性

- 保持与现有API的完全兼容
- 支持深色和浅色模式
- 保持响应式设计
- 确保无障碍访问性
- 保持向后兼容性，不影响现有功能 