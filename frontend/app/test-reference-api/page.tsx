"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { referenceApi } from '@/lib/api/reference';
import type { SourceParagraph, ContentReferenceInfo } from '@/lib/api/reference';

export default function TestReferenceApiPage() {
  const [contentId, setContentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContentReferenceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testGetContentParagraphs = async () => {
    if (!contentId.trim()) {
      setError('请输入有效的 Content ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 测试 API 调用:', `/api/v1/content/${contentId}/segments`);
      const response = await referenceApi.getContentParagraphs(contentId);
      console.log('✅ API 响应:', response);
      setResult(response);
    } catch (err) {
      console.error('❌ API 错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const testBatchGetParagraphs = async () => {
    if (!contentId.trim()) {
      setError('请输入有效的 Content ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const refIds = [1, 3, 5]; // 测试批量获取
      console.log('🚀 测试批量获取:', refIds);
      const response = await referenceApi.getParagraphsByRefs(contentId, refIds);
      console.log('✅ 批量获取响应:', response);
      setResult({ segments: response, total: response.length, missing_numbers: [] });
    } catch (err) {
      console.error('❌ 批量获取错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const testGetContext = async () => {
    if (!contentId.trim()) {
      setError('请输入有效的 Content ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const refId = 5; // 测试获取第5段的上下文
      console.log('🚀 测试上下文获取:', refId);
      const response = await referenceApi.getParagraphContext(contentId, refId, 2);
      console.log('✅ 上下文响应:', response);
      if (response) {
        setResult({ 
          segments: response.context, 
          total: response.context.length, 
          missing_numbers: [] 
        });
      }
    } catch (err) {
      console.error('❌ 上下文获取错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">引用API测试页面</h1>
        <p className="text-muted-foreground mt-2">测试修复后的引用管理API功能</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API 测试工具</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入 Content ID (UUID 格式)"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testGetContentParagraphs}
              disabled={loading}
              variant="default"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              获取所有段落
            </Button>
            
            <Button 
              onClick={testBatchGetParagraphs}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              批量获取 (1,3,5)
            </Button>
            
            <Button 
              onClick={testGetContext}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              获取段落5的上下文
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API 信息展示 */}
      <Card>
        <CardHeader>
          <CardTitle>API 端点信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">GET</Badge>
              <code>/api/v1/content/{'{content_id}'}/segments</code>
              <span className="text-muted-foreground">获取所有段落</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">GET</Badge>
              <code>/api/v1/content/{'{content_id}'}/segments?numbers=1,3,5</code>
              <span className="text-muted-foreground">批量获取指定段落</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">GET</Badge>
              <code>/api/v1/content/{'{content_id}'}/segments?from_number=3&to_number=7</code>
              <span className="text-muted-foreground">获取范围段落</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误显示 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">API 调用失败</span>
            </div>
            <pre className="mt-2 text-sm bg-destructive/10 p-3 rounded border overflow-auto">
              {error}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 成功结果显示 */}
      {result && (
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-600">API 调用成功</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 统计信息 */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline">
                  总段落数: {result.total}
                </Badge>
                <Badge variant="outline">
                  返回段落数: {result.segments.length}
                </Badge>
                {result.missing_numbers.length > 0 && (
                  <Badge variant="destructive">
                    缺失段落: {result.missing_numbers.join(', ')}
                  </Badge>
                )}
              </div>

              {/* 段落列表 */}
              <div className="space-y-2 max-h-96 overflow-auto">
                {result.segments.map((paragraph: SourceParagraph) => (
                  <div key={paragraph.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        段落 {paragraph.display_number}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        ID: {paragraph.id}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed">
                      {paragraph.content.length > 200 
                        ? `${paragraph.content.substring(0, 200)}...` 
                        : paragraph.content
                      }
                    </p>
                    {paragraph.start_offset !== undefined && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        偏移量: {paragraph.start_offset} - {paragraph.end_offset}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 调试信息 */}
      <Card>
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">API Base URL:</span>
              <code className="bg-muted px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">修复状态:</span>
              <Badge variant="secondary">
                ✅ API 路径已修复 (/api/v1/content/...)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">字段映射:</span>
              <Badge variant="secondary">
                ✅ 使用 display_number 字段
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 