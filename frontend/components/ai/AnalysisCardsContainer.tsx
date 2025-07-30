"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Share, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { useCardHeight } from "@/hooks/use-card-height";
import { useUnifiedVisibility, visibilityPresets } from "@/hooks/use-unified-visibility";
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
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  // 使用统一的可见性管理替代单独的悬浮状态
  // 针对preview模式，使用更保守的可见性配置
  const hoverVisibility = useUnifiedVisibility({
    ...visibilityPresets.hover,
    fadeDuration: variant === "preview" ? 100 : 200, // 预览模式下更快的动画
    autoHideDelay: variant === "preview" ? 0 : 2000, // 预览模式下禁用自动隐藏
  });
  
  // 使用外部传入的选中状态，如果没有传入则使用内部状态
  const selectedBlock = externalSelectedBlock;

  // 动态高度管理
  const { registerElement, getCardHeight } = useCardHeight();

  // 渲染卡片内容
  const renderCardContent = useCallback((card: AnalysisCard) => {
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
            if (e.target instanceof HTMLElement && e.target.closest('.select-text')) {
              onBlockSelect?.(selectedBlock === `${card.id}-main` ? null : `${card.id}-main`);
            }
          }}
        >
          <div className="select-text prose prose-sm max-w-none dark:prose-invert">
            <UniversalContentRenderer
              content={textContent}
              onExpandLine={onExpandLine}
              contentId={content.id}
            />
          </div>
        </div>
      );
    }

    return null;
  }, [selectedBlock, onExpandLine, onBlockSelect]);

  // 主卡片组件 - 使用统一可见性管理
  const CardComponent = React.memo(({ card }: { card: AnalysisCard }) => {
    const isSelected = selectedCard === card.id;
    const hoverButtonsId = `card-hover-${card.id}`;
    const isHovered = hoverVisibility.isVisible(hoverButtonsId);
    const isCollapsed = collapsedCards.has(card.id);

    // 优化悬浮状态处理，使用统一可见性管理
    const handleMouseEnter = useCallback(() => {
      hoverVisibility.setVisible(hoverButtonsId, true, Date.now());
    }, [card.id, hoverButtonsId, hoverVisibility]);

    const handleMouseLeave = useCallback(() => {
      hoverVisibility.setVisible(hoverButtonsId, false);
    }, [hoverButtonsId, hoverVisibility]);

    const handleClick = useCallback(() => {
      setSelectedCard(isSelected ? null : card.id);
    }, [isSelected, card.id]);

    return (
      <div
        className="group relative cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-exclude-selection
      >
        <Card
          className={`
          transition-all duration-200 ease-out 
          relative border-0 analysis-card
          ${isSelected ? "shadow-lg linear-bg-1" : "shadow-sm linear-bg-1"}
          group-hover:shadow-lg
          transform-gpu will-change-transform
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

                {/* 优化悬浮操作按钮显示 - 使用统一可见性管理 */}
                <div 
                  className={hoverVisibility.getVisibilityClasses(
                    hoverButtonsId, 
                    "flex items-center gap-1 mr-1 relative z-10"
                  )}
                >
                  <FavoriteButton
                    itemId={content.id}
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
              </div>
            </div>

            {/* 卡片内容 - 使用稳定的高度过渡 */}
            <div
              className={`
              card-height-stable overflow-hidden
              ${isCollapsed ? "opacity-0" : "opacity-100"}
            `}
              data-transitioning={isCollapsed ? "true" : "false"}
              style={{
                maxHeight: isCollapsed ? 0 : `${getCardHeight(card.id, isCollapsed)}px`,
              }}
            >
              <div
                ref={(el) => {
                  // 使用微任务替代requestAnimationFrame，减少竞态条件
                  if (el) {
                    Promise.resolve().then(() => registerElement(card.id, el));
                  } else {
                    registerElement(card.id, null);
                  }
                }}
                className="card-content-inner preview-stable"
              >
                {renderCardContent(card)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  });

  if (cards.length === 0) {
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
        /* 性能优化样式 */
        .analysis-card {
          contain: layout style paint;
        }
        
        .analysis-card:hover {
          will-change: box-shadow;
        }
        
        .analysis-card:not(:hover) {
          will-change: auto;
        }
      `}</style>
      
      <div
        className={`space-y-6 ${
          variant === "preview" ? "max-w-2xl mx-auto" : ""
        }`}
      >
        {cards.map((card) => (
          <CardComponent key={card.id} card={card} />
        ))}
      </div>
    </>
  );
};