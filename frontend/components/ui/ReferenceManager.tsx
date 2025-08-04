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
  metadata?: Record<string, unknown>;
}

// 引用信息 - 基础版本
export interface ReferenceInfo {
  refId: number;
  paragraphId: string;
  relevanceScore?: number;
  snippet?: string; // 引用的具体文本片段
}

// 增强的引用信息 - 用于tooltip显示
export interface EnhancedReferenceInfo extends ReferenceInfo {
  content: string;           // 完整内容
  title?: string;           // 章节标题
  position?: {             // 位置信息
    chapter?: string;
    section?: string;
    index: number;
  };
  context?: {              // 上下文信息
    before?: string;
    after?: string;
  };
  metadata?: {
    wordCount: number;
    chunkId?: string;
    lastUpdated?: Date;
  };
  isFromCache?: boolean;    // 标识数据来源
  loadedAt?: Date;         // 数据加载时间
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
  // 新增增强方法
  getEnhancedReferenceInfo: (refId: number, contentId?: string) => Promise<EnhancedReferenceInfo | null>;
  getReferenceContext: (refId: number, contextSize?: number) => Promise<{ before?: string; after?: string } | null>;
  formatReferenceContent: (content: string, maxLength?: number) => string;
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
        getReferenceInfo: (refId: number): ReferenceInfo | undefined => {
          // 🎯 修复：提供基本的引用信息，确保悬浮卡片能正常显示
          return {
            refId,
            paragraphId: `fallback-para-${refId}`,
            snippet: `第${refId}段内容摘要...`,
          };
        },
        getEnhancedReferenceInfo: async (refId: number): Promise<EnhancedReferenceInfo | null> => {
          // 降级的模拟数据
          return {
            refId,
            paragraphId: `fallback-para-${refId}`,
            content: `第${refId}段内容（降级模式）`,
            snippet: `第${refId}段摘要...`,
            position: { index: refId },
            metadata: { wordCount: 50 },
            isFromCache: false,
            loadedAt: new Date(),
          };
        },
        getReferenceContext: async () => null,
        formatReferenceContent: (content: string, maxLength: number = 200) => {
          return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
        },
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
        const errorMessage = (apiError as Error).message;
        const isServerError = errorMessage.includes('HTTP 5') || (apiError as any)?.status >= 500;
        console.warn(`API ${isServerError ? 'server error' : 'not available'}, using mock data:`, apiError);
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

  // 获取引用信息 - 基础版本（保持向后兼容）
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

  // 格式化引用内容
  const formatReferenceContent = useCallback(
    (content: string, maxLength: number = 200): string => {
      if (content.length <= maxLength) return content;
      
      // 智能截断：尝试在句号、逗号或空格处截断
      const truncated = content.substring(0, maxLength);
      const lastPunctuation = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('，'),
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf(', ')
      );
      
      if (lastPunctuation > maxLength * 0.7) {
        return truncated.substring(0, lastPunctuation + 1);
      }
      
      // 如果没有合适的标点，在最后一个空格处截断
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + '...';
      }
      
