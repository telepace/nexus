"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getCookie } from "@/lib/utils";

export function StreamDebug() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [rawData, setRawData] = useState("");
  const [parsedContent, setParsedContent] = useState("");
  const [error, setError] = useState("");

  const testStream = async () => {
    setIsStreaming(true);
    setRawData("");
    setParsedContent("");
    setError("");

    try {
      const token = getCookie("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/content/c982e045-c638-4f45-bf17-9f47fbaf1432/analyze-ai-sdk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || "test-token"}`,
          },
          body: JSON.stringify({
            system_prompt: "请简短分析以下内容",
            user_prompt: "这是一段测试文本，用于验证流式响应。",
            model: "or-llama-3-1-8b-instruct",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let rawAccumulated = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawAccumulated += chunk + "\n---CHUNK---\n";
        setRawData(rawAccumulated);

        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("0:")) {
            const content = line.slice(3, -1);
            accumulated += content;
            setParsedContent(accumulated);
          } else if (line.startsWith("8:")) {
            console.log("完成信号:", line);
          } else if (line.startsWith("9:")) {
            console.log("错误信号:", line);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            流式响应调试
            {isStreaming && <Badge variant="outline">流式中...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testStream} disabled={isStreaming}>
            {isStreaming ? "流式中..." : "测试流式响应"}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm">错误: {error}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">解析后的内容:</h3>
            <Textarea
              value={parsedContent}
              readOnly
              rows={5}
              placeholder="解析后的内容将显示在这里..."
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">原始流数据:</h3>
            <Textarea
              value={rawData}
              readOnly
              rows={10}
              placeholder="原始流数据将显示在这里..."
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
