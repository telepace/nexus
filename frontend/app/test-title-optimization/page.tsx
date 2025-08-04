"use client";

import React from 'react';
import { generateFriendlyTitle, truncateTitle, isQuestion, formatQuestionTitle } from '@/lib/utils/title-utils';

export default function TestTitleOptimization() {
  // 测试用例
  const testCases = [
    // Prompt 使用场景
    {
      name: "Prompt 使用场景",
      input: {
        userInput: "请帮我分析这篇文章的主要观点和结论",
        promptName: "深度文章分析",
        analysisType: 'prompt' as const
      },
      expected: "深度文章分析"
    },
    
    // 手动输入场景
    {
      name: "手动输入场景",
      input: {
        userInput: "这个产品的优缺点是什么？",
        analysisType: 'manual' as const
      },
      expected: "这个产品的优缺点是什么"
    },
    
    // 长文本截断场景
    {
      name: "长文本截断场景",
      input: {
        userInput: "请详细分析一下这篇关于人工智能发展趋势的长篇研究报告，包括技术发展路径、市场应用前景、潜在风险等多个维度",
        analysisType: 'manual' as const
      },
      expected: "详细分析一下这篇关于人工智能发展趋势的长篇研究报告..."
    },
    
    // 问题格式优化
    {
      name: "问题格式优化",
      input: {
        userInput: "能否帮我解释一下什么是区块链技术？",
        analysisType: 'manual' as const
      },
      expected: "什么是区块链技术"
    },
    
    // 展开讨论场景
    {
      name: "展开讨论场景",
      input: {
        userInput: "请对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用",
        analysisType: 'expand' as const
      },
      expected: "对以下要点进行深度展开讨论：机器学习在医疗诊断中的应用"
    }
  ];

  // 问题检测测试
  const questionTests = [
    "这是什么意思？",
    "为什么会这样",
    "How does this work?", 
    "这是一个普通的陈述句"
  ];

  // 标题截断测试
  const truncateTests = [
    "这是一个非常长的标题需要被截断处理",
    "短标题",
    "这是一个包含多个句子的标题。第二个句子应该被移除。"
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">LLM 分析标题优化效果展示</h1>
        
        {/* 主要测试用例 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-4">标题生成优化效果</h2>
          
          {testCases.map((testCase, index) => {
            const result = generateFriendlyTitle(testCase.input);
            const isMatched = result === testCase.expected;
            
            return (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 text-blue-600">
                  测试用例 {index + 1}: {testCase.name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">原始输入:</span>
                    <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                      "{testCase.input.userInput}"
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">优化标题:</span>
                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-800 dark:text-green-200 font-medium">
                      "{result}"
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">预期效果:</span>
                    <p className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-800 dark:text-blue-200">
                      "{testCase.expected}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span className="font-medium text-gray-600 dark:text-gray-300">匹配结果:</span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      isMatched 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    }`}>
                      {isMatched ? '✅ 完全匹配' : '⚠️ 需要调整'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 问题检测测试 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">问题检测功能</h2>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionTests.map((text, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-800 dark:text-gray-200">"{text}"</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isQuestion(text) 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                  }`}>
                    {isQuestion(text) ? '是问题' : '非问题'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 标题截断测试 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">标题截断功能</h2>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="space-y-4">
              {truncateTests.map((text, index) => (
                <div key={index} className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">原文:</span>
                    <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                      "{text}"
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">截断后 (20字符):</span>
                    <p className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-800 dark:text-blue-200 font-medium">
                      "{truncateTitle(text, 20)}"
                    </p>
                  </div>
                  {index < truncateTests.length - 1 && <hr className="my-4 border-gray-200 dark:border-gray-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">优化效果说明</h2>
          <div className="space-y-2 text-blue-700 dark:text-blue-300">
            <p>• <strong>Prompt 场景:</strong> 优先显示 Prompt 名称，让用户清楚知道使用了哪个模板</p>
            <p>• <strong>手动输入:</strong> 智能清理用户输入，移除冗余词汇，保留核心问题</p>
            <p>• <strong>长文本:</strong> 智能截断，优先在句子边界处截断，保持语义完整</p>
            <p>• <strong>问题格式:</strong> 自动识别问题类型，优化问题表述</p>
            <p>• <strong>展开讨论:</strong> 保留完整的讨论主题，确保上下文清晰</p>
          </div>
        </div>
      </div>
    </div>
  );
} 