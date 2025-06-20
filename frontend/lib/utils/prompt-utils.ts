/**
 * Prompt 相关的工具函数
 * 提供测试数据创建、类型转换等功能
 * 注意：此文件不包含具体的 prompt 内容，所有业务数据应从后端 API 获取
 */

import { Prompt } from "@/lib/api/services/prompts";
import {
  PromptRecommendation,
  LLMAnalysis,
} from "@/lib/stores/llm-analysis-store";

/**
 * 从 Prompt 对象转换为 PromptRecommendation 的辅助函数
 */
export const convertPromptToRecommendation = (
  prompt: Prompt,
): PromptRecommendation => {
  // 根据 prompt 名称映射图标和类型
  const getIconAndType = (
    name: string,
  ): { icon: string; type: LLMAnalysis["type"] } => {
    const nameMap: Record<string, { icon: string; type: LLMAnalysis["type"] }> =
      {
        生成摘要: { icon: "📝", type: "summary" },
        提取要点: { icon: "🎯", type: "key_points" },
        生成问题: { icon: "❓", type: "questions" },
        深度洞察: { icon: "💡", type: "insights" },
        总结全文: { icon: "📄", type: "summary" },
        提取核心要点: { icon: "🎯", type: "key_points" },
        用大白话解释: { icon: "💬", type: "custom" },
        生成讨论问题: { icon: "❓", type: "questions" },
      };

    return nameMap[name] || { icon: "🤖", type: "custom" };
  };

  const { icon, type } = getIconAndType(prompt.name);

  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    prompt: prompt.content,
    type,
    icon,
  };
};

/**
 * 创建测试用的 Mock Prompt 数据
 * 提供通用的工厂函数，不包含具体的业务内容
 */
export const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => {
  const baseId =
    overrides.id || `mock-prompt-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: baseId,
    name: `测试提示词 ${baseId.split("-").pop()}`,
    content: `这是一个用于测试的提示词模板。请对以下内容进行处理：{content}`,
    description: `这是一个测试用的提示词描述 - ${baseId}`,
    visibility: "public",
    version: 1,
    enabled: true,
    updated_at: new Date().toISOString(),
    type: "template",
    input_vars: [
      {
        name: "content",
        description: "输入内容",
        required: true,
      },
    ],
    meta_data: null,
    team_id: null,
    created_at: new Date().toISOString(),
    embedding: null,
    created_by: "test-user-id",
    ...overrides,
  };
};

/**
 * 创建一组通用的测试 Mock Prompts 数据
 * 使用抽象的、通用的测试数据，不复制真实的业务内容
 */
export const createMockPrompts = (count: number = 4): Prompt[] => {
  return Array.from({ length: count }, (_, index) => {
    const id = `mock-prompt-${index + 1}`;
    return createMockPrompt({
      id,
      name: `测试提示词 ${index + 1}`,
      content: `这是第 ${index + 1} 个测试提示词。请处理以下内容：{content}`,
      description: `第 ${index + 1} 个测试提示词的描述`,
      enabled: index < 2, // 前两个启用，后两个禁用，用于测试不同状态
    });
  });
};

/**
 * 创建特定类型的测试 Mock Prompt
 */
export const createMockPromptWithType = (
  type: LLMAnalysis["type"],
  overrides: Partial<Prompt> = {},
): Prompt => {
  const typeConfig = {
    summary: { icon: "📝", name: "测试摘要提示词" },
    key_points: { icon: "🎯", name: "测试要点提示词" },
    questions: { icon: "❓", name: "测试问题提示词" },
    insights: { icon: "💡", name: "测试洞察提示词" },
    custom: { icon: "🤖", name: "测试自定义提示词" },
  };

  const config = typeConfig[type];

  return createMockPrompt({
    name: config.name,
    content: `${config.name}的内容。请处理：{content}`,
    description: `${config.name}的描述`,
    ...overrides,
  });
};

/**
 * 根据名称查找默认的图标和类型
 * 这个映射关系是纯 UI 层面的，不涉及业务数据
 */
export const getPromptIconAndType = (
  name: string,
): { icon: string; type: LLMAnalysis["type"] } => {
  const nameMap: Record<string, { icon: string; type: LLMAnalysis["type"] }> = {
    生成摘要: { icon: "📝", type: "summary" },
    提取要点: { icon: "🎯", type: "key_points" },
    生成问题: { icon: "❓", type: "questions" },
    深度洞察: { icon: "💡", type: "insights" },
    总结全文: { icon: "📄", type: "summary" },
    提取核心要点: { icon: "🎯", type: "key_points" },
    用大白话解释: { icon: "💬", type: "custom" },
    生成讨论问题: { icon: "❓", type: "questions" },
  };

  return nameMap[name] || { icon: "🤖", type: "custom" };
};
