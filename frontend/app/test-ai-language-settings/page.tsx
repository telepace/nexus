'use client';

import React from 'react';
import { AILanguageSettings } from '@/components/settings/AILanguageSettings';

export default function TestAILanguageSettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI 语言设置测试页面</h1>
          <p className="text-muted-foreground mt-2">
            测试用户 AI 输出语言偏好设置功能
          </p>
        </div>
        
        <AILanguageSettings className="max-w-2xl" />
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 测试说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 修改 AI 输出语言设置</li>
            <li>• 执行内容分析操作</li>
            <li>• 验证 AI 输出是否使用了设置的语言</li>
            <li>• 检查浏览器控制台和后端日志</li>
          </ul>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ 预期行为</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• 设置为中文：AI 输出中文内容</li>
            <li>• 设置为英文：AI 输出英文内容</li>
            <li>• 设置独立于界面语言</li>
            <li>• 所有 AI 功能（摘要、标签、分析）都遵循设置</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 