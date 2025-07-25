"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReferenceManagerSafe } from "./ReferenceManager";
import { EnhancedReferenceTooltip } from "./EnhancedReferenceTooltip";

interface AnimatedReferenceIndicatorProps {
  references: number[];
  variant?: 'floating' | 'pulse' | 'glow' | 'bounce';
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  showTooltip?: boolean;
  staggerDelay?: number;
  onReferenceClick?: (refId: number) => void;
  className?: string;
}

/**
 * 🎭 动画引用指示器
 * 
 * 特性：
 * - 多种动画效果
 * - 错开动画时间
 * - 彩色主题支持
 * - 大小自适应
 * - 悬停预览
 */
export const AnimatedReferenceIndicator: React.FC<AnimatedReferenceIndicatorProps> = ({
  references,
  variant = 'floating',
  size = 'md',
  color = 'blue',
  showTooltip = true,
  staggerDelay = 100,
  onReferenceClick,
  className,
}) => {
  const [mounted, setMounted] = useState(false);
  const [visibleRefs, setVisibleRefs] = useState<number[]>([]);
  const { actions } = useReferenceManagerSafe();

  useEffect(() => {
    setMounted(true);
    
    // 错开显示动画
    references.forEach((ref, index) => {
      setTimeout(() => {
        setVisibleRefs(prev => [...prev, ref]);
      }, index * staggerDelay);
    });

    return () => {
      setVisibleRefs([]);
    };
  }, [references, staggerDelay]);

  const handleClick = (refId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    onReferenceClick?.(refId);
    actions?.jumpToParagraph?.(refId);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4 text-xs';
      case 'md': return 'w-6 h-6 text-sm';
      case 'lg': return 'w-8 h-8 text-base';
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30',
      purple: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/30',
      green: 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30',
      orange: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30',
      pink: 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/30',
    };
    return colors[color];
  };

  const getVariantClasses = (index: number) => {
    const baseAnimation = "transform transition-all duration-300 ease-out";
    
    switch (variant) {
      case 'floating':
        return cn(
          baseAnimation,
          "animate-bounce",
          mounted && "animate-none hover:scale-110 hover:-translate-y-1"
        );
      case 'pulse':
        return cn(
          baseAnimation,
          "animate-pulse",
          mounted && "animate-none hover:scale-125"
        );
      case 'glow':
        return cn(
          baseAnimation,
          "hover:shadow-lg",
          mounted && "hover:scale-110 shadow-md"
        );
      case 'bounce':
        return cn(
          baseAnimation,
          "hover:animate-bounce hover:scale-105"
        );
    }
  };

  const renderReference = (refId: number, index: number) => {
    const isVisible = visibleRefs.includes(refId);
    
    const referenceElement = (
      <button
        onClick={(e) => handleClick(refId, e)}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold cursor-pointer select-none",
          "border-2 border-white/20 backdrop-blur-sm",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current",
          getSizeClasses(),
          getColorClasses(),
          getVariantClasses(index),
          !isVisible && "opacity-0 scale-50",
          isVisible && "opacity-100 scale-100",
          className
        )}
        style={{
          animationDelay: `${index * 50}ms`,
          transitionDelay: `${index * 50}ms`,
        }}
        title={`跳转到第${refId}段`}
        aria-label={`引用第${refId}段`}
      >
        {refId}
      </button>
    );

    if (showTooltip) {
      return (
        <EnhancedReferenceTooltip key={refId} refId={refId} showPreview={true}>
          {referenceElement}
        </EnhancedReferenceTooltip>
      );
    }

    return referenceElement;
  };

  if (references.length === 0) return null;

  return (
    <div className={cn("inline-flex items-center gap-2 ml-2", className)}>
      {/* 装饰性图标 */}
      <span className="text-muted-foreground text-xs opacity-60">📎</span>
      
      {/* 引用列表 */}
      <div className="flex items-center gap-1.5">
        {references.map((refId, index) => renderReference(refId, index))}
      </div>
      
      {/* 数量提示 */}
      {references.length > 5 && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {references.length} 个引用
        </span>
      )}
    </div>
  );
};

/**
 * 🌟 预设动画风格组件
 */
export const FloatingReferences: React.FC<Pick<AnimatedReferenceIndicatorProps, 'references' | 'onReferenceClick'>> = (props) => (
  <AnimatedReferenceIndicator {...props} variant="floating" color="blue" />
);

export const PulseReferences: React.FC<Pick<AnimatedReferenceIndicatorProps, 'references' | 'onReferenceClick'>> = (props) => (
  <AnimatedReferenceIndicator {...props} variant="pulse" color="purple" />
);

export const GlowReferences: React.FC<Pick<AnimatedReferenceIndicatorProps, 'references' | 'onReferenceClick'>> = (props) => (
  <AnimatedReferenceIndicator {...props} variant="glow" color="green" />
);

export const BounceReferences: React.FC<Pick<AnimatedReferenceIndicatorProps, 'references' | 'onReferenceClick'>> = (props) => (
  <AnimatedReferenceIndicator {...props} variant="bounce" color="orange" />
);

export default AnimatedReferenceIndicator;