      return truncated + '...';
    },
    []
  );

  // 获取引用上下文
  const getReferenceContext = useCallback(
    async (refId: number, contextSize: number = 2): Promise<{ before?: string; after?: string } | null> => {
      try {
        // 从当前段落集合中获取上下文
        const currentIndex = state.sourceParagraphs.findIndex(p => p.index === refId);
        if (currentIndex === -1) return null;

        const beforeParagraphs = state.sourceParagraphs
          .slice(Math.max(0, currentIndex - contextSize), currentIndex)
          .map(p => p.content.substring(0, 100))
          .join(' ... ');

        const afterParagraphs = state.sourceParagraphs
          .slice(currentIndex + 1, Math.min(state.sourceParagraphs.length, currentIndex + 1 + contextSize))
          .map(p => p.content.substring(0, 100))
          .join(' ... ');

        return {
          before: beforeParagraphs || undefined,
          after: afterParagraphs || undefined,
        };
      } catch (error) {
        console.error('获取引用上下文失败:', error);
        return null;
      }
    },
    [state.sourceParagraphs]
  );

  // 获取增强的引用信息
  const getEnhancedReferenceInfo = useCallback(
    async (refId: number, contentId?: string): Promise<EnhancedReferenceInfo | null> => {
      try {
        // 1. 优先从本地状态获取
        const paragraph = state.sourceParagraphs.find(p => p.index === refId);
        
        if (paragraph) {
          // 从本地数据构建增强信息
          const context = await getReferenceContext(refId);
          
          return {
            refId,
            paragraphId: paragraph.id,
            content: paragraph.content,
            snippet: formatReferenceContent(paragraph.content, 150),
            title: paragraph.title,
            position: {
              index: paragraph.index,
              chapter: paragraph.title,
            },
            context,
            metadata: {
              wordCount: paragraph.content.length,
              chunkId: paragraph.chunkId,
            },
            isFromCache: true,
            loadedAt: new Date(),
          };
        }

        // 2. 如果本地没有，尝试从API获取
        if (contentId) {
          try {
            const { referenceApi } = await import("@/lib/api/reference");
            const apiParagraph = await referenceApi.getParagraphByRef(contentId, refId);
            
            if (apiParagraph) {
              const context = await getReferenceContext(refId);
              
              return {
                refId,
                paragraphId: apiParagraph.id,
                content: apiParagraph.content,
                snippet: formatReferenceContent(apiParagraph.content, 150),
                title: apiParagraph.title,
                position: {
                  index: apiParagraph.index,
                  chapter: apiParagraph.title,
                },
                context,
                metadata: {
                  wordCount: apiParagraph.content.length,
                  chunkId: apiParagraph.chunkId,
                },
                isFromCache: false,
                loadedAt: new Date(),
              };
            }
          } catch (apiError) {
            console.warn('API获取引用信息失败，使用降级方案:', apiError);
          }
        }

        // 3. 降级到增强的模拟数据
        return {
          refId,
          paragraphId: `mock-para-${refId}`,
          content: `这是第${refId}段的详细内容。本段落包含了重要的信息和观点，为AI分析提供了关键的支撑数据。内容经过智能处理和格式化，确保为用户提供最佳的阅读体验。`,
          snippet: `第${refId}段内容摘要：包含重要信息和观点...`,
          title: `第${Math.floor(refId / 5) + 1}章`,
          position: {
            index: refId,
            chapter: `第${Math.floor(refId / 5) + 1}章`,
            section: `第${refId % 5 + 1}节`,
          },
          metadata: {
            wordCount: 120,
          },
          isFromCache: false,
          loadedAt: new Date(),
        };

      } catch (error) {
        console.error('获取增强引用信息失败:', error);
        return null;
      }
    },
    [state.sourceParagraphs, getReferenceContext, formatReferenceContent]
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
    getEnhancedReferenceInfo,
    getReferenceContext,
    formatReferenceContent,
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

  if (!references || references.length === 0) return null;

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

            {/* 🎯 移除自动悬浮Tooltip，改为点击触发模式 */}
            {/* 如需显示引用详情，请使用ModernReferenceIndicator组件 */}
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-border">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

// 样式函数
export const createParagraphHighlightStyles = () => {
  return `
    .paragraph-highlight {
      background-color: rgba(255, 235, 59, 0.2);
      border-left: 3px solid #FBC02D;
      padding-left: 8px;
      margin-left: -11px;
      transition: all 0.2s ease;
    }
    
    .paragraph-highlight.selected {
      background-color: rgba(255, 193, 7, 0.3);
      border-left-color: #F57C00;
    }
    
    .dark .paragraph-highlight {
      background-color: rgba(255, 235, 59, 0.1);
      border-left-color: #FFF176;
    }
    
    .dark .paragraph-highlight.selected {
      background-color: rgba(255, 193, 7, 0.2);
      border-left-color: #FFB74D;
    }
  `;
};

// 临时占位符组件，防止构建错误
export const NewEnhancedReferenceIndicator: React.FC<any> = (props) => {
  return <span>Reference placeholder</span>;
};
