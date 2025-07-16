"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompactQuestionDisplayProps {
  /** 用户提问内容 */
  question: string;
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
  /** 展示变体 */
  variant?: "default" | "minimal" | "bubble";
}

export function CompactQuestionDisplay({
  question,
  showCopyButton = true,
  showUserIcon = true,
  collapseThreshold = 120,
  previewLength = 80,
  className,
  defaultExpanded = false,
  variant = "default",
}: CompactQuestionDisplayProps) {
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

  // 变体样式
  const variantStyles = {
    default: "bg-muted/50 border border-border rounded-lg p-3",
    minimal: "bg-background border-l-4 border-primary/30 pl-3 py-2",
    bubble: "bg-primary/5 border border-primary/20 rounded-2xl p-3",
  };

  // 如果不需要折叠，直接显示简化版本
  if (!needsCollapse) {
    return (
      <div className={cn(variantStyles[variant], className)}>
        <div className="flex items-start gap-2">
          {showUserIcon && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted mt-0.5">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {question}
            </div>
          </div>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 需要折叠的版本
  return (
    <div className={cn(variantStyles[variant], className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-start gap-2">
          {showUserIcon && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted mt-0.5">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* 问题内容 */}
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {isExpanded ? question : previewText}
            </div>

            {/* 展开按钮和字符数 */}
            <div className="flex items-center gap-2 mt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <ChevronDown
                    className={cn(
                      "h-2.5 w-2.5 mr-1 transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                  {isExpanded ? "收起" : "展开"}
                </Button>
              </CollapsibleTrigger>

              <Badge variant="outline" className="text-xs h-5">
                {question.length}字
              </Badge>
            </div>
          </div>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>

        <CollapsibleContent>{/* 折叠内容已在上面处理 */}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}
