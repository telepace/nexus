"use client";

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, ExternalLink, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCachedSegmentsByRef,
  formatSegmentPreview,
  parseReferenceString,
  type ContentSegment
} from '@/lib/api/segments';
import { motion } from 'framer-motion';

// 原文段落数据结构
export interface SourceParagraph {
  id: string;
  content_item_id: string;
  display_number: number; // 段落显示序号（1-based）
  content: string;
  start_offset?: number; // 在原文中的起始字符位置
  end_offset?: number; // 在原文中的结束字符位置
  created_at: string;
  updated_at: string;
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
  highlightParagraphs: (refIds: number[], isHover?: boolean) => void;
  clearHighlights: () => void;
  parseReferences: (refString?: string) => number[];
  getReferenceInfo: (refId: number) => ReferenceInfo | undefined;
  setTestSourceParagraphs?: (paragraphs: SourceParagraph[]) => void; // 用于测试
}

// Context类型
interface ReferenceManagerContextType {
  state: ReferenceManagerState;
  actions: ReferenceManagerActions;
}

const ReferenceManagerContext = createContext<ReferenceManagerContextType | undefined>(undefined);

// Hook for using reference manager
export const useReferenceManager = () => {
  const context = useContext(ReferenceManagerContext);
  if (!context) {
    throw new Error("useReferenceManager must be used within a ReferenceManagerProvider");
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

          const refs: number[] = [];

          refString.split(',').forEach(segment => {
            const part = segment.trim();
            if (!part) return;

            if (part.includes('-')) {
              const [startStr, endStr] = part.split('-').map(s => s.trim());
              const start = parseInt(startStr, 10);
              const end = parseInt(endStr, 10);
              if (!isNaN(start) && !isNaN(end)) {
                const [from, to] = start <= end ? [start, end] : [end, start];
                for (let i = from; i <= to; i++) refs.push(i);
              }
            } else {
              const num = parseInt(part, 10);
              if (!isNaN(num)) refs.push(num);
            }
          });

          return Array.from(new Set(refs)).sort((a, b) => a - b);
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

export const ReferenceManagerProvider: React.FC<ReferenceManagerProviderProps> = ({
  children,
  contentId,
}) => {
  const [state, setState] = useState<ReferenceManagerState>({
    sourceParagraphs: [],
    currentContentId: undefined,
    highlightedParagraphs: new Set(),
    selectedReference: undefined,
  });

  // 解析引用字符串为数字数组
  const parseReferences = useCallback((refString?: string): number[] => {
    if (!refString) return [];

    const refs: number[] = [];

    refString.split(',').forEach(segment => {
      const part = segment.trim();
      if (!part) return;

      // 区间格式 例如 "6-24"
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const [from, to] = start <= end ? [start, end] : [end, start];
          for (let i = from; i <= to; i++) {
            refs.push(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) refs.push(num);
      }
    });

    // 去重并按升序排序
    return Array.from(new Set(refs)).sort((a, b) => a - b);
  }, []);

  // 加载原文段落数据
  const loadSourceParagraphs = useCallback(async (contentId: string) => {
    try {
      // 使用真实API或回退到模拟数据
      try {
        const { referenceApi } = await import("@/lib/api/reference");
        const referenceInfo = await referenceApi.getContentParagraphs(contentId);
        
        setState(prev => ({
          ...prev,
          sourceParagraphs: referenceInfo.segments,
          currentContentId: contentId,
        }));
        return;
      } catch (apiError) {
        console.warn("API not available, using mock data:", apiError);
      }

      // 回退到模拟数据
      const mockParagraphs: SourceParagraph[] = Array.from({ length: 100 }, (_, i) => ({
        id: `para-${i + 1}`,
        content_item_id: contentId,
        display_number: i + 1,
        content: `这是第${i + 1}段的内容。包含了重要的信息和观点，需要被AI分析引用。`,
        start_offset: i * 50,
        end_offset: (i + 1) * 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setState(prev => ({
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
  const jumpToParagraph = useCallback(async (refId: number) => {
    console.log('🚀 ReferenceManager: jumpToParagraph called', { refId, sourceParagraphs: state.sourceParagraphs.length });
    
    // 若段落尚未加载，尝试先加载
    if (state.sourceParagraphs.length === 0 && contentId) {
      console.log('⌛ 段落数据为空，尝试自动加载后再跳转');
      await loadSourceParagraphs(contentId);
    }

    // 查找段落 - 支持多种索引匹配方式
    let paragraph = state.sourceParagraphs.find(p => p.display_number === refId);
    
    // 如果没找到，尝试其他匹配方式
    if (!paragraph && refId > 0) {
      // 尝试 refId-1 匹配（适用于 0-based index）
      paragraph = state.sourceParagraphs.find(p => p.display_number === (refId - 1));
    }
    
    // 如果还是没找到，按数组索引查找
    if (!paragraph && refId > 0 && refId <= state.sourceParagraphs.length) {
      paragraph = state.sourceParagraphs[refId - 1];
    }
    
    if (!paragraph) {
      console.warn('⚠️ ReferenceManager: 段落未找到', { 
        refId, 
        availableParagraphs: state.sourceParagraphs.map(p => p.display_number),
        paragraphCount: state.sourceParagraphs.length
      });
      toast({
        title: "段落未找到",
        description: `无法找到第${refId}段`,
        variant: "destructive",
      });
      return;
    }

    console.log('✅ ReferenceManager: 找到段落', { paragraph });

    // 发送跳转事件
    const event = new CustomEvent('jumpToParagraph', {
      detail: {
        paragraphId: paragraph.id,
        refId,
        paragraph,
      }
    });
    
    console.log('📡 ReferenceManager: 发送跳转事件', event.detail);
    window.dispatchEvent(event);

    // 更新状态
    setState(prev => ({
      ...prev,
      selectedReference: refId,
      highlightedParagraphs: new Set([refId]),
    }));

    console.log('🎯 ReferenceManager: 状态已更新', { selectedReference: refId, highlightedParagraphs: [refId] });

    toast({
      title: "已跳转",
      description: `跳转到第${refId}段：${paragraph.content.substring(0, 100)}...`,
    });
  }, [state.sourceParagraphs, contentId, loadSourceParagraphs]);

  // 高亮多个段落
  const highlightParagraphs = useCallback((refIds: number[], isHover = false) => {
    // 验证引用ID - 支持多种索引匹配方式
    const validRefs = refIds.filter(refId => {
      // 直接匹配index
      if (state.sourceParagraphs.some(p => p.display_number === refId)) {
        return true;
      }
      // 尝试 refId-1 匹配（适用于 0-based index）
      if (refId > 0 && state.sourceParagraphs.some(p => p.display_number === (refId - 1))) {
        return true;
      }
      // 按数组索引验证
      if (refId > 0 && refId <= state.sourceParagraphs.length) {
        return true;
      }
      return false;
    });

    console.log('🎨 ReferenceManager: highlightParagraphs', { 
      requestedRefs: refIds, 
      validRefs,
      isHover,
      availableIndexes: state.sourceParagraphs.map(p => p.display_number).slice(0, 10)
    });

    setState(prev => ({
      ...prev,
      highlightedParagraphs: new Set(validRefs),
    }));

    // 发送高亮事件
    const event = new CustomEvent('highlightParagraphs', {
      detail: { refIds: validRefs, isHover }
    });
    window.dispatchEvent(event);
  }, [state.sourceParagraphs]);

  // 清除高亮
  const clearHighlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      highlightedParagraphs: new Set(),
      selectedReference: undefined,
    }));

    const event = new CustomEvent('clearHighlights', {});
    window.dispatchEvent(event);
  }, []);

  // 获取引用信息
  const getReferenceInfo = useCallback((refId: number): ReferenceInfo | undefined => {
    const paragraph = state.sourceParagraphs.find(p => p.display_number === refId);
    if (!paragraph) return undefined;

    return {
      refId,
      paragraphId: paragraph.id,
      snippet: paragraph.content.length > 100 
        ? `${paragraph.content.substring(0, 97)}...`
        : paragraph.content,
    };
  }, [state.sourceParagraphs]);

  // 设置测试数据（仅用于测试）
  const setTestSourceParagraphs = useCallback((paragraphs: SourceParagraph[]) => {
    console.log('🧪 ReferenceManager: setTestSourceParagraphs called', { 
      count: paragraphs.length,
      currentContentId: contentId,
      currentSourceParagraphsCount: state.sourceParagraphs.length,
      paragraphSample: paragraphs.slice(0, 2)
    });
    setState(prev => {
      const newState = {
        ...prev,
        sourceParagraphs: paragraphs,
        currentContentId: contentId,
      };
      console.log('🧪 ReferenceManager: setState called with new data', {
        newSourceParagraphsCount: newState.sourceParagraphs.length,
        newCurrentContentId: newState.currentContentId
      });
      return newState;
    });
  }, [contentId, state.sourceParagraphs.length]);

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
    setTestSourceParagraphs,
  };

  return (
    <ReferenceManagerContext.Provider value={{ state, actions }}>
      {children}
    </ReferenceManagerContext.Provider>
  );
};

// 引用指示器组件 - 增强版
interface EnhancedReferenceIndicatorProps {
  refString?: string; // 改为接收原始引用字符串，如 "6-24" 或 "6"
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  onJumpToReference?: (numbers: number[]) => void;
  contentId: string; // 必需，用于获取段落内容
  disabled?: boolean;
  maxPreviewLength?: number;
}

const ModernReferenceIndicator: React.FC<EnhancedReferenceIndicatorProps> = ({
  refString,
  className,
  variant = 'compact',
  onJumpToReference,
  contentId,
  disabled = false,
  maxPreviewLength = 150,
}) => {
  const [segments, setSegments] = useState<ContentSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const referenceNumbers = parseReferenceString(refString);
  
  // 如果没有引用，不渲染
  if (!refString || referenceNumbers.length === 0) {
    return null;
  }

  // 加载段落内容
  const loadSegments = useCallback(async () => {
    if (!contentId || !refString || segments.length > 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getCachedSegmentsByRef(contentId, refString);
      setSegments(response.segments);
      
      if (response.missing_numbers.length > 0) {
        console.warn('Missing segments:', response.missing_numbers);
      }
    } catch (err) {
      console.error('Failed to load segments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [contentId, refString, segments.length]);

  // 处理悬浮时加载内容和高亮段落
  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      loadSegments();
      
      // 高亮对应的段落
      const { actions } = useReferenceManagerSafe();
      if (referenceNumbers.length > 0) {
        actions.highlightParagraphs(referenceNumbers, true); // 传递 isHover=true
      }
    }
  }, [disabled, loadSegments, referenceNumbers]);

  // 处理悬浮离开时清除高亮
  const handleMouseLeave = useCallback(() => {
    if (!disabled) {
      const { actions } = useReferenceManagerSafe();
      actions.clearHighlights();
    }
  }, [disabled]);

  // 处理点击跳转
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    if (onJumpToReference) {
      onJumpToReference(referenceNumbers);
    } else {
      // 使用 ReferenceManager 的跳转功能
      const { actions } = useReferenceManagerSafe();
      if (referenceNumbers.length > 0) {
        actions.jumpToParagraph(referenceNumbers[0]); // 跳转到第一个段落
      }
    }
  }, [disabled, onJumpToReference, referenceNumbers]);

  // 生成显示标签
  const getDisplayLabel = () => {
    if (referenceNumbers.length === 0) return '';
    if (referenceNumbers.length === 1) return referenceNumbers[0].toString();
    
    // 检查是否为连续区间
    const sortedNumbers = [...referenceNumbers].sort((a, b) => a - b);
    const isConsecutive = sortedNumbers.every((num, index) => 
      index === 0 || num === sortedNumbers[index - 1] + 1
    );
    
    if (isConsecutive) {
      return `${sortedNumbers[0]}-${sortedNumbers[sortedNumbers.length - 1]}`;
    } else {
      // 非连续，显示省略形式
      if (sortedNumbers.length <= 3) {
        return sortedNumbers.join(',');
      } else {
        return `${sortedNumbers[0]},${sortedNumbers[1]}...+${sortedNumbers.length - 2}`;
      }
    }
  };

  // 渲染预览内容
  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-2 text-sm text-destructive">
          加载失败: {error}
        </div>
      );
    }
    
    if (segments.length === 0) {
      return (
        <div className="p-2 text-sm text-muted-foreground">
          暂无内容预览
        </div>
      );
    }
    
    const maxSegmentsToShow = isExpanded ? segments.length : Math.min(3, segments.length);
    const segmentsToShow = segments.slice(0, maxSegmentsToShow);
    
    return (
      <ScrollArea className={cn("max-h-80", isExpanded && "max-h-96")}>
        <div className="space-y-2 p-2">
          {segmentsToShow.map((segment) => (
            <div key={segment.id} className="border-l-2 border-primary/20 pl-3">
              <div className="text-xs font-medium text-primary mb-1">
                段落 {segment.display_number}
              </div>
              <div className="text-sm text-foreground leading-relaxed">
                {formatSegmentPreview(segment, maxPreviewLength)}
              </div>
            </div>
          ))}
          
          {segments.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-full mt-2 h-8 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  显示全部 ({segments.length} 个段落)
                </>
              )}
            </Button>
          )}
        </div>
      </ScrollArea>
    );
  };

  const displayLabel = getDisplayLabel();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-105 select-none",
              "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100",
              className
            )}
          >
            <span className="text-xs font-medium">{displayLabel}</span>
            {!disabled && <ExternalLink className="ml-1 h-3 w-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-md p-0 border-0 bg-background/95 backdrop-blur-sm"
          sideOffset={8}
        >
          <Card className="border shadow-lg">
            <CardContent className="p-0">
              <div className="border-b bg-muted/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">段落引用</span>
                  <span className="text-xs text-muted-foreground">
                    {referenceNumbers.length === 1 
                      ? `段落 ${referenceNumbers[0]}` 
                      : `${referenceNumbers.length} 个段落`
                    }
                  </span>
                </div>
              </div>
              
              <div className="min-h-16">
                {renderPreviewContent()}
              </div>
              
              <div className="border-t bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  💡 点击跳转到对应段落
                </div>
              </div>
            </CardContent>
          </Card>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
   );
};

