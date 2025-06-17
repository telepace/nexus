---
title: Prompts 架构设计文档
description: 解决 prompts 重复定义问题的架构设计方案
category: Architecture
---

# Prompts 架构设计文档

## 问题背景

在原有的代码中，存在多处重复定义的问题：

1. **后端数据库初始化** (`backend/app/core/db.py`) - 硬编码了默认 prompts
2. **前端 Store** (`frontend/lib/stores/llm-analysis-store.ts`) - 硬编码了 `defaultPromptRecommendations`
3. **测试文件** (`frontend/__tests__/components/ui/prompt-command-dialog.test.tsx`) - 硬编码了 mock 数据

**更严重的是**，即使在重构过程中，我们也可能不经意地在前端工具函数中重新创建了相同的业务数据，这违背了"单一数据源"的原则。

这种重复定义导致了以下问题：
- 数据不一致的风险
- 维护困难，需要在多处修改
- 测试数据与生产数据脱节
- 业务逻辑分散，难以管理

## ❌ 错误的重构方案

**常见误区：在前端工具函数中重复定义业务数据**

```typescript
// ❌ 错误示例 - 仍然在重复定义具体的业务内容
export const createMockPrompts = () => [
  {
    name: "生成摘要",  // 这是业务数据，不应该在前端重复定义
    content: "请为以下内容生成一个简洁明了的摘要：{content}",
    description: "为内容生成简洁的摘要",
  },
  // ... 更多具体的业务数据
];
```

这种做法仍然违背了"单一数据源"原则，只是把重复从一个地方转移到了另一个地方。

## ✅ 正确的解决方案

### 核心原则

> **单一数据源：后端配置文件是唯一的业务数据定义地，前端任何地方都不应该重复定义具体的业务内容**

### 架构设计

```
后端数据源 (唯一的业务数据)
    ↓
API 接口 (数据传输)
    ↓
前端 Store (数据缓存和状态管理)
    ↓
UI 组件 (数据展示和交互)

前端工具函数 (通用工厂，无业务数据)
    ↓
测试文件 (抽象测试数据)
```

### 1. 后端：唯一数据源

**`backend/app/core/default_prompts.py`** - 集中管理所有默认 prompts 配置

```python
# ✅ 正确：业务数据的唯一定义地
DEFAULT_PROMPTS = [
    {
        "name": "深度洞察",
        "description": "提供深度的分析和洞察",
        "content": "请对以下内容进行深度分析，并且提供有价值的洞察和观点：\n\n{content}",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": True,
        # ... 其他配置
    },
    # ... 其他 prompts
]
```

### 2. 前端：纯工具函数，无业务数据

**`frontend/lib/utils/prompt-utils.ts`** - 提供通用工具，不包含具体业务内容

```typescript
// ✅ 正确：通用工厂函数，不包含具体业务数据
export const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => {
  const baseId = overrides.id || `mock-prompt-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: baseId,
    name: `测试提示词 ${baseId.split('-').pop()}`,
    content: `这是一个用于测试的提示词模板。请对以下内容进行处理：{content}`,
    description: `这是一个测试用的提示词描述 - ${baseId}`,
    // ... 通用的测试属性
    ...overrides,
  };
};

