"use client"

import React, { forwardRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useHoverBehavior } from '@/lib/hooks/useHoverBehavior'
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation'
import { useIndicatorAnimation } from '@/lib/hooks/useReferenceAnimation'
import { useReferenceStore } from '@/lib/stores/referenceStore'
import { REFERENCE_ANIMATIONS } from '@/lib/constants/animationConfig'

/**
 * 🎯 统一引用指示器组件
 * 
 * 设计理念：
 * - 极简 18px 圆形设计
 * - 统一的悬浮和点击交互
 * - 完整的无障碍支持
 * - 三种视觉变体适配不同场景
 */

export interface UnifiedReferenceIndicatorProps {
  refId: number
  contentId: string
  
  // 视觉变体
  variant?: 'minimal' | 'standard' | 'elegant'
  size?: 'sm' | 'md' | 'lg'
  
  // 交互配置
  interactions?: {
    hover?: boolean
    click?: boolean
    keyboard?: boolean
  }
  
  // 回调函数
  onHover?: (refId: number) => void
  onUnhover?: (refId: number) => void
  onClick?: (refId: number) => void
  onKeyActivate?: (refId: number) => void
  
  // 样式定制
  className?: string
  style?: React.CSSProperties
  
  // 行为控制
  disabled?: boolean
  loading?: boolean
  
  // 无障碍增强
  ariaLabel?: string
  ariaDescribedBy?: string
  
  // 调试模式
  debug?: boolean
}

// 尺寸映射
const SIZE_VARIANTS = {
  sm: 'w-4 h-4 text-[10px]',
  md: 'w-5 h-5 text-xs',
  lg: 'w-6 h-6 text-sm',
} as const

// 视觉变体样式
const VISUAL_VARIANTS = {
  minimal: {
    base: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600',
    active: 'active:bg-gray-300 dark:active:bg-gray-600',
    focus: 'focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-1',
  },
  
  standard: {
    base: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:text-blue-800 dark:hover:text-blue-200 hover:border-blue-300 dark:hover:border-blue-600',
    active: 'active:bg-blue-200 dark:active:bg-blue-700/50',
    focus: 'focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:ring-offset-1',
  },
  
  elegant: {
    base: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-sm',
    hover: 'hover:from-blue-600 hover:to-purple-700 hover:shadow-md',
    active: 'active:from-blue-700 active:to-purple-800 active:shadow-sm',
    focus: 'focus:ring-2 focus:ring-purple-400 focus:ring-offset-2',
  },
} as const

