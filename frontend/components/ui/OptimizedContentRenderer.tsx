"use client";

import React, { useMemo, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { EnhancedReferenceIndicator } from "./ReferenceManager";
import { Badge } from "./badge";
import { Button } from "./button";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 内容块类型定义
export interface ContentBlock {
  t: string; // 类型：h1, h2, h3, h4, h5, h6, p, quote, list, insight, concept等
  c: string; // 内容
  ref?: string; // 引用
  lead?: string; // 前导文本
  expandable?: string; // 可展开内容
  meta?: Record<string, unknown>; // 元数据
}

// 渲染器配置
export interface RendererConfig {
  theme?: 'default' | 'notebook' | 'headspace' | 'neumorphism';
  enableAnimations?: boolean;
  enableHoverEffects?: boolean;
  enableCopyButton?: boolean;
  enableCollapse?: boolean;
  showReferences?: boolean;
  contentId?: string;
}

// 组件属性
export interface OptimizedContentRendererProps {
  content: string | ContentBlock[];
  config?: RendererConfig;
  className?: string;
  onReferenceClick?: (refId: number) => void;
  onBlockClick?: (block: ContentBlock, index: number) => void;
}

// 解析JSONL内容
const parseContent = (content: string | ContentBlock[]): ContentBlock[] => {
  if (Array.isArray(content)) return content;
  
  if (!content || typeof content !== 'string') return [];
  
  try {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line) as ContentBlock;
      } catch {
        // 如果解析失败，创建一个段落块
        return { t: 'p', c: line };
      }
    });
  } catch {
    // 如果整体解析失败，将整个内容作为一个段落
    return [{ t: 'p', c: content }];
  }
};

// 解析引用
const parseReferences = (ref?: string): number[] => {
  if (!ref) return [];
  return ref.split(',').map(r => parseInt(r.trim())).filter(n => !isNaN(n));
};

