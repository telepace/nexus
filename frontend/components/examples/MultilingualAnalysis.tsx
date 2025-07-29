/**
 * 多语言内容分析组件示例
 * 演示如何使用新的多语言分析API
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { analyzeContentWithTemplate, parseStreamingResponse } from '@/lib/api/content-analysis';
import { useAuthStore } from '@/lib/stores/auth-store';
import { detectLocale } from '@/lib/i18n';

interface MultilingualAnalysisProps {
  contentId: string;
}

export function MultilingualAnalysis({ contentId }: MultilingualAnalysisProps) {
  const [analysisType, setAnalysisType] = useState<'summary' | 'key_points'>('summary');
  const [outputLanguage, setOutputLanguage] = useState<string>(() => {
    // 自动检测用户语言
    const locale = detectLocale();
    return locale === 'en' ? 'English' : 'Chinese';
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuthStore();

  const handleAnalyze = async () => {
    if (!token) {
      setError('请先登录');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const stream = await analyzeContentWithTemplate({
        contentId,
        analysisType,
        language: outputLanguage === 'English' ? 'en' : 'zh',
        token,
      });

      if (!stream) {
        throw new Error('无法启动内容分析');
      }

      // 处理流式响应
      const analysisResults: any[] = [];
      for await (const data of parseStreamingResponse(stream)) {
        analysisResults.push(data);
        setResults([...analysisResults]); // 实时更新结果
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>多语言内容分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 分析类型选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">分析类型:</label>
          <Select value={analysisType} onValueChange={(value: 'summary' | 'key_points') => setAnalysisType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">内容摘要</SelectItem>
              <SelectItem value="key_points">关键要点</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 输出语言选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">输出语言:</label>
          <Select value={outputLanguage} onValueChange={setOutputLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Chinese">中文</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Japanese">日本語</SelectItem>
              <SelectItem value="Korean">한국어</SelectItem>
              <SelectItem value="French">Français</SelectItem>
              <SelectItem value="German">Deutsch</SelectItem>
              <SelectItem value="Spanish">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 开始分析按钮 */}
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            '开始分析'
          )}
        </Button>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* 分析结果 */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">分析结果:</h3>
            <div className="p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border text-sm">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>说明:</strong></p>
          <p>• 这个组件演示了如何使用新的多语言内容分析API</p>
          <p>• 系统会自动检测浏览器语言，但你可以手动选择输出语言</p>
          <p>• API使用英文提示词，但会根据选择的语言输出结果</p>
          <p>• Content ID: {contentId}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 使用示例页面组件
export function MultilingualAnalysisExample() {
  const [contentId, setContentId] = useState('');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">多语言内容分析示例</h1>
        <p className="text-gray-600">演示如何使用支持多语言输出的内容分析API</p>
      </div>

      {/* Content ID 输入 */}
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">内容ID:</label>
            <input
              type="text"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="输入要分析的内容ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 分析组件 */}
      {contentId && <MultilingualAnalysis contentId={contentId} />}
    </div>
  );
}