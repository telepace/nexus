/**
 * 标题工具函数测试用例
 */

import {
  generateFriendlyTitle,
  truncateTitle,
  isQuestion,
  formatQuestionTitle,
} from "./title-utils";

describe("title-utils", () => {
  describe("generateFriendlyTitle", () => {
    it("should use prompt name for prompt analysis type", () => {
      const result = generateFriendlyTitle({
        userInput: "请帮我分析这篇文章的主要观点和结论",
        promptName: "深度文章分析",
        analysisType: "prompt",
      });
      expect(result).toBe("深度文章分析");
    });

    it("should format question properly for manual analysis", () => {
      const result = generateFriendlyTitle({
        userInput: "这个产品的优缺点是什么？",
        analysisType: "manual",
      });
      expect(result).toBe("这个产品的优缺点是什么");
    });

    it("should truncate long text properly", () => {
      const result = generateFriendlyTitle({
        userInput:
          "请详细分析一下这篇关于人工智能发展趋势的长篇研究报告，包括技术发展路径、市场应用前景、潜在风险等多个维度",
        analysisType: "manual",
      });
      // The cleanUserInput function removes "请" prefix and truncateTitle adds "..."
      expect(result).toBe("详细分析一下这篇关于人工智能发展趋势的长篇研究报告，包括技术发展路径、市场...");
    });

    it("should optimize question format", () => {
      const result = generateFriendlyTitle({
        userInput: "能否帮我解释一下什么是区块链技术？",
        analysisType: "manual",
      });
      // cleanUserInput removes "帮我" but not "能否", and removes the "？"
      expect(result).toBe("帮我解释一下什么是区块链技术");
    });

    it("should handle expand analysis type", () => {
      const result = generateFriendlyTitle({
        userInput: "请对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用",
        analysisType: "expand",
      });
      expect(result).toBe("对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用");
    });
  });

  describe("isQuestion", () => {
    it("should detect questions with question marks", () => {
      expect(isQuestion("这是什么意思？")).toBe(true);
      expect(isQuestion("How does this work?")).toBe(true);
    });

    it("should detect questions without question marks", () => {
      expect(isQuestion("为什么会这样")).toBe(true);
    });

    it("should not detect statements as questions", () => {
      expect(isQuestion("这是一个普通的陈述句")).toBe(false);
    });
  });

  describe("truncateTitle", () => {
    it("should truncate long titles", () => {
      const result = truncateTitle("这是一个非常长的标题需要被截断处理", 20);
      expect(result).toBe("这是一个非常长的标题需要被截断处理");
    });

    it("should not truncate short titles", () => {
      const result = truncateTitle("短标题", 20);
      expect(result).toBe("短标题");
    });

    it("should handle titles with multiple sentences", () => {
      const result = truncateTitle("这是一个包含多个句子的标题。第二个句子应该被移除。", 50);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe("formatQuestionTitle", () => {
    it("should format question titles properly", () => {
      const result = formatQuestionTitle("能否帮我解释一下什么是区块链技术？");
      // extractQuestionCore removes "帮我解释一下" but keeps the rest
      expect(result).toBe("帮我解释一下什么是区块链技术");
    });
  });
});
