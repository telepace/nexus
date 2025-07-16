"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, MessageSquare, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserQuestionDisplayProps {
  /** 用户提问内容 */
  question: string;
  /** 显示标题 */
  title?: string;
  /** 是否显示复制按钮 */
  showCopyButton?: boolean;
  /** 是否显示用户图标 */
  showUserIcon?: boolean;
  /** 自动折叠的字符数阈值 */
  collapseThreshold?: number;
  /** 预览字符数 */
  previewLength?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

export function UserQuestionDisplay({
  question,
  title = "用户提问",
  showCopyButton = true,
  showUserIcon = true,
  collapseThreshold = 200,
  previewLength = 150,
  className,
  defaultExpanded = false,
}: UserQuestionDisplayProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 判断是否需要折叠
  const needsCollapse = useMemo(() => {
    return question.length > collapseThreshold;
  }, [question, collapseThreshold]);

  // 获取预览文本
  const previewText = useMemo(() => {
    if (!needsCollapse) return question;

    // 智能截断：优先在句号、问号、感叹号处截断
    const truncated = question.substring(0, previewLength);
    const lastPunctuation = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("？"),
      truncated.lastIndexOf("！"),
      truncated.lastIndexOf("."),
    );

    if (lastPunctuation > previewLength * 0.6) {
      return truncated.substring(0, lastPunctuation + 1);
    }

    return truncated + "...";
  }, [question, needsCollapse, previewLength]);

  // 复制功能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(question);
      toast({
        title: "已复制",
        description: "问题内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 如果不需要折叠，直接显示简化版本
  if (!needsCollapse) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showUserIcon && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>

            {showCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {question}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 需要折叠的完整版本
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showUserIcon && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {question.length} 字符
            </Badge>
          </div>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {/* 预览内容 */}
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {isExpanded ? question : previewText}
          </div>

          {/* 展开/收起按钮 */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-3 h-8 px-3 text-xs">
              <ChevronDown
                className={cn(
                  "h-3 w-3 mr-1 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
              />
              {isExpanded
                ? "收起"
                : `展开全部 (+${question.length - previewText.length + 3}字)`}
            </Button>
          </CollapsibleTrigger>

          {/* 隐藏的完整内容 */}
          <CollapsibleContent>
            {/* 这里不需要额外内容，因为完整文本已经在上面显示了 */}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
