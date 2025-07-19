"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import {
  MessageSquare,
  Brain,
  User,
  Bot,
  Copy,
  Share,
  RefreshCw,
  Check,
  X,
  Loader2,
  Sparkles,
  Minus,
  Plus,
} from "lucide-react";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status: "pending" | "thinking" | "streaming" | "completed" | "error";
  error?: string;
  metadata?: {
    model?: string;
    promptTemplate?: string;
    [key: string]: any;
  };
}

interface StreamingConversationCardProps {
  conversation: ConversationMessage[];
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  onRetry?: (messageId: string) => void;
  onDelete?: (conversationId: string) => void;
  className?: string;
}

export function StreamingConversationCard({
  conversation,
  onExpandLine,
  onRetry,
  onDelete,
  className = "",
}: StreamingConversationCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const userMessage = conversation.find(msg => msg.role === "user");
  const assistantMessage = conversation.find(msg => msg.role === "assistant");

  // 自动滚动到新的内容
  useEffect(() => {
    if (assistantMessage?.status === "streaming" && cardRef.current) {
      cardRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
      });
    }
  }, [assistantMessage?.content, assistantMessage?.status]);

  // 复制内容
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  // 获取状态显示
  const getStatusInfo = () => {
    if (!assistantMessage) return null;

    switch (assistantMessage.status) {
      case "pending":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "准备中...",
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
        };
      case "thinking":
        return {
          icon: <Brain className="h-3 w-3 animate-pulse" />,
          text: "AI 正在思考...",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
        };
      case "streaming":
        return {
          icon: <Sparkles className="h-3 w-3 animate-pulse" />,
          text: "实时回复中...",
          color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        };
      case "completed":
        return {
          icon: <Check className="h-3 w-3" />,
          text: "已完成",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
        };
      case "error":
        return {
          icon: <X className="h-3 w-3" />,
          text: "发生错误",
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      ref={cardRef}
      className={`group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-muted-foreground/20">
        <CardContent className="p-6">
          {/* 卡片头部 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  AI 对话
                </h3>
                <p className="text-xs text-muted-foreground">
                  {userMessage ? formatDistanceToNow(userMessage.timestamp, {
                    addSuffix: true,
                    locale: zhCN,
                  }) : "刚刚"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 状态标识 */}
              {statusInfo && (
                <Badge variant="secondary" className={`text-xs ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span className="ml-1">{statusInfo.text}</span>
                </Badge>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                {/* 折叠按钮 */}
                <CollapsibleButton
                  isCollapsed={isCollapsed}
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />

                {/* 其他操作按钮 - 只在悬停时显示 */}
                {isHovered && (
                  <>
                    {assistantMessage?.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(assistantMessage.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {assistantMessage?.status === "error" && onRetry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRetry(assistantMessage.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 对话内容 */}
          <div className={`space-y-4 ${isCollapsed ? "hidden" : ""}`}>
            {/* 用户消息 */}
            {userMessage && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground">
                    {userMessage.content}
                  </p>
                </div>
              </div>
            )}

            {/* AI 回复 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1">
                {assistantMessage ? (
                  <div className="bg-muted/30 rounded-lg p-3">
                    {assistantMessage.status === "error" ? (
                      <div className="text-sm text-destructive">
                        <p className="font-medium">处理失败</p>
                        <p className="text-xs mt-1">{assistantMessage.error || "未知错误"}</p>
                      </div>
                    ) : assistantMessage.content ? (
                      <div className="text-sm text-foreground">
                        <UniversalContentRenderer
                          content={assistantMessage.content}
                          onExpandLine={onExpandLine}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {assistantMessage.status === "thinking" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>AI 正在思考，请稍候...</span>
                          </>
                        )}
                        {assistantMessage.status === "pending" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>正在准备回复...</span>
                          </>
                        )}
                        {assistantMessage.status === "streaming" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>正在生成回复...</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* 流式响应时的打字机效果光标 */}
                    {assistantMessage.status === "streaming" && assistantMessage.content && (
                      <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>等待AI回复...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 元数据信息 */}
          {assistantMessage?.metadata && !isCollapsed && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {assistantMessage.metadata.model && (
                  <span>模型: {assistantMessage.metadata.model}</span>
                )}
                {assistantMessage.metadata.promptTemplate && (
                  <span>模板: {assistantMessage.metadata.promptTemplate}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}