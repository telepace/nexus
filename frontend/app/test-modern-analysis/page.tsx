"use client";

import React from 'react';
import { ModernAnalysisInterface } from '@/components/ai/ModernAnalysisInterface';
import { ContentItemPublic } from '@/app/content-library/types';
import { AIResult } from '@/lib/api/content';

// 模拟数据
const mockContent: ContentItemPublic = {
  id: 'test-content-id',
  title: '2024年度回顾：旅居、AI与自我蜕变',
  summary: '这篇文章记录了作者熊鑫伟在2024年的深刻人生转变历程，从离开外企舒适圈到拥抱旅居生活的思考与感悟。',
  content_text: `这篇文章记录了作者熊鑫伟在2024年的深刻人生转变历程...`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 'user-id',
  type: 'article',
  source_uri: 'https://example.com/article',
  processing_status: 'completed',
  ai_analysis: {
    summarizer: {
      summary: '这篇文章记录了作者熊鑫伟在2024年的深刻人生转变历程，从确定性到拥抱未知，从理论到实践，从个人成长到社会价值的探索。',
      analysis_type: 'summarizer'
    },
    key_points_extractor: {
      key_points: `## 核心转变要点

### 1. 从确定性到拥抱未知
作者离开外企的"舒适圈"，选择旅居生活，不再追求标准答案，而是探索自己想要的人生。

### 2. 认知升级：从理论到实践  
强调"回归现场"，通过在曼谷、尼泊尔、大理等地的亲身体验理解世界。

### 3. 价值重构：从个人成长到社会价值
通过ACT高原徒步直面生死，理解活着的意义，探索AI时代的"超级个体"概念。

### 4. 旅居哲学
将旅居视为认知实验，每个新环境都是重新审视自我的机会。`,
      analysis_type: 'key_points_extractor'
    }
  }
};

const mockAnalysisResult: AIResult = {
  id: 'analysis-result-id',
  content_item_id: 'test-content-id',
  summary: '这篇文章记录了作者熊鑫伟在2024年的深刻人生转变历程，从确定性到拥抱未知的思考与感悟。',
  key_points: [
    '核心转变：从确定性到拥抱未知',
    '认知升级：从理论到实践',
    '价值重构：从个人成长到社会价值',
    '旅居哲学：空间即思维工具'
  ],
  labels: ['自我成长', '旅居生活', 'AI思考', '人生哲学'],
  reading_time_minutes: 8,
  difficulty_level: 'intermediate',
  content_quality_score: 8.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export default function TestModernAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            现代化AI分析界面测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            体验重构后的AI分析模块，合并了内容分析和实时AI功能
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-950 rounded-xl shadow-lg overflow-hidden">
          <div className="h-[800px] relative">
            <ModernAnalysisInterface
              content={mockContent}
              analysisResult={mockAnalysisResult}
              isLoading={false}
              className="h-full"
            />
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-950 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            重构特色
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">✨ 设计特色</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 极简优雅的卡片式设计</li>
                <li>• 现代化的交互动画效果</li>
                <li>• 统一的色彩方案和布局</li>
                <li>• 响应式设计适配各种屏幕</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">🚀 功能特色</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 合并内容分析和实时AI</li>
                <li>• 文本选择浮层操作</li>
                <li>• 智能历史记录管理</li>
                <li>• 流式AI分析响应</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 