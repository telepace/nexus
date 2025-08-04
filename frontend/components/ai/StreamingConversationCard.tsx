"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation"; // 🎯 添加路由检测
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { Loader2 } from "lucide-react";

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
  contentId?: string;
}

export const StreamingConversationCard = React.memo(function StreamingConversationCard({
  conversation,
  onExpandLine,
  onRetry,
  onDelete,
  className = "",
  contentId,
}: StreamingConversationCardProps) {
  const pathname = usePathname(); // 🎯 获取当前路由
  
  // 🎯 在/reader/页面默认折叠，其他页面默认展开
  const defaultCollapsed = pathname.includes("/reader/");
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 获取用户消息和AI消息
  const userMessage = conversation.find(msg => msg.role === "user");
  const assistantMessage = conversation.find(msg => msg.role === "assistant");

  if (!userMessage || !assistantMessage) {
    return null;
  }

  // 确定卡片标题 - 使用用户消息内容
  const cardTitle = userMessage.content;
  
  // 确定显示的内容
  const displayContent = assistantMessage.content;
  const isLoading = assistantMessage.status === "pending" || assistantMessage.status === "thinking";
  const isStreaming = assistantMessage.status === "streaming";
  const hasError = assistantMessage.status === "error";

  return (
    <div className="group relative">
      <Card className="transition-all duration-300 ease-in-out relative border-0 analysis-card shadow-sm linear-bg-1 group-hover:shadow-lg">
        <CardContent className="px-12 py-4">
          {/* 卡片头部 - 简化设计 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {cardTitle.length > 30 ? `${cardTitle.substring(0, 30)}...` : cardTitle}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  AI 回复
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-row-reverse relative z-10">
              <CollapsibleButton
                isCollapsed={isCollapsed}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsCollapsed(!isCollapsed);
                }}
                size="md"
                className="text-neutral-400 hover:text-neutral-600 relative z-10"
              />
            </div>
          </div>

          {/* 卡片内容 - 纯内容展示 */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
            style={{
              maxHeight: isCollapsed ? 0 : "none",
            }}
          >
            <div className="px-6 py-4 rounded-lg transition-all duration-200 hover:linear-bg-1">
              {hasError ? (
                <div className="text-center py-8 text-red-500">
                  <p className="text-sm">生成失败: {assistantMessage.error}</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : displayContent ? (
                <div className="select-text prose prose-sm max-w-none dark:prose-invert">
                  <UniversalContentRenderer
                    content={displayContent}
                    onExpandLine={onExpandLine}
                    enableDelayedRendering={false}
                    contentId={contentId}
                    enableEnhancedTooltip={!!contentId}
                  />
                  {/* 流式响应时的打字机光标 */}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-1 align-middle" />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，检查关键属性变化
  if (prevProps.conversation.length !== nextProps.conversation.length) {
    return false;
  }
  
  // 检查最后一条消息的状态变化（流式传输状态）
  const prevLastMessage = prevProps.conversation[prevProps.conversation.length - 1];
  const nextLastMessage = nextProps.conversation[nextProps.conversation.length - 1];
  
  if (prevLastMessage?.status !== nextLastMessage?.status ||
      prevLastMessage?.content !== nextLastMessage?.content) {
    return false;
  }
  
  return true;
});