// 标题组件
const HeadingBlock = memo<{
  block: ContentBlock;
  config: RendererConfig;
  index: number;
  onCopy?: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
}>(({ block, config, index, onCopy, onReferenceClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const references = parseReferences(block.ref);
  
  const getHeadingClass = (type: string, theme: string = 'default') => {
    const baseClasses = "select-text tracking-tight scroll-m-16";
    
    switch (theme) {
      case 'notebook':
        return cn(baseClasses, {
          'text-2xl font-bold text-gray-800 mt-6 mb-4': type === 'h1',
          'text-xl font-bold text-gray-700 mt-5 mb-3 border-b border-gray-200 pb-2': type === 'h2',
          'text-lg font-bold text-gray-700 mt-4 mb-2': type === 'h3',
          'text-base font-bold text-gray-600 mt-3 mb-2': type === 'h4',
          'text-sm font-bold text-gray-600 mt-2 mb-1 uppercase tracking-wide': type === 'h5',
          'text-xs font-bold text-gray-500 mt-2 mb-1 uppercase tracking-wider': type === 'h6',
        });
      
      case 'headspace':
        return cn(baseClasses, "text-white font-medium leading-tight");
      
      case 'neumorphism':
        return cn(baseClasses, {
          'text-2xl font-bold text-gray-700 my-4 text-center': type === 'h1',
          'text-lg font-bold text-gray-600 mt-6 mb-2 border-b-2 border-gray-200 pb-1': type === 'h2',
          'text-base font-semibold text-gray-600 mt-4 mb-1': type === 'h3',
          'text-sm font-semibold text-gray-600 mt-3 mb-1': type === 'h4',
          'text-xs font-semibold text-gray-500 mt-2 mb-1 uppercase tracking-wide': type === 'h5',
          'text-xs font-medium text-gray-400 mt-2 mb-1 uppercase tracking-wider': type === 'h6',
        });
      
      default:
        return cn(baseClasses, {
          'text-2xl font-bold lg:text-3xl mt-6 mb-4': type === 'h1',
          'text-xl font-semibold border-b pb-1.5 first:mt-0 mt-5 mb-3': type === 'h2',
          'text-lg font-semibold mt-4 mb-2': type === 'h3',
          'text-base font-semibold mt-3 mb-2': type === 'h4',
          'text-sm font-semibold mt-2 mb-1 uppercase tracking-wide': type === 'h5',
          'text-xs font-medium mt-2 mb-1 uppercase tracking-wider text-muted-foreground': type === 'h6',
        });
    }
  };
  
  const HeadingTag = block.t as keyof JSX.IntrinsicElements;
  const className = getHeadingClass(block.t, config.theme);
  
  return (
    <motion.div
      className="group relative"
      initial={config.enableAnimations ? { opacity: 0, y: 10 } : false}
      animate={config.enableAnimations ? { opacity: 1, y: 0 } : false}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseEnter={() => config.enableHoverEffects && setIsHovered(true)}
      onMouseLeave={() => config.enableHoverEffects && setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <HeadingTag className={className}>
          <MarkdownRenderer content={block.c} inline={true} />
        </HeadingTag>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {references.length > 0 && config.showReferences && (
            <EnhancedReferenceIndicator
              references={references}
              contentId={config.contentId}
              onReferenceClick={onReferenceClick}
              className="text-xs"
            />
          )}
          
          {config.enableCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onCopy?.(block.c)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

HeadingBlock.displayName = 'HeadingBlock';

// 段落组件
const ParagraphBlock = memo<{
  block: ContentBlock;
  config: RendererConfig;
  index: number;
  onCopy?: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
}>(({ block, config, index, onCopy, onReferenceClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const references = parseReferences(block.ref);
  
  return (
    <motion.div
      className="group relative"
      initial={config.enableAnimations ? { opacity: 0, y: 5 } : false}
      animate={config.enableAnimations ? { opacity: 1, y: 0 } : false}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onMouseEnter={() => config.enableHoverEffects && setIsHovered(true)}
      onMouseLeave={() => config.enableHoverEffects && setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 leading-relaxed text-foreground my-2">
          {block.lead && (
            <span className="font-semibold text-primary">
              {block.lead}:{" "}
            </span>
          )}
          <MarkdownRenderer content={block.c} inline={true} />
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {references.length > 0 && config.showReferences && (
            <EnhancedReferenceIndicator
              references={references}
              contentId={config.contentId}
              onReferenceClick={onReferenceClick}
              className="text-xs"
            />
          )}
          
          {config.enableCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onCopy?.(block.c)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ParagraphBlock.displayName = 'ParagraphBlock';

// 引用组件
const QuoteBlock = memo<{
  block: ContentBlock;
  config: RendererConfig;
  index: number;
  onCopy?: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
}>(({ block, config, index, onCopy, onReferenceClick }) => {
  const references = parseReferences(block.ref);
  
  return (
    <motion.div
      className="group relative"
      initial={config.enableAnimations ? { opacity: 0, x: -10 } : false}
      animate={config.enableAnimations ? { opacity: 1, x: 0 } : false}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-3 italic text-muted-foreground bg-muted/20 rounded-r-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <MarkdownRenderer content={block.c} inline={true} />
            {block.ref && (
              <cite className="block mt-2 text-xs not-italic text-muted-foreground">
                — {block.ref}
              </cite>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {references.length > 0 && config.showReferences && (
              <EnhancedReferenceIndicator
                references={references}
                contentId={config.contentId}
                onReferenceClick={onReferenceClick}
                className="text-xs"
              />
            )}
            
            {config.enableCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onCopy?.(block.c)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </blockquote>
    </motion.div>
  );
});

QuoteBlock.displayName = 'QuoteBlock';

// 列表组件
const ListBlock = memo<{
  block: ContentBlock;
  config: RendererConfig;
  index: number;
  onCopy?: (content: string) => void;
  onReferenceClick?: (refId: number) => void;
}>(({ block, config, index, onCopy, onReferenceClick }) => {
  const references = parseReferences(block.ref);
  const items = block.c.split(/[\n,；;]/).map(s => s.trim()).filter(Boolean);
  
  return (
    <motion.div
      className="group relative"
      initial={config.enableAnimations ? { opacity: 0, y: 5 } : false}
      animate={config.enableAnimations ? { opacity: 1, y: 0 } : false}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <ul className="list-disc ml-4 space-y-1 my-2 flex-1">
          {items.map((item, i) => (
            <li key={i} className="text-foreground leading-relaxed">
              <MarkdownRenderer content={item} inline={true} />
            </li>
          ))}
        </ul>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {references.length > 0 && config.showReferences && (
            <EnhancedReferenceIndicator
              references={references}
              contentId={config.contentId}
              onReferenceClick={onReferenceClick}
              className="text-xs"
            />
          )}
          
          {config.enableCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onCopy?.(block.c)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ListBlock.displayName = 'ListBlock';

// 主渲染器组件
export const OptimizedContentRenderer: React.FC<OptimizedContentRendererProps> = ({
  content,
  config = {},
  className,
  onReferenceClick,
  onBlockClick,
}) => {
  const { toast } = useToast();
  
  // 默认配置
  const mergedConfig: RendererConfig = {
    theme: 'default',
    enableAnimations: true,
    enableHoverEffects: true,
    enableCopyButton: true,
    enableCollapse: false,
    showReferences: true,
    ...config,
  };
  
  // 解析内容
  const blocks = useMemo(() => parseContent(content), [content]);
  
  // 复制处理
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "已复制", description: "内容已复制到剪贴板" });
    } catch {
      toast({ title: "复制失败", description: "无法复制内容", variant: "destructive" });
    }
  }, [toast]);
  
  // 渲染单个块
  const renderBlock = useCallback((block: ContentBlock, index: number) => {
    const commonProps = {
      block,
      config: mergedConfig,
      index,
      onCopy: handleCopy,
      onReferenceClick,
    };
    
    switch (block.t) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return <HeadingBlock key={`${block.t}-${index}`} {...commonProps} />;
      
      case 'quote':
        return <QuoteBlock key={`quote-${index}`} {...commonProps} />;
      
      case 'list':
        return <ListBlock key={`list-${index}`} {...commonProps} />;
      
      case 'p':
      default:
        return <ParagraphBlock key={`p-${index}`} {...commonProps} />;
    }
  }, [mergedConfig, handleCopy, onReferenceClick]);
  
  if (blocks.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        暂无内容
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-1", className)}>
      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => (
          <div
            key={`block-${index}`}
            onClick={() => onBlockClick?.(block, index)}
            className="cursor-pointer"
          >
            {renderBlock(block, index)}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
