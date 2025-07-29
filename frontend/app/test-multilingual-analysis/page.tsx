/**
 * 多语言内容分析测试页面
 * 
 * 访问路径: /test-multilingual-analysis
 * 
 * 这个页面用于测试新实现的多语言内容分析功能
 */

'use client';

import { MultilingualAnalysisExample } from '@/components/examples/MultilingualAnalysis';

export default function TestMultilingualAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MultilingualAnalysisExample />
    </div>
  );
}