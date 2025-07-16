"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import { toast } from "@/hooks/use-toast";

// 原文段落数据结构
export interface SourceParagraph {
  id: string;
  index: number; // 段落在原文中的序号
  content: string;
  title?: string; // 所属章节标题
  startOffset?: number; // 字符偏移量开始位置
  endOffset?: number; // 字符偏移量结束位置
  chunkId?: string; // 对应的chunk ID
  metadata?: Record<string, any>;
}

// 引用信息
export interface ReferenceInfo {
  refId: number;
  paragraphId: string;
  relevanceScore?: number;
  snippet?: string; // 引用的具体文本片段
}

// 引用管理器状态
interface ReferenceManagerState {
  sourceParagraphs: SourceParagraph[];
  currentContentId?: string;
  highlightedParagraphs: Set<number>;
  selectedReference?: number;
}

// 引用管理器方法
interface ReferenceManagerActions {
  loadSourceParagraphs: (contentId: string) => Promise<void>;
  jumpToParagraph: (refId: number) => void;
  highlightParagraphs: (refIds: number[]) => void;
  clearHighlights: () => void;
  parseReferences: (refString?: string) => number[];
  getReferenceInfo: (refId: number) => ReferenceInfo | undefined;
}

// Context类型
interface ReferenceManagerContextType {
  state: ReferenceManagerState;
  actions: ReferenceManagerActions;
}

const ReferenceManagerContext = createContext<
  ReferenceManagerContextType | undefined
>(undefined);

// Hook for using reference manager
export const useReferenceManager = () => {
  const context = useContext(ReferenceManagerContext);
  if (!context) {
    throw new Error(
      "useReferenceManager must be used within a ReferenceManagerProvider",
    );
  }
  return context;
};

// 安全的 ReferenceManager hook，在没有Provider时返回默认行为
export const useReferenceManagerSafe = () => {
  try {
    return useReferenceManager();
  } catch {
    // 返回默认的空实现
    return {
      state: {
        sourceParagraphs: [],
        currentContentId: undefined,
        highlightedParagraphs: new Set(),
        selectedReference: undefined,
      },
      actions: {
        loadSourceParagraphs: async () => {},
        jumpToParagraph: () => {},
        highlightParagraphs: () => {},
        clearHighlights: () => {},
        parseReferences: (refString?: string): number[] => {
          if (!refString) return [];
          return refString
            .split(",")
            .map((ref) => parseInt(ref.trim(), 10))
            .filter((num) => !isNaN(num));
        },
        getReferenceInfo: () => undefined,
      },
    };
  }
};

// Provider组件
interface ReferenceManagerProviderProps {
  children: React.ReactNode;
  contentId?: string;
}

export const ReferenceManagerProvider: React.FC<
  ReferenceManagerProviderProps
