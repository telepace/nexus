"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "./card";
import { Badge } from "./badge";
import { Quote, ExternalLink, X } from "lucide-react";
import { useReferenceManagerSafe } from "./ReferenceManager";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ModernReferenceIndicatorProps {
  references: number[];
  className?: string;
  contentId?: string;
  onReferenceClick?: (refId: number) => void;
}

interface ReferenceDetailModalProps {
  refId: number;
  isOpen: boolean;
  onClose: () => void;
  contentId?: string;
}

/**
 * 🎯 现代化引用详情模态框
 *
 * 设计理念：
 * - 点击触发，不自动悬浮
 * - 精美的卡片设计
 * - 合适的位置和动画
 */
const ReferenceDetailModal: React.FC<ReferenceDetailModalProps> = ({
  refId,
  isOpen,
  onClose,
  contentId,
}) => {
  const { actions } = useReferenceManagerSafe();
  const [referenceInfo, setReferenceInfo] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen && refId) {
      // 加载引用详情
      const loadReference = async () => {
        try {
          const info = await actions.getEnhancedReferenceInfo(refId, contentId);
          setReferenceInfo(info);
        } catch (error) {
          console.error("加载引用失败:", error);
        }
      };
      loadReference();
    }
  }, [isOpen, refId, contentId, actions]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 引用详情卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            drag
            dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
            dragElastic={0.05}
            whileDrag={{ scale: 1.02, rotateZ: 0.5 }}
            dragMomentum={false}
            onDragStart={(e) => {
              // 只允许从头部区域开始拖动
              const target = e.target as HTMLElement;
              const cardHeader = target.closest("[data-drag-handle]");
              if (!cardHeader) {
                e.preventDefault();
                return false;
              }
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw] max-h-[80vh]"
          >
            <Card className="shadow-lg border border-gray-100/50 dark:border-gray-800/50 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md h-full flex flex-col overflow-hidden">
              <CardHeader className="pb-4 flex-shrink-0" data-drag-handle>
                <div className="flex items-center justify-between cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-200/50 dark:border-blue-400/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {refId}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      原文引用
                    </h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 防止触发拖动
                      onClose();
                    }}
                    className="w-6 h-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* 拖动提示条 */}
                <div className="flex justify-center mt-2 cursor-grab active:cursor-grabbing">
                  <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                {referenceInfo ? (
                  <>
                    {/* 可滚动内容区域 */}
                    <div
                      className="flex-1 overflow-y-auto scrollbar-thin pr-2 min-h-0"
                      style={{ minHeight: "200px", maxHeight: "400px" }}
                    >
                      <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed p-1">
                        {referenceInfo.snippet || referenceInfo.content ? (
                          <MarkdownRenderer
                            content={
                              referenceInfo.content || referenceInfo.snippet
                            }
                            className="prose-sm prose-gray dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-4"
                            disableInlineReferences={true}
                          />
                        ) : (
                          <div className="space-y-2">
                            <p className="text-gray-700 dark:text-gray-300">
                              这是第 {refId}{" "}
                              段的引用内容。该段落包含了重要的信息和观点，为AI分析提供了关键的支撑数据。
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              内容经过智能处理和格式化，确保为用户提供最佳的阅读体验。您可以通过下方的按钮跳转到原文位置查看完整内容。
                            </p>
                            <p className="text-gray-500 dark:text-gray-500 text-xs">
                              这是模拟的引用内容，用于演示滚动和拖动功能的效果。在实际应用中，这里会显示真实的引用段落内容。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 固定底部按钮 */}
                    <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 防止触发拖动
                          actions.jumpToParagraph(refId);
                          onClose();
                        }}
                        className="w-full py-2 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                      >
                        定位原文
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <div className="w-4 h-4 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * 🎯 现代化引用指示器
 *
 * 设计理念：
 * - 简洁优雅的视觉指示
 * - 不自动悬浮干扰用户
 * - 点击触发详情模态框
 */
export const ModernReferenceIndicator: React.FC<
  ModernReferenceIndicatorProps
> = ({ references, className, contentId, onReferenceClick }) => {
  const [activeRefId, setActiveRefId] = useState<number | null>(null);

  if (!references || references.length === 0) {
    return null;
  }

  const handleReferenceClick = (refId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setActiveRefId(refId);
    onReferenceClick?.(refId);
  };

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        {references.slice(0, 3).map((refId) => (
          <button
            key={refId}
            onClick={(e) => handleReferenceClick(refId, e)}
            className={cn(
              "w-4 h-4 rounded-full text-[10px] font-medium transition-all duration-150",
              "bg-blue-50 dark:bg-blue-900/30",
              "border border-blue-200/50 dark:border-blue-400/20",
              "text-blue-600 dark:text-blue-300",
              "hover:bg-blue-100 dark:hover:bg-blue-800/40",
              "hover:border-blue-300/60 dark:hover:border-blue-400/30",
              "active:scale-95",
              "focus:outline-none",
            )}
          >
            {refId}
          </button>
        ))}

        {references.length > 3 && (
          <div className="w-4 h-4 rounded-full bg-gray-50 dark:bg-gray-800/50 text-[9px] font-medium text-gray-400 dark:text-gray-500 flex items-center justify-center border border-gray-200/50 dark:border-gray-700/30">
            +{references.length - 3}
          </div>
        )}
      </div>

      {/* 引用详情模态框 */}
      <ReferenceDetailModal
        refId={activeRefId || 0}
        isOpen={activeRefId !== null}
        onClose={() => setActiveRefId(null)}
        contentId={contentId}
      />
    </>
  );
};

export default ModernReferenceIndicator;
