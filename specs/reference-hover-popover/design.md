# 技术方案设计

## 架构概述

基于现有代码分析，悬浮引用功能的技术架构如下：

```
ContentAnalysisView (右侧预览)
├── EnhancedModernAnalysisInterface
    ├── StreamingConversationCard (LLM回复卡片)
        ├── UniversalContentRenderer
            ├── JsonlRenderer (解析JSONL格式的ref字段)
                └── MarkdownRenderer (渲染引用链接)
                    └── ReferenceHyperlinkRenderer (引用超链接组件)
                        └── EnhancedReferenceTooltip (悬浮卡片)
```

## 技术栈

- **前端框架**: React + Next.js
- **状态管理**: ReferenceManager Context
- **UI组件**: 自定义组件基于Tailwind CSS
- **数据获取**: API调用 `/api/v1/content/{id}/segments`
- **悬浮实现**: CSS定位 + React Portal

## 核心组件设计

### 1. 数据流设计

```typescript
// 数据获取链路
ContentAnalysisView 
→ 传递 contentId 到 ReferenceManagerProvider
→ ReferenceManager 调用 referenceApi.getContentParagraphs()
→ 获取原文段落数据存储到 context
→ 各个引用组件通过 useReferenceManagerSafe() 访问数据
```

### 2. 关键配置修复

**问题1**: MarkdownRenderer缺少必要参数
- 当前：`<MarkdownRenderer content={content} />`
- 修复：添加 `contentId` 和 `enableEnhancedTooltip` 参数

**问题2**: ReferenceManagerProvider包装缺失
- 当前：ContentAnalysisView没有被ReferenceManagerProvider包装
- 修复：在ContentAnalysisView外层添加Provider

**问题3**: 引用数据获取失败
- 当前：API调用可能失败，没有降级方案
- 修复：增强错误处理和Mock数据降级

### 3. 悬浮卡片增强

**内容显示**:
- 原文片段预览（最多200字符）
- 段落位置信息（第X段，属于第X章）
- 上下文预览（可选）

**交互设计**:
- 500ms延迟显示
- 智能位置计算（避免溢出屏幕）
- 点击跳转到原文位置

### 4. 原文高亮联动

**滚动定位**:
```typescript
// 在EnhancedReferenceTooltip中触发事件
const handleMouseEnter = () => {
  // 发送高亮事件到左侧原文区域
  window.dispatchEvent(new CustomEvent('highlightReference', {
    detail: { refIds: [refId], action: 'highlight' }
  }));
};
```

**高亮效果**:
- 使用 `SmartReferenceHighlighter` 组件
- CSS类：`.paragraph-highlight` 
- 2秒后自动移除

## 接口设计

### API接口
```typescript
// 已存在的API
GET /api/v1/content/{contentId}/segments
Response: {
  segments: Array<{
    id: string;
    display_number: number;
    content: string;
    start_offset?: number;
    end_offset?: number;
  }>;
  total: number;
}
```

### 组件接口增强
```typescript
// MarkdownRenderer 新增参数
interface MarkdownRendererProps {
  content: string;
  contentId?: string;           // 新增：用于获取引用数据
  enableEnhancedTooltip?: boolean; // 新增：启用增强tooltip
  onReferenceClick?: (refId: number) => void;
}

// ReferenceHyperlinkRenderer 参数补全
interface ReferenceHyperlinkRendererProps {
  refString?: string;
  contentId?: string;           // 关键：必须传递contentId
  enableEnhancedTooltip?: boolean; // 关键：必须启用
  onReferenceClick?: (refId: number) => void;
}
```

## 安全性考虑

1. **XSS防护**: 所有用户输入通过React自动转义
2. **API安全**: 使用Bearer Token认证
3. **错误处理**: 优雅降级，不暴露系统错误
4. **性能优化**: 
   - 引用数据缓存（5分钟TTL）
   - 防抖处理悬浮事件
   - 虚拟滚动大量段落

## 测试策略

### 单元测试
- ReferenceHyperlinkRenderer 引用解析
- EnhancedReferenceTooltip 悬浮逻辑
- ReferenceManager 数据管理

### 集成测试  
- 完整的悬浮流程测试
- 跨组件事件通信
- API错误处理

### 用户体验测试
- 悬浮响应时间 < 500ms
- 卡片定位准确性
- 原文高亮联动效果