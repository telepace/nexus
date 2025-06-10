"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, Play, Square, Trash2 } from "lucide-react";

interface DebugLog {
  timestamp: Date;
  type: "info" | "error" | "success" | "warning";
  message: string;
}

export function StreamDebug() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [endpoint, setEndpoint] = useState("/api/stream/analysis");
  const [payload, setPayload] = useState(`{
  "contentId": "c982e045-c638-4f45-bf17-9f47fbaf1432",
  "instruction": "请分析这个内容",
  "model": "or-llama-3-1-8b-instruct"
}`);

  const addLog = (type: DebugLog["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date(),
        type,
        message,
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const startStreamTest = async () => {
    if (isStreaming) return;

    setIsStreaming(true);
    addLog("info", "开始流式测试...");

    try {
      const parsedPayload = JSON.parse(payload);
      addLog("info", `发送请求到: ${endpoint}`);
      addLog("info", `Payload: ${JSON.stringify(parsedPayload, null, 2)}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      addLog("success", "连接建立成功");

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          addLog("success", "流式响应完成");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理可能的多个消息
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            addLog("info", `收到数据: ${line}`);
          }
        }
      }
    } catch (error) {
      addLog("error", `错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const stopStream = () => {
    setIsStreaming(false);
    addLog("warning", "手动停止流式测试");
  };

  const getLogColor = (type: DebugLog["type"]) => {
    switch (type) {
      case "info":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            流式调试控制台
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">API 端点</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="输入API端点"
                disabled={isStreaming}
              />
            </div>
            <div className="space-y-2">
              <Label>控制</Label>
              <div className="flex gap-2">
                <Button
                  onClick={startStreamTest}
                  disabled={isStreaming}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isStreaming ? "进行中..." : "开始测试"}
                </Button>
                {isStreaming && (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    停止
                  </Button>
                )}
                <Button
                  onClick={clearLogs}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  清空日志
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payload">请求 Payload (JSON)</Label>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={8}
              disabled={isStreaming}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* 日志显示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>调试日志</span>
            <Badge variant="outline">{logs.length} 条记录</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无日志记录
                </p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <Badge className={getLogColor(log.type)} variant="outline">
                      {log.type.toUpperCase()}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono break-all">
                        {log.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 