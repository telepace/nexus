"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Share, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { useCardHeight } from "@/hooks/use-card-height";
// 移除复杂的可见性管理hook，改用简单CSS hover
import type { ContentItemPublic } from "@/lib/api/content";

interface AnalysisCard {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "custom";
    data: any;
  };
}

interface AnalysisCardsContainerProps {
  cards: AnalysisCard[];
  content: ContentItemPublic;
  variant?: "preview" | "sidebar" | "fullscreen";
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  collapsedCards: Set<string>;
  onToggleCardCollapse: (cardId: string) => void;
  selectedBlock?: string | null;
  onBlockSelect?: (blockId: string | null) => void;
  // 新增：是否有活跃的AI对话
  hasActiveConversations?: boolean;
}

export const AnalysisCardsContainer: React.FC<AnalysisCardsContainerProps> = ({
  cards,
  content,
  variant = "fullscreen",
  onExpandLine,
  collapsedCards,
  onToggleCardCollapse,
  selectedBlock: externalSelectedBlock,
  onBlockSelect,
  hasActiveConversations = false,
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // 🎯 简化悬浮状态管理 - 移除复杂的useUnifiedVisibility，使用简单的CSS hover
  // 避免JavaScript状态管理与CSS transition冲突导致的闪烁

  // 使用外部传入的选中状态，如果没有传入则使用内部状态
  const selectedBlock = externalSelectedBlock;

  // 🎯 移除不必要的高度管理 - 所有模式都使用auto高度
  // 避免复杂的动态高度计算，简化为自适应高度
  const registerElement = () => {}; // 不再需要高度注册
  const getCardHeight = () => "auto"; // 返回auto高度标识

  // 稳定化 content.id，避免重复传递
  const stableContentId = useMemo(() => content?.id || "", [content?.id]);

  // 滚动检测 - Jobs式的细致体验优化（preview模式下禁用）
  useEffect(() => {
    // Preview模式下禁用全局滚动监听以提升性能
    if (variant === "preview") {
      return;
    }

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);

      // 清除之前的超时
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // 滚动停止150ms后重新启用动画
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    // 监听全局滚动和容器滚动
    window.addEventListener("scroll", handleScroll, { passive: true });
    const containers = document.querySelectorAll("[data-scrollable]");
    containers.forEach((container) => {
      container.addEventListener("scroll", handleScroll, { passive: true });
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      containers.forEach((container) => {
        container.removeEventListener("scroll", handleScroll);
      });
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [variant]);

  // 渲染卡片内容
  const renderCardContent = useCallback(
    (card: AnalysisCard) => {
      const { content: cardContent } = card;

      if (cardContent.type === "summary" || cardContent.type === "keyPoints") {
        let textContent = "";

        if (typeof cardContent.data === "string") {
          textContent = cardContent.data;
        } else if (cardContent.data && typeof cardContent.data === "object") {
          textContent =
            cardContent.data.text ||
            cardContent.data.content ||
            cardContent.data.summary ||
            JSON.stringify(cardContent.data);
        }

        if (!textContent) return null;

        return (
          <div
            className={`
            px-6 py-4 rounded-lg transition-all duration-200
            ${
              selectedBlock === `${card.id}-main`
                ? "linear-bg-1 opacity-90"
                : "hover:linear-bg-1"
            }
          `}
            onClick={(e) => {
              // 如果点击的是文本内容区域，处理块选择
              if (
                e.target instanceof HTMLElement &&
                e.target.closest(".select-text")
              ) {
                onBlockSelect?.(
                  selectedBlock === `${card.id}-main`
                    ? null
                    : `${card.id}-main`,
                );
              }
            }}
          >
            <div className="select-text prose prose-sm max-w-none dark:prose-invert">
              <UniversalContentRenderer
                content={textContent}
                onExpandLine={onExpandLine}
                contentId={stableContentId}
                enableDelayedRendering={false}
              />
            </div>
          </div>
        );
      }

      return null;
    },
    [selectedBlock, onExpandLine, onBlockSelect, stableContentId],
  );

  // 主卡片组件 - 简化悬浮状态管理
  const CardComponent = React.memo(
    ({ card }: { card: AnalysisCard }) => {
      const isSelected = selectedCard === card.id;
      const isCollapsed = collapsedCards.has(card.id);

      // 🔍 卡片渲染追踪日志
      const cardRenderCount = React.useRef(0);
      const prevCardState = React.useRef<any>({});

      cardRenderCount.current += 1;

      React.useEffect(() => {
        const currentState = {
          cardId: card.id,
          isSelected,
          isCollapsed,
          variant,
          cardTitle: card.title,
          hasContent: !!card.content?.data,
        };

        const changes = Object.keys(currentState).filter(
          (key) => prevCardState.current[key] !== currentState[key],
        );

        console.log(
          `📦 CardComponent [${card.id}] render #${cardRenderCount.current}:`,
          {
            ...currentState,
            changes: changes.length > 0 ? changes : "no state changes",
            timestamp: new Date().toISOString().split("T")[1],
            // 检查是否是折叠状态变化导致的渲染
            collapseChange:
              prevCardState.current.isCollapsed !== isCollapsed
                ? `${prevCardState.current.isCollapsed} → ${isCollapsed}`
                : null,
          },
        );

        prevCardState.current = currentState;
      });

      // 在Preview模式下完全禁用hover效果，避免状态管理开销
      const shouldShowHoverButtons = variant !== "preview";

      // 🚨 临时禁用ref回调以解决无限循环
      const elementRef = useCallback(
        (el: HTMLElement | null) => {
          // 临时禁用以解决问题
        },
        [], // Remove unnecessary dependencies
      );

      const handleClick = useCallback(() => {
        setSelectedCard(isSelected ? null : card.id);
      }, [isSelected, card.id]);

      return (
        <div
          className="group relative cursor-pointer"
          onClick={handleClick}
          data-exclude-selection
        >
          <Card
            className={`
          jobs-card-transition
          relative border-0 analysis-card
          ${isSelected ? "jobs-card-selected" : "jobs-card-idle"}
          ${variant === "preview" ? "jobs-card-preview" : ""}
        `}
          >
            <CardContent className="px-12 py-4">
              {/* 卡片头部 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{card.emoji}</span>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {card.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-row-reverse relative z-10">
                  <CollapsibleButton
                    isCollapsed={isCollapsed}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onToggleCardCollapse(card.id);
                    }}
                    size="md"
                    className="text-neutral-400 hover:text-neutral-600 relative z-10"
                  />

                  {/* 🎯 简化悬浮操作按钮 - 使用纯CSS group hover，避免JS状态冲突 */}
                  {shouldShowHoverButtons && (
                    <div
                      className={`
                      flex items-center gap-1 mr-1 relative z-10
                      transition-opacity duration-200 ease-out
                      group-hover:opacity-100 opacity-0
                    `}
                    >
                      <FavoriteButton
                        itemId={content?.id || ""}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 text-neutral-400 hover:text-neutral-600 relative z-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-neutral-400 hover:text-neutral-600 relative z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log("分享");
                        }}
                      >
                        <Share className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 🎯 卡片内容 - Preview模式禁用过渡动画，避免闪烁 */}
              <div
                className={`
              card-height-stable ${variant === "preview" ? "" : "transition-all duration-300"}
              ${isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100"}
            `}
                data-transitioning={isCollapsed ? "true" : "false"}
                style={{
                  // Preview模式直接显示/隐藏，不使用高度动画
                  maxHeight:
                    variant === "preview"
                      ? isCollapsed
                        ? 0
                        : "none"
                      : isCollapsed
                        ? 0
                        : "none",
                  height:
                    variant === "preview"
                      ? isCollapsed
                        ? 0
                        : "auto"
                      : isCollapsed
                        ? 0
                        : "auto",
                  // Preview模式下移除过渡延迟
                  transitionDelay: variant === "preview" ? "0ms" : "0ms",
                }}
              >
                <div
                  ref={elementRef}
                  className="card-content-inner preview-stable"
                >
                  {renderCardContent(card)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    },
    (prevProps, nextProps) => {
      // 自定义比较函数，避免不必要的重新渲染
      return (
        prevProps.card.id === nextProps.card.id &&
        prevProps.card.title === nextProps.card.title &&
        prevProps.card.content === nextProps.card.content
      );
    },
  );

  // 只有在没有卡片且没有活跃对话时才显示空状态
  if (cards.length === 0 && !hasActiveConversations) {
    return (
      <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            暂无分析结果，正在处理 ...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* 
         * Jobs-inspired Animation System
         * "Details are not details. They make the design."
         */
        
        .analysis-card {
          contain: layout style paint;
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }

        /* 🎯 优化核心过渡系统 - Preview模式禁用动画，避免闪烁 */
        .jobs-card-transition {
          transition: 
            transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
            box-shadow 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform-origin: center center;
          /* 移除background-color动画，避免与其他元素的opacity动画冲突 */
        }
        
        /* Preview模式下禁用所有过渡动画，防止输入时的闪烁 */
        .preview-mode .jobs-card-transition {
          transition: none !important;
        }
        
        .preview-mode .jobs-card-idle,
        .preview-mode .jobs-card-selected {
          transform: none !important;
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08) !important;
        }

        /* 静息状态 - 优雅的基础阴影 */
        .jobs-card-idle {
          transform: translateZ(0);
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08);
        }

        /* 悬浮状态 - 模拟纸张被轻抬的感觉 */
        .group:hover .jobs-card-idle {
          transform: translateY(-2px) translateZ(0) scale(1.005);
          box-shadow: 
            0 8px 24px rgba(0, 0, 0, 0.12),
            0 4px 8px rgba(0, 0, 0, 0.08),
            0 0 0 0.5px rgba(255, 255, 255, 0.05);
        }

        /* 选中状态 - 更明显的提升感 */
        .jobs-card-selected {
          transform: translateY(-1px) translateZ(0) scale(1.01);
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.15),
            0 6px 12px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .group:hover .jobs-card-selected {
          transform: translateY(-3px) translateZ(0) scale(1.01);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.18),
            0 8px 16px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        /* 预览模式专属 - 更细腻的背景变化 */
        .jobs-card-preview.jobs-card-idle {
          background: rgba(255, 255, 255, 0.6);
        }

        .group:hover .jobs-card-preview.jobs-card-idle {
          background: rgba(255, 255, 255, 0.85);
        }

        /* 暗色模式优化 */
        .dark .jobs-card-idle {
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.3),
            0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .dark .group:hover .jobs-card-idle {
          box-shadow: 
            0 8px 24px rgba(0, 0, 0, 0.35),
            0 4px 8px rgba(0, 0, 0, 0.25),
            0 0 0 0.5px rgba(255, 255, 255, 0.08);
        }

        .dark .jobs-card-selected {
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.4),
            0 6px 12px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.12);
        }

        .dark .group:hover .jobs-card-selected {
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.45),
            0 8px 16px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .dark .jobs-card-preview.jobs-card-idle {
          background: rgba(23, 23, 23, 0.6);
        }

        .dark .group:hover .jobs-card-preview.jobs-card-idle {
          background: rgba(23, 23, 23, 0.85);
        }

        /* 🎯 滚动时禁用动画，防止抖动 */
        .scrolling .jobs-card-transition {
          transition: none !important;
        }

        /* 🎯 优化性能 - 保守使用will-change，避免过度重绘 */
        .jobs-card-transition {
          will-change: auto;
        }
        
        /* 只在真正需要时启用硬件加速 */
        .group:hover .jobs-card-transition {
          will-change: transform, box-shadow;
        }
      `}</style>

      <div
        className={`space-y-6 ${
          variant === "preview" ? "max-w-2xl mx-auto preview-mode" : ""
        } ${isScrolling ? "scrolling" : ""}`}
        data-scrollable
      >
        {cards.map((card) => (
          <CardComponent key={card.id} card={card} />
        ))}
      </div>
    </>
  );
};