> = ({ children, contentId }) => {
  const [state, setState] = useState<ReferenceManagerState>({
    sourceParagraphs: [],
    currentContentId: undefined,
    highlightedParagraphs: new Set(),
    selectedReference: undefined,
  });

  // 解析引用字符串为数字数组
  const parseReferences = useCallback((refString?: string): number[] => {
    if (!refString) return [];
    return refString
      .split(",")
      .map((ref) => parseInt(ref.trim(), 10))
      .filter((num) => !isNaN(num));
  }, []);

  // 加载原文段落数据
  const loadSourceParagraphs = useCallback(async (contentId: string) => {
    try {
      // 使用真实API或回退到模拟数据
      try {
        const { referenceApi } = await import("@/lib/api/reference");
        const referenceInfo =
          await referenceApi.getContentParagraphs(contentId);

        setState((prev) => ({
          ...prev,
          sourceParagraphs: referenceInfo.paragraphs,
          currentContentId: contentId,
        }));
        return;
      } catch (apiError) {
        console.warn("API not available, using mock data:", apiError);
      }

      // 回退到模拟数据
      const mockParagraphs: SourceParagraph[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `para-${i + 1}`,
          index: i + 1,
          content: `这是第${i + 1}段的内容。包含了重要的信息和观点，需要被AI分析引用。`,
          title: `章节 ${Math.floor(i / 10) + 1}`,
          startOffset: i * 50,
          endOffset: (i + 1) * 50,
          chunkId: `chunk-${Math.floor(i / 5)}`,
        }),
      );

      setState((prev) => ({
        ...prev,
        sourceParagraphs: mockParagraphs,
        currentContentId: contentId,
      }));
    } catch (error) {
      console.error("Failed to load source paragraphs:", error);
      toast({
        title: "加载失败",
        description: "无法加载原文段落信息",
        variant: "destructive",
      });
    }
  }, []);

  // 跳转到指定段落
  const jumpToParagraph = useCallback(
    (refId: number) => {
      console.log("🚀 ReferenceManager: jumpToParagraph called", {
        refId,
        sourceParagraphs: state.sourceParagraphs.length,
      });

      // 查找段落 - 支持多种索引匹配方式
      let paragraph = state.sourceParagraphs.find((p) => p.index === refId);

      // 如果没找到，尝试其他匹配方式
      if (!paragraph && refId > 0) {
        // 尝试 refId-1 匹配（适用于 0-based index）
        paragraph = state.sourceParagraphs.find((p) => p.index === refId - 1);
      }

      // 如果还是没找到，按数组索引查找
      if (!paragraph && refId > 0 && refId <= state.sourceParagraphs.length) {
        paragraph = state.sourceParagraphs[refId - 1];
      }

      if (!paragraph) {
        console.warn("⚠️ ReferenceManager: 段落未找到", {
          refId,
          availableParagraphs: state.sourceParagraphs.map((p) => p.index),
          paragraphCount: state.sourceParagraphs.length,
        });
        toast({
          title: "段落未找到",
          description: `无法找到第${refId}段`,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ ReferenceManager: 找到段落", { paragraph });

      // 发送跳转事件
      const event = new CustomEvent("jumpToParagraph", {
        detail: {
          paragraphId: paragraph.id,
          refId,
          paragraph,
        },
      });

      console.log("📡 ReferenceManager: 发送跳转事件", event.detail);
      window.dispatchEvent(event);

      // 更新状态
      setState((prev) => ({
        ...prev,
        selectedReference: refId,
        highlightedParagraphs: new Set([refId]),
      }));

      console.log("🎯 ReferenceManager: 状态已更新", {
        selectedReference: refId,
        highlightedParagraphs: [refId],
      });

      toast({
        title: "已跳转",
        description: `跳转到第${refId}段：${paragraph.title || ""}`,
      });
    },
    [state.sourceParagraphs],
  );

  // 高亮多个段落
  const highlightParagraphs = useCallback(
    (refIds: number[]) => {
      // 验证引用ID - 支持多种索引匹配方式
      const validRefs = refIds.filter((refId) => {
        // 直接匹配index
        if (state.sourceParagraphs.some((p) => p.index === refId)) {
          return true;
        }
        // 尝试 refId-1 匹配（适用于 0-based index）
        if (
          refId > 0 &&
          state.sourceParagraphs.some((p) => p.index === refId - 1)
        ) {
          return true;
        }
        // 按数组索引验证
        if (refId > 0 && refId <= state.sourceParagraphs.length) {
          return true;
        }
        return false;
      });

      console.log("🎨 ReferenceManager: highlightParagraphs", {
        requestedRefs: refIds,
        validRefs,
        availableIndexes: state.sourceParagraphs
          .map((p) => p.index)
          .slice(0, 10),
      });

      setState((prev) => ({
        ...prev,
        highlightedParagraphs: new Set(validRefs),
      }));

      // 发送高亮事件
      const event = new CustomEvent("highlightParagraphs", {
        detail: { refIds: validRefs },
      });
      window.dispatchEvent(event);
    },
    [state.sourceParagraphs],
  );

  // 清除高亮
  const clearHighlights = useCallback(() => {
    setState((prev) => ({
      ...prev,
      highlightedParagraphs: new Set(),
      selectedReference: undefined,
    }));

    const event = new CustomEvent("clearHighlights", {});
    window.dispatchEvent(event);
  }, []);

  // 获取引用信息
  const getReferenceInfo = useCallback(
    (refId: number): ReferenceInfo | undefined => {
      const paragraph = state.sourceParagraphs.find((p) => p.index === refId);
      if (!paragraph) return undefined;

      return {
        refId,
        paragraphId: paragraph.id,
        snippet:
          paragraph.content.length > 100
            ? `${paragraph.content.substring(0, 97)}...`
            : paragraph.content,
      };
    },
    [state.sourceParagraphs],
  );

  // 自动加载内容段落
  useEffect(() => {
    if (contentId && contentId !== state.currentContentId) {
      loadSourceParagraphs(contentId);
    }
  }, [contentId, state.currentContentId, loadSourceParagraphs]);

  const actions: ReferenceManagerActions = {
    loadSourceParagraphs,
    jumpToParagraph,
    highlightParagraphs,
    clearHighlights,
    parseReferences,
    getReferenceInfo,
  };

  return (
    <ReferenceManagerContext.Provider value={{ state, actions }}>
      {children}
    </ReferenceManagerContext.Provider>
  );
};

// 引用指示器组件 - 增强版
interface EnhancedReferenceIndicatorProps {
  references: number[];
  onReferenceClick?: (refId: number) => void;
  className?: string;
  showTooltip?: boolean;
  maxVisible?: number;
}

export const EnhancedReferenceIndicator: React.FC<
  EnhancedReferenceIndicatorProps
> = ({
  references,
  onReferenceClick,
  className = "",
  showTooltip = true,
  maxVisible = 3,
}) => {
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  if (references.length === 0) return null;

  const handleClick = (refId: number) => {
    onReferenceClick?.(refId);
    actions.jumpToParagraph(refId);
  };

  const visibleRefs = references.slice(0, maxVisible);
  const hiddenCount = Math.max(0, references.length - maxVisible);

  return (
    <div className={`inline-flex items-center gap-1 ml-2 ${className}`}>
      {visibleRefs.map((refId) => {
        const refInfo = actions.getReferenceInfo(refId);

        return (
          <div key={refId} className="relative group">
            <button
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
              onClick={() => handleClick(refId)}
              title={`跳转到第${refId}段`}
            >
              {refId}
            </button>

            {/* Tooltip */}
            {showTooltip && refInfo && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
                <div className="font-medium mb-1">引用 #{refId}</div>
                <div className="text-gray-300 dark:text-gray-600 line-clamp-2">
                  {refInfo.snippet}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
              </div>
            )}
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

// 段落高亮样式工具
export const createParagraphHighlightStyles = () => {
  return `
    .paragraph-highlight {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.1) 0%, 
        rgba(59, 130, 246, 0.05) 100%);
      border-left: 3px solid rgb(59, 130, 246);
      padding-left: 12px;
      margin-left: -15px;
      border-radius: 0 4px 4px 0;
      transition: all 0.3s ease;
    }
    
    .paragraph-highlight.selected {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.2) 0%, 
        rgba(59, 130, 246, 0.1) 100%);
      border-left-color: rgb(37, 99, 235);
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
    }
    
    .paragraph-highlight:hover {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.15) 0%, 
        rgba(59, 130, 246, 0.08) 100%);
    }
  `;
};