// 向后兼容的包装器 - 支持旧的 references 数组格式
interface LegacyEnhancedReferenceIndicatorProps {
  references: number[] | string[]; // 支持旧格式
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  onJumpToReference?: (numbers: number[]) => void;
  contentId?: string; // 旧版本中可能为可选
  disabled?: boolean;
  maxPreviewLength?: number;
}

// 向后兼容的引用指示器
export function LegacyReferenceIndicator(props: LegacyEnhancedReferenceIndicatorProps) {
  const { references, contentId, ...otherProps } = props;
  
  // 如果没有 contentId，显示简单版本
  if (!contentId) {
    // 优化显示逻辑：显示具体编号而不是简单计数
    const getDisplayText = () => {
      if (references.length === 0) return '';
      if (references.length === 1) return String(references[0]);
      
      // 确保所有引用都是数字类型
      const sortedNumbers = references
        .map(ref => typeof ref === 'number' ? ref : parseInt(String(ref), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);
      
      if (sortedNumbers.length === 0) return '';
      
      // 检查是否为连续区间
      const isConsecutive = sortedNumbers.every((num, index) => 
        index === 0 || num === sortedNumbers[index - 1] + 1
      );
      
      if (isConsecutive && sortedNumbers.length > 2) {
        return `${sortedNumbers[0]}-${sortedNumbers[sortedNumbers.length - 1]}`;
      } else if (sortedNumbers.length <= 3) {
        return sortedNumbers.join(',');
      } else {
        return `${sortedNumbers[0]},${sortedNumbers[1]}...+${sortedNumbers.length - 2}`;
      }
    };

    const displayText = getDisplayText();
    
    return (
      <span className="inline-flex items-center text-xs font-medium text-primary ml-1 cursor-pointer hover:underline transition-all duration-150">
        {displayText}
      </span>
    );
  }
  
  // 将旧格式转换为新格式
  const refString = references.map(r => String(r)).join(',');
  
  return (
    <ModernReferenceIndicator
      refString={refString}
      contentId={contentId}
      {...otherProps}
    />
  );
}

// 导出别名以保持向后兼容
export { LegacyReferenceIndicator as EnhancedReferenceIndicator };

/**
 * 增强的引用指示器组件
 * 提供更好的用户体验：
 * 1. 显示具体的段落编号而不是计数
 * 2. 悬浮预览引用内容
 * 3. 点击跳转到对应段落
 * 4. 支持多段落引用的折叠显示
 */
export interface NewEnhancedReferenceIndicatorProps {
  references: number[];
  contentId?: string;
  onReferenceClick?: (refId: number) => void;
  className?: string;
  variant?: 'compact' | 'detailed';
  maxPreviewItems?: number;
}

export const NewEnhancedReferenceIndicator: React.FC<NewEnhancedReferenceIndicatorProps> = ({
  references,
  contentId,
  onReferenceClick,
  className,
  variant = 'compact',
  maxPreviewItems = 3,
}) => {
  const [segments, setSegments] = useState<ContentSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // 确保引用是数字类型
  const validReferences = references
    .map(ref => typeof ref === 'number' ? ref : parseInt(String(ref), 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  if (validReferences.length === 0) return null;

  // 生成显示标签
  const getDisplayLabel = () => {
    if (validReferences.length === 1) return String(validReferences[0]);
    
    // 检查是否为连续区间
    const isConsecutive = validReferences.every((num, index) => 
      index === 0 || num === validReferences[index - 1] + 1
    );
    
    if (isConsecutive && validReferences.length > 2) {
      return `${validReferences[0]}-${validReferences[validReferences.length - 1]}`;
    } else if (validReferences.length <= 3) {
      return validReferences.join(',');
    } else {
      return `${validReferences[0]},${validReferences[1]}...+${validReferences.length - 2}`;
    }
  };

  // 加载段落内容
  const loadSegments = useCallback(async () => {
    if (!contentId || segments.length > 0 || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const refString = validReferences.join(',');
      const response = await getCachedSegmentsByRef(contentId, refString);
      setSegments(response.segments);
      
      if (response.missing_numbers.length > 0) {
        console.warn('Missing segments:', response.missing_numbers);
      }
    } catch (err) {
      console.error('Failed to load segments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [contentId, validReferences, segments.length, loading]);

  // 处理悬浮打开和高亮
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    const { actions } = useReferenceManagerSafe();
    
    if (open && contentId) {
      loadSegments();
      // 高亮对应的段落
      if (validReferences.length > 0) {
        actions.highlightParagraphs(validReferences, true); // 传递 isHover=true
      }
    } else {
      // 关闭时清除高亮
      actions.clearHighlights();
    }
  };

  // 处理按钮悬浮高亮（用于简化版本）
  const handleButtonMouseEnter = () => {
    const { actions } = useReferenceManagerSafe();
    if (validReferences.length > 0) {
      actions.highlightParagraphs(validReferences, true); // 传递 isHover=true
    }
  };

  const handleButtonMouseLeave = () => {
    const { actions } = useReferenceManagerSafe();
    actions.clearHighlights();
  };

  // 处理点击跳转
  const handleClick = (refId: number) => {
    if (onReferenceClick) {
      onReferenceClick(refId);
    } else {
      // 使用 ReferenceManager 的跳转功能
      const { actions } = useReferenceManagerSafe();
      actions.jumpToParagraph(refId);
    }
    setIsOpen(false);
  };

  const displayLabel = getDisplayLabel();

  // 简化版本（无 contentId 时）
  if (!contentId) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center text-xs font-medium text-primary ml-1",
              "cursor-pointer hover:underline transition-all duration-150",
              className
            )}
            onClick={() => validReferences.length === 1 && handleClick(validReferences[0])}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
          >
            {displayLabel}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>引用段落: {displayLabel}</p>
          {validReferences.length === 1 && <p className="text-xs text-muted-foreground">点击跳转</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  // 完整版本（有 contentId 时）
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center text-xs font-medium text-primary ml-1",
            "cursor-pointer hover:underline transition-all duration-150 group",
            className
          )}
        >
          <Quote className="h-3 w-3 mr-1 opacity-70" />
          {displayLabel}
          <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {/* 头部 */}
            <div className="border-b bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">段落引用</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {validReferences.length === 1 
                    ? `段落 ${validReferences[0]}` 
                    : `${validReferences.length} 个段落`
                  }
                </Badge>
              </div>
            </div>
            
            {/* 内容区域 */}
            <div className="max-h-80">
              {loading ? (
                <div className="flex items-center gap-2 p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">加载预览...</span>
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={loadSegments}
                  >
                    重试
                  </Button>
                </div>
              ) : segments.length > 0 ? (
                <ScrollArea className="max-h-60">
                  <div className="space-y-3 p-4">
                    {segments.slice(0, maxPreviewItems).map((segment) => (
                      <div 
                        key={segment.id} 
                        className="border-l-2 border-primary/20 pl-3 cursor-pointer hover:bg-muted/50 rounded-r-md p-2 transition-colors"
                        onClick={() => handleClick(segment.display_number)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-primary">
                            段落 {segment.display_number}
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-sm text-foreground leading-relaxed">
                          {formatSegmentPreview(segment, 120)}
                        </div>
                      </div>
                    ))}
                    
                    {segments.length > maxPreviewItems && (
                      <div className="text-center pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          还有 {segments.length - maxPreviewItems} 个段落...
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">暂无预览内容</p>
                </div>
              )}
            </div>
            
            {/* 底部提示 */}
            <div className="border-t bg-muted/30 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  💡 点击段落可跳转到原文
                </div>
                {validReferences.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    {validReferences.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

// 段落高亮样式工具
export const createParagraphHighlightStyles = () => {
  return `
    .paragraph-highlight {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.12) 0%, 
        rgba(59, 130, 246, 0.06) 100%);
      border-left: 3px solid rgb(59, 130, 246);
      padding-left: 12px;
      margin-left: -15px;
      border-radius: 0 6px 6px 0;
      transition: all 0.3s ease;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
    }
    
    .paragraph-highlight.selected {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.25) 0%, 
        rgba(59, 130, 246, 0.12) 100%);
      border-left-color: rgb(37, 99, 235);
      border-left-width: 4px;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
      transform: translateX(2px);
    }
    
    .paragraph-highlight:hover {
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.18) 0%, 
        rgba(59, 130, 246, 0.09) 100%);
      transform: translateX(1px);
    }
    
    /* 悬浮高亮的特殊样式 */
    .paragraph-highlight.hover-highlight {
      background: linear-gradient(90deg, 
        rgba(34, 197, 94, 0.12) 0%, 
        rgba(34, 197, 94, 0.06) 100%);
      border-left-color: rgb(34, 197, 94);
      box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
      animation: gentle-pulse 2s ease-in-out infinite;
    }
    
    @keyframes gentle-pulse {
      0%, 100% {
        box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
      }
      50% {
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
      }
    }
  `;
}; 