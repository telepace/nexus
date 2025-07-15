"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Loader2, 
  ExternalLink, 
  Quote, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCachedSegmentsByRef,
  formatSegmentPreview,
  parseReferenceString,
  type ContentSegment
} from "@/lib/api/segments";
import { useReferenceManagerSafe } from "./ReferenceManager";
import { toast } from "@/hooks/use-toast";

export interface OptimizedReferenceIndicatorProps {
  /** 引用字符串，如 "6-24" 或 "6,8,10" */
  refString?: string;
  /** 引用数字数组 */
  references?: number[];
  /** 内容ID，用于获取段落内容 */
  contentId?: string;
  /** 样式类名 */
  className?: string;
  /** 显示变体 */
  variant?: 'tooltip' | 'popover' | 'simple';
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大预览长度 */
  maxPreviewLength?: number;
  /** 最大预览项目数 */
  maxPreviewItems?: number;
  /** 点击回调 */
  onReferenceClick?: (refId: number) => void;
  /** 是否自动加载内容 */
  autoLoad?: boolean;
}

interface ReferenceState {
  segments: ContentSegment[];
  loading: boolean;
  error: string | null;
  expanded: boolean;
}

export function OptimizedReferenceIndicator({
  refString,
  references: propReferences,
  contentId,
  className,
  variant = 'tooltip',
  disabled = false,
  maxPreviewLength = 120,
  maxPreviewItems = 3,
  onReferenceClick,
  autoLoad = false,
}: OptimizedReferenceIndicatorProps) {
  const [state, setState] = useState<ReferenceState>({
    segments: [],
    loading: false,
    error: null,
    expanded: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const loadingRef = useRef(false);
  const { actions } = useReferenceManagerSafe();

  // 解析引用数据
  const references = React.useMemo(() => {
    if (propReferences && propReferences.length > 0) {
      return propReferences.filter(ref => typeof ref === 'number' && ref > 0);
    }
    if (refString) {
      return parseReferenceString(refString);
    }
    return [];
  }, [propReferences, refString]);

  // 如果没有引用，不渲染
  if (references.length === 0) {
    return null;
  }

  // 生成显示标签
  const getDisplayLabel = useCallback(() => {
    if (references.length === 1) return String(references[0]);
    
    const sortedRefs = [...references].sort((a, b) => a - b);
    
    // 检查是否为连续区间
    const isConsecutive = sortedRefs.every((num, index) => 
      index === 0 || num === sortedRefs[index - 1] + 1
    );
    
    if (isConsecutive && sortedRefs.length > 2) {
      return `${sortedRefs[0]}-${sortedRefs[sortedRefs.length - 1]}`;
    } else if (sortedRefs.length <= 3) {
      return sortedRefs.join(',');
    } else {
      return `${sortedRefs[0]},${sortedRefs[1]}...+${sortedRefs.length - 2}`;
    }
  }, [references]);

  // 加载段落内容
  const loadSegments = useCallback(async () => {
    if (!contentId || loadingRef.current || state.segments.length > 0) {
      return;
    }

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const refString = references.join(',');
      const response = await getCachedSegmentsByRef(contentId, refString);
      
      setState(prev => ({
        ...prev,
        segments: response.segments,
        loading: false,
        error: null,
      }));

      if (response.missing_numbers.length > 0) {
        console.warn('Missing segments:', response.missing_numbers);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败';
      console.error('Failed to load segments:', err);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [contentId, references, state.segments.length]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && contentId && references.length > 0) {
      loadSegments();
    }
  }, [autoLoad, loadSegments]);

  // 处理悬浮加载
  const handleMouseEnter = useCallback(() => {
    if (!disabled && contentId && variant === 'tooltip') {
      loadSegments();
    }
  }, [disabled, contentId, variant, loadSegments]);

  // 处理弹窗打开
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open && !disabled && contentId && variant === 'popover') {
      loadSegments();
    }
  }, [disabled, contentId, variant, loadSegments]);

  // 处理点击跳转
  const handleClick = useCallback((refId: number) => {
    if (disabled) return;

    if (onReferenceClick) {
      onReferenceClick(refId);
    } else {
      actions.jumpToParagraph(refId);
    }

    if (variant === 'popover') {
      setIsOpen(false);
    }
  }, [disabled, onReferenceClick, actions, variant]);

  // 处理重试
  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, segments: [], error: null }));
    loadingRef.current = false;
    loadSegments();
  }, [loadSegments]);

  // 渲染预览内容
  const renderPreviewContent = useCallback(() => {
    if (state.loading) {
      return (
        <div className="flex items-center gap-2 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">加载预览...</span>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="p-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">加载失败</span>
          </div>
          <p className="text-xs text-muted-foreground">{state.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            重试
          </Button>
        </div>
      );
    }

    if (state.segments.length === 0) {
      return (
        <div className="p-3 text-center text-sm text-muted-foreground">
          暂无预览内容
        </div>
      );
    }

    const maxItems = state.expanded ? state.segments.length : Math.min(maxPreviewItems, state.segments.length);
    const segmentsToShow = state.segments.slice(0, maxItems);

    return (
      <div className="space-y-3 p-3">
        <AnimatePresence mode="wait">
          {segmentsToShow.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="border-l-2 border-primary/20 pl-3 cursor-pointer hover:bg-muted/50 rounded-r-md p-2 transition-colors group"
              onClick={() => handleClick(segment.display_number)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-primary">
                  段落 {segment.display_number}
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm text-foreground leading-relaxed">
                {formatSegmentPreview(segment, maxPreviewLength)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {state.segments.length > maxPreviewItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setState(prev => ({ ...prev, expanded: !prev.expanded }));
            }}
            className="w-full h-8 text-xs"
          >
            {state.expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                显示全部 ({state.segments.length} 个段落)
              </>
            )}
          </Button>
        )}
      </div>
    );
  }, [state, maxPreviewItems, maxPreviewLength, handleClick, handleRetry]);

  const displayLabel = getDisplayLabel();

  // 引用按钮
  const ReferenceButton = ({ onClick, onMouseEnter }: { onClick?: () => void; onMouseEnter?: () => void }) => (
    <motion.button
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
        "bg-primary/10 text-primary border border-primary/20 ml-1",
        "cursor-pointer hover:bg-primary/20 transition-all duration-200",
        "group relative",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
    >
      <Quote className="h-3 w-3 mr-1 opacity-70" />
      [{displayLabel}]
      {!disabled && (
        <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.button>
  );

  // 简化版本（无 contentId 时）
  if (!contentId || variant === 'simple') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ReferenceButton
            onClick={() => references.length === 1 && handleClick(references[0])}
          />
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">引用段落: {displayLabel}</p>
            {references.length === 1 && (
              <p className="text-xs text-muted-foreground">点击跳转</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Tooltip 版本
  if (variant === 'tooltip') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ReferenceButton
            onClick={() => references.length === 1 && handleClick(references[0])}
            onMouseEnter={handleMouseEnter}
          />
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
                    {references.length === 1 
                      ? `段落 ${references[0]}` 
                      : `${references.length} 个段落`
                    }
                  </span>
                </div>
              </div>
              
              <div className="min-h-16">
                {renderPreviewContent()}
              </div>
              
              <div className="border-t bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  💡 点击段落可跳转到原文
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Popover 版本
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ReferenceButton />
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
                  {references.length === 1 
                    ? `段落 ${references[0]}` 
                    : `${references.length} 个段落`
                  }
                </Badge>
              </div>
            </div>
            
            {/* 内容区域 */}
            <ScrollArea className="max-h-80">
              {renderPreviewContent()}
            </ScrollArea>
            
            {/* 底部提示 */}
            <div className="border-t bg-muted/30 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  💡 点击段落可跳转到原文
                </div>
                {references.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    {references.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export default OptimizedReferenceIndicator; 