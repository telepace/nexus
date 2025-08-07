"use client";

import React, { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";

/**
 * 静态分析卡片组件 - 专为Preview模式设计
 * 
 * 🎯 设计原则：
 * 1. 零JavaScript状态管理 - 避免重渲染导致的闪烁
 * 2. 纯CSS控制 - 使用CSS控制所有视觉状态
 * 3. 最小化交互 - 只保留必要的内容展示功能
 * 4. 性能优化 - 减少DOM操作和计算开销
 */

interface StaticAnalysisCardType {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "conversation";
    data: any;
  };
}

interface StaticAnalysisCardProps {
  card: StaticAnalysisCardType;
  contentId: string;
  defaultCollapsed?: boolean;
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
}

export const StaticAnalysisCard: React.FC<StaticAnalysisCardProps> = ({
  card,
  contentId,
  defaultCollapsed = false,
  onExpandLine,
}) => {
  // 渲染卡片内容 - 优化后的纯函数实现
  const cardContent = useMemo(() => {
    const { content: cardContentData } = card;
    
    if (cardContentData.type === "summary" || cardContentData.type === "keyPoints") {
      let textContent = "";
      
      if (typeof cardContentData.data === "string") {
        textContent = cardContentData.data;
      } else if (cardContentData.data && typeof cardContentData.data === "object") {
        textContent =
          cardContentData.data.text ||
          cardContentData.data.content ||
          cardContentData.data.summary ||
          JSON.stringify(cardContentData.data);
      }
      
      if (!textContent) return null;
      
      return (
        <div className="px-6 py-4 rounded-lg">
          <div className="select-text prose prose-sm max-w-none dark:prose-invert">
            <UniversalContentRenderer
              content={textContent}
              onExpandLine={onExpandLine}
              contentId={contentId}
              enableDelayedRendering={false}
            />
          </div>
        </div>
      );
    }
    
    // 处理对话类型内容
    if (cardContentData.type === "conversation" && cardContentData.data) {
      const conversation = cardContentData.data;
      
      // 如果是对话数据，只渲染AI的最后一条回复
      if (conversation.messages && Array.isArray(conversation.messages)) {
        // 获取最后一条AI消息
        const aiMessages = conversation.messages.filter((msg: any) => 
          msg.role === "assistant" && msg.content
        );
        
        if (aiMessages.length > 0) {
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          return (
            <div className="px-6 py-4 rounded-lg">
              <div className="select-text prose prose-sm max-w-none dark:prose-invert">
                <UniversalContentRenderer
                  content={lastAiMessage.content || ""}
                  onExpandLine={onExpandLine}
                  contentId={contentId}
                  enableDelayedRendering={false}
                />
              </div>
            </div>
          );
        }
        
        // 如果没有AI消息，显示提示
        return (
          <div className="px-6 py-4">
            <div className="text-sm text-muted-foreground">正在等待AI回复...</div>
          </div>
        );
      }
      
      // 如果有summary，作为备选渲染
      if (conversation.summary) {
        return (
          <div className="px-6 py-4 rounded-lg">
            <div className="select-text prose prose-sm max-w-none dark:prose-invert">
              <UniversalContentRenderer
                content={conversation.summary}
                onExpandLine={onExpandLine}
                contentId={contentId}
                enableDelayedRendering={false}
              />
            </div>
          </div>
        );
      }
    }
    
    return null;
  }, [card.content, contentId, onExpandLine]);

  return (
    <>
      <style jsx>{`
        /* 静态卡片样式 - 纯CSS控制，无JavaScript状态依赖 */
        .static-card {
          transition: none;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(229, 231, 235, 0.8);
        }
        
        .static-card:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(229, 231, 235, 1);
        }
        
        /* 暗色模式 */
        .dark .static-card {
          background: rgba(23, 23, 23, 0.6);
          border-color: rgba(64, 64, 64, 0.8);
        }
        
        .dark .static-card:hover {
          background: rgba(23, 23, 23, 0.8);
          border-color: rgba(64, 64, 64, 1);
        }
        
        /* 折叠控制 - 使用CSS target伪选择器 */
        .static-card-content {
          max-height: none;
          opacity: 1;
          overflow: visible;
        }
        
        .static-card.collapsed .static-card-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
        }
        
        /* 移除所有过渡动画，避免闪烁 */
        .static-card * {
          transition: none !important;
        }
      `}</style>
      
      <div className={`static-card ${defaultCollapsed ? 'collapsed' : ''}`}>
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="px-12 py-4">
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{card.emoji}</span>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {card.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* 简化的折叠按钮 - 仅视觉显示，无实际功能 */}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 text-neutral-400 pointer-events-none"
              >
                {defaultCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 卡片内容 */}
            <div className="static-card-content">
              {cardContent}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};