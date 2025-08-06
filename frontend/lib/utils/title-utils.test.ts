/**
 * 标题工具函数测试用例
 * 展示优化后的标题生成效果
 */

import {
  generateFriendlyTitle,
  truncateTitle,
  isQuestion,
  formatQuestionTitle,
} from "./title-utils";

// 测试用例展示
const testCases = [
  // Prompt 使用场景
  {
    input: {
      userInput: "请帮我分析这篇文章的主要观点和结论",
      promptName: "深度文章分析",
      analysisType: "prompt" as const,
    },
    expected: "深度文章分析",
  },

  // 手动输入场景
  {
    input: {
      userInput: "这个产品的优缺点是什么？",
      analysisType: "manual" as const,
    },
    expected: "这个产品的优缺点是什么",
  },

  // 长文本截断场景
  {
    input: {
      userInput:
        "请详细分析一下这篇关于人工智能发展趋势的长篇研究报告，包括技术发展路径、市场应用前景、潜在风险等多个维度",
      analysisType: "manual" as const,
    },
    expected: "详细分析一下这篇关于人工智能发展趋势的长篇研究报告...",
  },

  // 问题格式优化
  {
    input: {
      userInput: "能否帮我解释一下什么是区块链技术？",
      analysisType: "manual" as const,
    },
    expected: "什么是区块链技术",
  },

  // 展开讨论场景
  {
    input: {
      userInput: "请对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用",
      analysisType: "expand" as const,
    },
    expected: "对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用",
  },
];

console.log("=== LLM 分析标题优化效果展示 ===\n");

testCases.forEach((testCase, index) => {
  const result = generateFriendlyTitle(testCase.input);
  console.log(`测试用例 ${index + 1}:`);
  console.log(`原始输入: "${testCase.input.userInput}"`);
  console.log(`优化标题: "${result}"`);
  console.log(`预期效果: "${testCase.expected}"`);
  console.log(
    `匹配结果: ${result === testCase.expected ? "✅ 完全匹配" : "⚠️ 需要调整"}`,
  );
  console.log("---\n");
});

// 其他工具函数测试
console.log("=== 其他工具函数测试 ===\n");

// 问题检测测试
const questionTests = [
  "这是什么意思？",
  "为什么会这样",
  "How does this work?",
  "这是一个普通的陈述句",
];

questionTests.forEach((text) => {
  console.log(`"${text}" -> 是问题: ${isQuestion(text) ? "是" : "否"}`);
});

console.log("\n");

// 标题截断测试
const truncateTests = [
  "这是一个非常长的标题需要被截断处理",
  "短标题",
  "这是一个包含多个句子的标题。第二个句子应该被移除。",
];

truncateTests.forEach((text) => {
  console.log(`原文: "${text}"`);
  console.log(`截断: "${truncateTitle(text, 20)}"`);
  console.log("---");
});

export {};
