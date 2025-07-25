"use client";

import { EnhancedModernAnalysisInterface } from "@/components/ai/EnhancedModernAnalysisInterface";
import { ContentItemPublic, AIResult } from "@/lib/api/content";

// 模拟内容数据
const mockContent: ContentItemPublic = {
  id: "test-content-id",
  title: "测试内容 - Reader页面默认折叠",
  content_text: "这是一个测试内容，用于验证在reader页面中，除了内容摘要和提问清单外，其他卡片是否默认折叠。",
  summary: null,
  source_uri: null,
  type: "text",
  processing_status: "completed",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T10:35:00Z",
  user_id: "test-user-id",
  meta_info: null,
  error_message: null,
};

// 模拟AI分析结果
const mockAnalysisResult: AIResult = {
  optimized_title: "优化后的标题",
  brief_description: "简要描述",
  summary: "这是一个测试摘要内容，应该在reader页面保持展开状态。",
  key_points: `{"type": "keypoint", "content": "关键要点1：这是第一个要点"}
{"type": "keypoint", "content": "关键要点2：这是第二个要点"}
{"type": "keypoint", "content": "关键要点3：这是第三个要点"}`,
  labels: ["测试", "折叠", "reader"],
  content_analysis: "详细的内容分析",
  reading_time_minutes: 5,
  difficulty_level: "中等",
  content_quality_score: 85,
};

export default function TestReaderCollapsePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Reader页面默认折叠测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试在reader页面路径下，AI对话卡片是否默认折叠
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              测试说明
            </h2>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• 当前路径：/test-reader-collapse（模拟包含 "reader" 的路径）</li>
              <li>• "内容摘要" 和 "提问清单" 卡片应该保持展开</li>
              <li>• 用户交互产生的AI对话卡片应该默认折叠</li>
              <li>• 可以手动点击展开/折叠按钮来切换状态</li>
              <li>• 注意：由于路径不包含 "reader"，需要修改为 "/reader-test" 来测试</li>
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg" style={{ height: "600px" }}>
          <EnhancedModernAnalysisInterface
            content={mockContent}
            analysisResult={mockAnalysisResult}
            isLoading={false}
            className="h-full"
            hideHeader={false}
          />
        </div>

        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
            如何测试
          </h2>
          <ol className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <li>1. 在下方的AI助手中发送一些消息，生成AI对话卡片</li>
            <li>2. 刷新页面（F5或Cmd+R）</li>
            <li>3. 观察页面加载后的卡片状态：</li>
            <li className="ml-4">• "内容摘要"和"提问清单"应该保持展开</li>
            <li className="ml-4">• 新生成的AI对话卡片应该默认折叠</li>
            <li>4. 点击折叠/展开按钮验证交互是否正常</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 