// ✅ 正确：根据类型创建测试数据，但不包含具体业务内容
export const createMockPromptWithType = (
  type: LLMAnalysis["type"],
  overrides: Partial<Prompt> = {}
): Prompt => {
  const typeConfig = {
    summary: { name: "测试摘要提示词" },
    insights: { name: "测试洞察提示词" },
    // ... 其他类型的通用配置
  };
  // 返回通用的测试数据
};
```

### 3. 测试：抽象数据，专注功能

**测试文件** - 使用抽象的测试数据，专注于功能测试

```typescript
// ✅ 正确：抽象的测试数据，不复制真实业务内容
const mockPrompts: Prompt[] = [
  createMockPromptWithType("summary", {
    id: "test-prompt-1",
    name: "测试摘要功能",  // 抽象的测试名称
    description: "用于测试摘要功能的提示词",  // 测试描述
  }),
  createMockPromptWithType("insights", {
    id: "test-prompt-2", 
    name: "测试洞察功能",  // 抽象的测试名称
    description: "用于测试洞察功能的提示词",  // 测试描述
  }),
];
```

## 关键差异对比

| 方面 | ❌ 错误做法 | ✅ 正确做法 |
|------|------------|------------|
| **业务数据** | 在多处重复定义具体内容 | 只在后端配置文件定义 |
| **前端工具** | 包含具体的 prompt 内容 | 只提供通用的工厂函数 |
| **测试数据** | 复制真实的业务内容 | 使用抽象的测试数据 |
| **维护成本** | 需要同步多处修改 | 只需修改一处 |
| **数据一致性** | 容易出现不一致 | 保证数据一致性 |

## 实现细节

### 后端配置文件

- **作用**：唯一的业务数据定义地
- **内容**：包含所有默认 prompts 的完整定义
- **职责**：业务逻辑和数据结构的权威来源

### 前端工具函数

- **作用**：提供类型转换和测试工具
- **内容**：UI 映射关系（图标、类型）和通用工厂函数
- **职责**：辅助开发和测试，不包含业务数据

### 测试策略

- **单元测试**：使用抽象的测试数据，专注于功能逻辑
- **集成测试**：通过 API 获取真实数据进行测试
- **E2E 测试**：使用真实环境和数据

## 使用指南

### 添加新的默认 Prompt

1. **只在** `backend/app/core/default_prompts.py` 中添加新配置
2. 如果需要新的 UI 映射，在 `frontend/lib/utils/prompt-utils.ts` 中更新图标映射
3. 重新初始化数据库或运行迁移

### 修改现有 Prompt

1. **只在** `backend/app/core/default_prompts.py` 中修改配置
2. 通过数据库迁移或管理接口更新生产环境

### 创建测试数据

```typescript
// ✅ 使用通用工厂函数
const mockPrompt = createMockPrompt({
  name: "自定义测试名称",
  description: "自定义测试描述"
});

// ✅ 使用类型化工厂函数
const insightPrompt = createMockPromptWithType("insights", {
  id: "test-insights-prompt"
});
```

### 如果需要测试真实数据

```typescript
// ✅ 通过 API mock 或 fixture 文件
import { mockApiResponse } from '@/test/fixtures/prompts-api-response.json';

// 或者 mock API 调用
jest.mock('@/lib/api/services/prompts', () => ({
  promptsApi: {
    getEnabledPrompts: () => Promise.resolve(realPromptsData)
  }
}));
```

## 深度洞察 Prompt 的生成流程

### 工作流程

```
1. 配置定义 (backend/app/core/default_prompts.py)
   ↓
2. 数据库初始化 (backend/app/core/db.py)
   ↓
3. API 服务 (后端 API 路由)
   ↓
4. 前端获取 (frontend Store loadPrompts)
   ↓
5. UI 展示 (组件使用 Store 数据)
```

### 具体实现

1. **定义阶段**：在 `default_prompts.py` 中定义
2. **创建阶段**：数据库初始化时自动创建
3. **获取阶段**：前端通过 API 获取
4. **转换阶段**：使用工具函数转换为 UI 需要的格式
5. **展示阶段**：在组件中显示（💡 图标）

## 总结

通过这次重构，我们实现了：

1. **真正的单一数据源** - 业务数据只在后端定义
2. **彻底消除重复** - 前端不包含任何具体的业务内容
3. **清晰的职责分离** - 后端负责业务数据，前端负责展示逻辑
4. **更好的可维护性** - 修改业务数据只需要在一个地方
5. **测试友好** - 抽象的测试数据，专注于功能测试

**关键原则**：前端的任何地方都不应该包含具体的业务数据，所有业务数据都应该从后端 API 获取。 