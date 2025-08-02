"use client";

import React, { 
  useMemo, 
  useState, 
  useCallback, 
  memo, 
  useRef, 
  useLayoutEffect,
  useEffect
} from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { EnhancedReferenceIndicator } from "./ReferenceManager";
import { Button } from "./button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslationUtils } from "@/lib/i18n-utils";

// 继承原有的内容块类型定义
export interface ContentBlock {
  t: string;
  c: string;
  ref?: string;
  lead?: string;
  expandable?: string;
  meta?: Record<string, unknown>;
}

// 渲染器配置 - 优化版本，默认禁用动画
export interface VirtualizedRendererConfig {
  theme?: 'default' | 'notebook' | 'headspace' | 'neumorphism';
  enableAnimations?: boolean; // 默认false
  enableHoverEffects?: boolean; // 默认false
  enableCopyButton?: boolean;
  enableCollapse?: boolean;
  showReferences?: boolean;
  contentId?: string;
  virtualizeThreshold?: number; // 超过这个数量启用虚拟化
}

// 组件属性
export interface VirtualizedContentRendererProps {
  content: string | ContentBlock[];
  config?: VirtualizedRendererConfig;
  className?: string;
  onReferenceClick?: (refId: number) => void;
  onBlockClick?: (block: ContentBlock, index: number) => void;
}

// 虚拟化配置
const VIRTUAL_CONFIG = {
  ITEM_HEIGHT: 80, // 估算的单个内容块高度
  OVERSCAN: 5, // 额外渲染的项目数量
  SCROLL_DEBOUNCE: 16, // 滚动防抖时间(约60fps)
};

// 解析JSONL内容 - 优化版本
const parseContent = (content: string | ContentBlock[]): ContentBlock[] => {
  if (Array.isArray(content)) return content;
  
  if (!content || typeof content !== 'string') return [];
  
  try {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line) as ContentBlock;
      } catch {
        return { t: 'p', c: line };
      }
    });
  } catch {
    return [{ t: 'p', c: content }];
  }
};

// 解析引用
const parseReferences = (ref?: string): number[] => {
  if (!ref) return [];
  return ref.split(',').map(r => parseInt(r.trim())).filter(n => !isNaN(n));
};

