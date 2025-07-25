"use client";

import { ConversationHistory } from "@/components/ai/ConversationHistory";
import { ConversationPublic } from "@/lib/api/content";

// 模拟历史记录数据
const mockHistoryData: ConversationPublic[] = [
  {
    id: "1",
    title: "网页内容摘要分析",
    summary: "用户请求对一篇技术文章进行摘要分析，AI生成了结构化的要点和关键信息",
    conversation_type: "auto_analysis",
    ai_model_name: "gpt-4o",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
    messages: [
      {
        role: "user",
        content: "请帮我分析这篇关于React性能优化的文章",
        metadata: {
          isPromptBased: true,
          promptName: "网页内容摘要",
          originalUserInput: "请帮我分析这篇关于React性能优化的文章"
        }
      },
      {
        role: "assistant",
        content: `{"type": "summary", "content": "本文详细介绍了React应用性能优化的几个关键策略"}
{"type": "keypoint", "content": "1. 使用React.memo避免不必要的重渲染"}
{"type": "keypoint", "content": "2. 合理使用useMemo和useCallback缓存计算结果"}
{"type": "keypoint", "content": "3. 代码分割和懒加载优化首屏加载性能"}`
      }
    ]
  },
  {
    id: "2", 
    title: "AI助手日常对话",
    summary: "用户与AI进行的日常问答交流，涉及技术问题讨论",
    conversation_type: "user_chat",
    ai_model_name: "claude-3-sonnet",
    created_at: "2024-01-14T14:20:00Z",
    updated_at: "2024-01-14T14:25:00Z",
    messages: [
      {
        role: "user",
        content: "TypeScript中interface和type的区别是什么？",
        metadata: {
          originalUserInput: "TypeScript中interface和type的区别是什么？"
        }
      },
      {
        role: "assistant", 
        content: "TypeScript中interface和type都可以用来定义类型，但有以下主要区别：\n\n1. 语法形式不同\n2. 扩展方式不同\n3. 合并行为不同\n\ninterface更适合定义对象结构，type更适合复杂类型操作。"
      }
    ]
  },
  {
    id: "3",
    title: "代码审查模板分析", 
    summary: "使用代码审查模板对提交的代码进行静态分析和建议",
    conversation_type: "prompt_analysis",
    ai_model_name: "gpt-4o-mini",
    created_at: "2024-01-13T09:15:00Z",
    updated_at: "2024-01-13T09:20:00Z",
    messages: [
      {
        role: "user",
        content: "请使用代码审查模板分析这段JavaScript代码的问题",
        metadata: {
          isPromptBased: true,
          promptName: "代码审查专家",
          originalUserInput: "请审查这段代码"
        }
      },
      {
        role: "assistant",
        content: `{"type": "analysis", "content": "代码质量分析结果"}
{"type": "issue", "content": "发现3个潜在问题需要修复"}
{"type": "suggestion", "content": "建议添加错误处理机制"}
{"type": "improvement", "content": "可以通过重构提升代码可读性"}`
      }
    ]
  }
];

export default function TestHistoryRefactorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            历史记录重构测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试重构后的历史记录组件，现在采用简洁的卡片呈现方式，类似内容摘要的风格
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <ConversationHistory 
            conversations={mockHistoryData}
            loading={false}
            onRefresh={() => console.log("刷新历史记录")}
          />
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            重构改进说明
          </h2>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• 移除了人物头像和对话气泡的形式</li>
            <li>• 采用简洁的卡片布局，突出用户意图和AI输出</li>
            <li>• 结构化JSON内容使用UniversalContentRenderer渲染</li>
            <li>• 添加对话类型图标和颜色标识</li>
            <li>• 优化用户意图显示逻辑，优先显示prompt名称</li>
            <li>• 保持与内容摘要模块一致的视觉风格</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 