const UnifiedReferenceIndicator = forwardRef<HTMLButtonElement, UnifiedReferenceIndicatorProps>(
  ({
    refId,
    contentId,
    variant = 'standard',
    size = 'md',
    interactions = { hover: true, click: true, keyboard: true },
    onHover,
    onUnhover,
    onClick,
    onKeyActivate,
    className,
    style,
    disabled = false,
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    debug = false,
  }, ref) => {
    
    // Store 状态
    const { openModal, config } = useReferenceStore()
    
    // Hooks
    const hoverBehavior = useHoverBehavior({
      refId,
      contentId,
      onHoverStart: onHover,
      onHoverEnd: onUnhover,
      disabled: disabled || !interactions.hover,
      debug,
    })
    
    const keyboardNav = useKeyboardNavigation({
      refId,
      contentId,
      onActivate: onKeyActivate || onClick,
      disabled: disabled || !interactions.keyboard,
      ariaLabel,
      ariaDescribedBy,
      debug,
    })
    
    const animation = useIndicatorAnimation({
      duration: loading ? REFERENCE_ANIMATIONS.INDICATOR.duration * 2 : undefined,
    })
    
    // 样式计算
    const sizeClasses = SIZE_VARIANTS[size]
    const variantStyles = VISUAL_VARIANTS[variant]
    
    const baseClasses = cn(
      // 基础样式
      'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200',
      'select-none cursor-pointer relative overflow-hidden',
      
      // 尺寸
      sizeClasses,
      
      // 变体样式
      variantStyles.base,
      variantStyles.hover,
      variantStyles.active,
      variantStyles.focus,
      
      // 状态样式
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      loading && 'animate-pulse',
      
      // 自定义类名
      className
    )
    
    // 点击处理
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      
      event.preventDefault()
      event.stopPropagation()
      
      if (debug) {
        console.log(`[UnifiedReferenceIndicator-${refId}] 点击事件`)
      }
      
      onClick?.(refId)
      
      // 打开详情模态框
      if (interactions.click) {
        const rect = event.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        openModal(refId, { x: centerX, y: centerY })
      }
    }, [disabled, loading, refId, onClick, interactions.click, openModal, debug])
    
    // 加载指示器
    const LoadingSpinner = () => (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 border border-current border-t-transparent rounded-full"
      />
    )
    
    return (
      <motion.button
        ref={ref}
        type="button"
        className={baseClasses}
        style={style}
        onClick={handleClick}
        disabled={disabled}
        data-reference-id={refId}
        data-content-id={contentId}
        
        // 悬浮事件
        onMouseEnter={hoverBehavior.handleMouseEnter}
        onMouseLeave={hoverBehavior.handleMouseLeave}
        
        // 键盘事件
        onKeyDown={keyboardNav.onKeyDown}
        onFocus={keyboardNav.onFocus}
        onBlur={keyboardNav.onBlur}
        
        // 无障碍属性
        {...keyboardNav}
        
        // 动画变体
        variants={animation.variants}
        initial="initial"
        animate="animate"
        exit="exit"
        whileHover={disabled ? undefined : "whileHover"}
        whileTap={disabled ? undefined : "whileTap"}
      >
        {/* 主要内容 */}
        <span className="relative z-10">
          {refId}
        </span>
        
        {/* 加载状态 */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <LoadingSpinner />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 悬浮状态指示器 */}
        <AnimatePresence>
          {hoverBehavior.isPreviewVisible && variant !== 'minimal' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
            />
          )}
        </AnimatePresence>
        
        {/* 焦点指示器（增强可见性） */}
        {keyboardNav.isFocused && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            className="absolute inset-0 rounded-full border-2 border-current opacity-50 pointer-events-none"
          />
        )}
      </motion.button>
    )
  }
)

UnifiedReferenceIndicator.displayName = 'UnifiedReferenceIndicator'

// 便捷的预设组件
export const MinimalReference = (props: Omit<UnifiedReferenceIndicatorProps, 'variant'>) => (
  <UnifiedReferenceIndicator {...props} variant="minimal" />
)

export const StandardReference = (props: Omit<UnifiedReferenceIndicatorProps, 'variant'>) => (
  <UnifiedReferenceIndicator {...props} variant="standard" />
)

export const ElegantReference = (props: Omit<UnifiedReferenceIndicatorProps, 'variant'>) => (
  <UnifiedReferenceIndicator {...props} variant="elegant" />
)

// 批量引用组件
export interface BatchReferenceIndicatorProps {
  refIds: number[]
  contentId: string
  variant?: 'minimal' | 'standard' | 'elegant'
  maxVisible?: number
  spacing?: 'tight' | 'normal' | 'loose'
  className?: string
}

export const BatchReferenceIndicator: React.FC<BatchReferenceIndicatorProps> = ({
  refIds,
  contentId,
  variant = 'standard',
  maxVisible = 3,
  spacing = 'normal',
  className,
}) => {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-1.5',
    loose: 'gap-2',
  }
  
  const visibleRefs = refIds.slice(0, maxVisible)
  const hiddenCount = Math.max(0, refIds.length - maxVisible)
  
  return (
    <div className={cn('inline-flex items-center', spacingClasses[spacing], className)}>
      {visibleRefs.map((refId, index) => (
        <motion.div
          key={refId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <UnifiedReferenceIndicator
            refId={refId}
            contentId={contentId}
            variant={variant}
          />
        </motion.div>
      ))}
      
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: visibleRefs.length * 0.05 }}
          className={cn(
            'inline-flex items-center justify-center text-xs text-gray-500 dark:text-gray-400',
            SIZE_VARIANTS.md
          )}
        >
          +{hiddenCount}
        </motion.div>
      )}
    </div>
  )
}

export default UnifiedReferenceIndicator