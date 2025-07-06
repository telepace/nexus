"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Brain } from "lucide-react";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { isJsonlContent } from "@/hooks/use-ai-analysis";
import { toast } from "sonner";

export interface AIAnalysisDisplayProps {
  /** 分析标题 */
  title: string;
  /** 分析内容 */
  content: string;
  /** 自定义样式 */
  className?: string;
  /** 是否显示复制按钮 */
  showCopyButton?: boolean;
}

/**
 * AI 分析结果展示组件
 * 专门用于只读展示分析结果，支持 JSONL 和 Markdown 格式
 */
export function AIAnalysisDisplay({
  title,
  content,
  className,
  showCopyButton = true,
}: AIAnalysisDisplayProps) {
  
  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("内容已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 智能渲染内容
  const renderContent = () => {
    if (!content) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <div className="text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无分析内容</p>
          </div>
        </div>
      );
    }

    // 检测内容类型并选择合适的渲染器
    if (isJsonlContent(content)) {
      return <JsonlRenderer content={content} />;
    } else {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownRenderer content={content} />
        </div>
      );
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          
          {showCopyButton && content && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              title="复制内容"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <div className="min-h-[100px]">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}
