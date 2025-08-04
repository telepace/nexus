"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loading } from "@/components/ui/loading";
import { ChunkItem } from "@/components/ui/ChunkItem";
import { contentApi } from "@/lib/api/content";
import { getCookie } from "@/lib/client-auth";
import type { ContentChunk, ContentChunksResponse } from "@/lib/api/content";

export default function TestChunksDebugPage() {
  const [contentId, setContentId] = useState("3ec1d1d9-e59c-4b9b-b161-915677b8c908");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [apiResponse, setApiResponse] = useState<any>(null);

  // 测试chunks API
  const testChunksAPI = async () => {
    if (!contentId.trim()) {
      setError("请输入Content ID");
      return;
    }

    setLoading(true);
    setError(null);
    setChunks([]);
    setApiResponse(null);

    try {
      // 检查认证token
      const token = getCookie("accessToken");
      console.log("🔑 当前认证token:", token ? "存在" : "不存在");

      // 调用API
      console.log("🚀 调用chunks API:", contentId);
      const response: ContentChunksResponse = await contentApi.getContentChunks(
        contentId,
        1,
        5,
        false
      );

      console.log("✅ API响应:", response);
      setApiResponse(response);
      setChunks(response.chunks);

      // 测试单个chunk的内容
      if (response.chunks.length > 0) {
        console.log("📄 第一个chunk内容:", {
          id: response.chunks[0].id,
          index: response.chunks[0].index,
          type: response.chunks[0].type,
          content_preview: response.chunks[0].content.substring(0, 100),
          content_length: response.chunks[0].content.length
        });
      }

    } catch (err) {
      console.error("❌ API调用失败:", err);
      setError(err instanceof Error ? err.message : "API调用失败");
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动测试
  useEffect(() => {
    if (contentId) {
      testChunksAPI();
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Chunks API 调试工具</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="输入Content ID"
              className="flex-1"
            />
            <Button onClick={testChunksAPI} disabled={loading}>
              {loading ? "测试中..." : "测试API"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && <Loading />}

          {apiResponse && (
            <Card>
              <CardHeader>
                <CardTitle>📊 API响应信息</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📝 内容渲染测试 ({chunks.length} 个chunks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chunks.map((chunk, index) => (
                <div key={chunk.id} className="border rounded p-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    Chunk {index + 1}: ID {chunk.id} | Index: {chunk.index} | Type: {chunk.type}
                  </div>
                  <div className="border-t pt-2">
                    <ChunkItem chunk={chunk} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🛠️ 调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>当前Token:</strong> {getCookie("accessToken") ? "已存在" : "未找到"}</p>
            <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}</p>
            <p><strong>测试Content ID:</strong> {contentId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 