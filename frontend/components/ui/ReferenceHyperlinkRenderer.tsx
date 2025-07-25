"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  parseReferenceString, 
  generateReferenceGroups, 
  getReferenceDescription,
  type ReferenceGroup 
} from "@/lib/utils/reference-parser";
import { useReferenceManagerSafe } from "./ReferenceManager";

interface ReferenceHyperlinkRendererProps {
  refString?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'badge' | 'inline';
  maxVisible?: number;
  showTooltip?: boolean;
  animated?: boolean;
  onReferenceClick?: (refId: number) => void;
}

/**
 * 🎨 优雅的引用超链接渲染器
 * 
 * 特性：
 * - 智能分组显示 (1-3, 5, 7-9)
 * - 优美的hover动画
 * - 响应式设计
 * - 智能工具提示
 * - 多种显示风格
 */
export const ReferenceHyperlinkRenderer: React.FC<ReferenceHyperlinkRendererProps> = ({
  refString,
  className = "",
  variant = 'default',
  maxVisible = 5,
  showTooltip = true,
  animated = true,
  onReferenceClick,
}) => {
  const [hoveredRef, setHoveredRef] = useState<number | null>(null);
  const { actions } = useReferenceManagerSafe();

  // 解析引用数据
  const referenceData: ReferenceGroup = useMemo(() => {
    return parseReferenceString(refString);
  }, [refString]);

  // 生成显示分组
  const displayGroups = useMemo(() => {
    const allIds = referenceData.references.map(r => r.id);
    return generateReferenceGroups(allIds);
  }, [referenceData]);

  // 处理点击事件
  const handleReferenceClick = useCallback((refId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 调用外部回调
    onReferenceClick?.(refId);
    
    // 调用引用管理器
    actions?.jumpToParagraph?.(refId);
  }, [onReferenceClick, actions]);

  // 如果没有引用，不渲染
  if (referenceData.totalCount === 0) {
    return null;
  }

  // 根据变体选择基础样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          container: "inline-flex items-center gap-1 ml-1",
          link: "text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200",
          separator: "text-muted-foreground text-xs"
        };
      case 'badge':
        return {
          container: "inline-flex items-center gap-1 ml-2",
          link: "inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 transform hover:scale-110",
          separator: "text-muted-foreground text-xs"
        };
      case 'inline':
        return {
          container: "inline-flex items-center gap-0.5 ml-1",
          link: "text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline transition-colors duration-200",
          separator: "text-muted-foreground text-xs"
        };
      default:
        return {
          container: "inline-flex items-center gap-1.5 ml-2",
          link: "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-200 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:scale-110 transition-all duration-300 cursor-pointer select-none",
          separator: "text-muted-foreground text-xs mx-0.5"
        };
    }
  };

  const styles = getVariantStyles();

  // 解析单个引用ID（支持范围）
  const parseGroupToIds = (group: string): number[] => {
    if (group.includes('-')) {
      const [start, end] = group.split('-').map(s => parseInt(s, 10));
      if (!isNaN(start) && !isNaN(end)) {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }
    const id = parseInt(group, 10);
    return !isNaN(id) ? [id] : [];
  };

  // 渲染单个引用链接
  const renderReferenceLink = (group: string, index: number) => {
    const ids = parseGroupToIds(group);
    const primaryId = ids[0]; // 使用第一个ID作为主要点击目标
    
    if (!primaryId) return null;

    const isHovered = hoveredRef === primaryId;
    const description = ids.length === 1 
      ? `跳转到第${primaryId}段` 
      : `跳转到第${ids[0]}-${ids[ids.length - 1]}段`;

    return (
      <div key={index} className="relative group">
        <a
          href={`#ref-${primaryId}`}
          className={cn(
            styles.link,
            animated && "transform transition-transform duration-200",
            isHovered && "z-10",
            className
          )}
          onClick={(e) => handleReferenceClick(primaryId, e)}
          onMouseEnter={() => setHoveredRef(primaryId)}
          onMouseLeave={() => setHoveredRef(null)}
          title={description}
          aria-label={description}
        >
          {group}
        </a>

        {/* 优雅的工具提示 */}
        {showTooltip && isHovered && variant !== 'minimal' && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-nowrap">
            <div className="font-medium">{description}</div>
            {ids.length > 1 && (
              <div className="text-gray-300 dark:text-gray-600 text-xs mt-1">
                包含 {ids.length} 个段落
              </div>
            )}
            {/* 小箭头 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        )}
      </div>
    );
  };

  // 显示的组和隐藏的计数
  const visibleGroups = displayGroups.slice(0, maxVisible);
  const hiddenCount = Math.max(0, displayGroups.length - maxVisible);
  const totalHiddenRefs = displayGroups
    .slice(maxVisible)
    .reduce((sum, group) => sum + parseGroupToIds(group).length, 0);

  return (
    <span className={cn(styles.container, className)} role="navigation" aria-label="文档引用">
      {visibleGroups.map((group, index) => (
        <React.Fragment key={group}>
          {index > 0 && <span className={styles.separator}>·</span>}
          {renderReferenceLink(group, index)}
        </React.Fragment>
      ))}
      
      {/* 显示隐藏计数 */}
      {hiddenCount > 0 && (
        <>
          <span className={styles.separator}>·</span>
          <span 
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground border border-border/50",
              variant === 'minimal' && "px-1 py-0 border-none bg-transparent"
            )}
            title={`还有${totalHiddenRefs}个引用`}
          >
            +{totalHiddenRefs}
          </span>
        </>
      )}

      {/* 整体描述（屏幕阅读器） */}
      <span className="sr-only">
        {getReferenceDescription(referenceData)}
      </span>
    </span>
  );
};

/**
 * 🎨 预设的引用样式组件
 */
export const InlineReferences: React.FC<Pick<ReferenceHyperlinkRendererProps, 'refString' | 'onReferenceClick'>> = (props) => (
  <ReferenceHyperlinkRenderer 
    {...props} 
    variant="inline" 
    showTooltip={false} 
    maxVisible={10}
  />
);

export const BadgeReferences: React.FC<Pick<ReferenceHyperlinkRendererProps, 'refString' | 'onReferenceClick'>> = (props) => (
  <ReferenceHyperlinkRenderer 
    {...props} 
    variant="badge" 
    animated={true}
    maxVisible={3}
  />
);

export const MinimalReferences: React.FC<Pick<ReferenceHyperlinkRendererProps, 'refString' | 'onReferenceClick'>> = (props) => (
  <ReferenceHyperlinkRenderer 
    {...props} 
    variant="minimal" 
    showTooltip={false}
    animated={false}
    maxVisible={8}
  />
);

export default ReferenceHyperlinkRenderer;