// 轻量级内容块组件 - 移除动画，优化性能
const ContentBlockItem = memo<{
  block: ContentBlock;
  config: VirtualizedRendererConfig;
  index: number;
  onCopy?: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
  onClick?: (block: ContentBlock, index: number) => void;
}>(({ block, config, index, onCopy, onReferenceClick, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const references = parseReferences(block.ref);
  
  const getBlockClass = (type: string, theme: string = 'default') => {
    const baseClasses = "select-text cursor-pointer min-h-[60px] p-3 border-b border-border/10 transition-colors duration-150";
    
    switch (theme) {
      case 'notebook':
        return cn(baseClasses, {
          'font-bold text-gray-800': type.startsWith('h'),
          'text-gray-700': type === 'p',
          'italic text-muted-foreground bg-muted/20 border-l-4 border-primary/30 pl-4': type === 'quote',
          'ml-4': type === 'list',
        });
      
      case 'headspace':
        return cn(baseClasses, "text-white font-medium");
      
      default:
        return cn(baseClasses, {
          'font-bold text-lg': type === 'h1',
          'font-semibold text-base': type === 'h2',
          'font-semibold text-sm': type === 'h3',
          'text-foreground': type === 'p',
          'italic text-muted-foreground bg-muted/20 border-l-4 border-primary/30 pl-4': type === 'quote',
          'ml-4': type === 'list',
        });
    }
  };
  
  const blockClass = getBlockClass(block.t, config.theme);
  
  const handleClick = useCallback(() => {
    onClick?.(block, index);
  }, [block, index, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (config.enableHoverEffects) {
      setIsHovered(true);
    }
  }, [config.enableHoverEffects]);

  const handleMouseLeave = useCallback(() => {
    if (config.enableHoverEffects) {
      setIsHovered(false);
    }
  }, [config.enableHoverEffects]);
  
  return (
    <div
      className={cn(
        blockClass,
        isHovered && "bg-muted/10",
        "group relative"
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {block.lead && (
            <span className="font-semibold text-primary mr-2">
              {block.lead}:
            </span>
          )}
          
          {block.t === 'list' ? (
            <ul className="list-disc ml-4 space-y-1">
              {block.c.split(/[\n,；;]/).map((item, i) => (
                <li key={i} className="text-foreground leading-relaxed">
                  <MarkdownRenderer content={item.trim()} inline={true} />
                </li>
              ))}
            </ul>
          ) : (
            <MarkdownRenderer content={block.c} inline={true} />
          )}
        </div>
        
        {(references.length > 0 || config.enableCopyButton) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {references.length > 0 && config.showReferences && (
              <EnhancedReferenceIndicator
                references={references}
                onReferenceClick={onReferenceClick}
                className="text-xs"
              />
            )}
            
            {config.enableCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy?.(block.c);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ContentBlockItem.displayName = 'ContentBlockItem';

// 虚拟化容器组件
const VirtualizedContainer = memo<{
  blocks: ContentBlock[];
  config: VirtualizedRendererConfig;
  containerHeight: number;
  onCopy: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
  onBlockClick?: (block: ContentBlock, index: number) => void;
}>(({ blocks, config, containerHeight, onCopy, onReferenceClick, onBlockClick }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_CONFIG.ITEM_HEIGHT) - VIRTUAL_CONFIG.OVERSCAN);
    const endIndex = Math.min(
      blocks.length - 1,
      Math.floor((scrollTop + containerHeight) / VIRTUAL_CONFIG.ITEM_HEIGHT) + VIRTUAL_CONFIG.OVERSCAN
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, blocks.length]);

  // 滚动处理 - 添加防抖
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollTop(e.currentTarget.scrollTop);
    }, VIRTUAL_CONFIG.SCROLL_DEBOUNCE);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const totalHeight = blocks.length * VIRTUAL_CONFIG.ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * VIRTUAL_CONFIG.ITEM_HEIGHT;

  return (
    <div
      className="h-full overflow-auto"
      onScroll={handleScroll}
      style={{ contain: 'strict' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {blocks.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((block, i) => {
            const actualIndex = visibleRange.startIndex + i;
            return (
              <ContentBlockItem
                key={`${block.t}-${actualIndex}`}
                block={block}
                config={config}
                index={actualIndex}
                onCopy={onCopy}
                onReferenceClick={onReferenceClick}
                onClick={onBlockClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualizedContainer.displayName = 'VirtualizedContainer';

// 主渲染器组件
export const VirtualizedContentRenderer: React.FC<VirtualizedContentRendererProps> = ({
  content,
  config = {},
  className,
  onReferenceClick,
  onBlockClick,
}) => {
  const { toast } = useToast();
  const { t } = useTranslationUtils();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  
  // 默认配置 - 性能优先
  const mergedConfig: VirtualizedRendererConfig = {
    theme: 'default',
    enableAnimations: false, // 默认禁用动画
    enableHoverEffects: false, // 默认禁用悬停效果  
    enableCopyButton: true,
    enableCollapse: false,
    showReferences: true,
    virtualizeThreshold: 20, // 超过20个块启用虚拟化
    ...config,
  };
  
  // 解析内容
  const blocks = useMemo(() => parseContent(content), [content]);
  
  // 决定是否使用虚拟化
  const shouldVirtualize = blocks.length > (mergedConfig.virtualizeThreshold || 20);
  
  // 测量容器高度
  useLayoutEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);
  
  // 复制处理
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: t("messages.copySuccess"), description: t("messages.copySuccess") });
    } catch {
      toast({ title: t("messages.copyError"), description: t("messages.copyError"), variant: "destructive" });
    }
  }, [toast, t]);
  
  if (blocks.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {t("status.noContent")}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("h-full", className)}>
      {shouldVirtualize ? (
        <VirtualizedContainer
          blocks={blocks}
          config={mergedConfig}
          containerHeight={containerHeight}
          onCopy={handleCopy}
          onReferenceClick={onReferenceClick}
          onBlockClick={onBlockClick}
        />
      ) : (
        // 对于少量内容，使用简化的非虚拟化渲染
        <div className="h-full overflow-auto space-y-0">
          {blocks.map((block, index) => (
            <ContentBlockItem
              key={`${block.t}-${index}`}
              block={block}
              config={mergedConfig}
              index={index}
              onCopy={handleCopy}
              onReferenceClick={onReferenceClick}
              onClick={onBlockClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};