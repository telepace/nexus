"use client"

import React, { useRef } from 'react'
import { useReferenceStore } from '@/lib/stores/referenceStore'
import UnifiedReferenceIndicator from './UnifiedReferenceIndicator'
import SmartHoverPreview from './SmartHoverPreview'
import ElegantDetailModal from './ElegantDetailModal'

/**
 * 🎯 完整的统一引用系统
 * 
 * 设计理念：
 * - 整合所有引用相关组件
 * - 统一的状态管理和交互逻辑
 * - 极简的 API 设计，开箱即用
 * - 完整的 TypeScript 支持
 */

export interface UnifiedReferenceSystemProps {
  refId: number
  contentId: string
  
  // 视觉配置
  variant?: 'minimal' | 'standard' | 'elegant'
  size?: 'sm' | 'md' | 'lg'
  
  // 功能开关
  enableHover?: boolean
  enableClick?: boolean
  enableKeyboard?: boolean
  
  // 悬浮预览配置
  hoverDelay?: number
  previewMaxLength?: number
  previewPosition?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  
  // 模态框配置
  modalMaxWidth?: number
  modalDraggable?: boolean
  
  // 样式定制
  className?: string
  
  // 回调函数
  onHover?: (refId: number) => void
  onUnhover?: (refId: number) => void
  onClick?: (refId: number) => void
  onModalOpen?: (refId: number) => void
  onModalClose?: (refId: number) => void
  
  // 调试模式
  debug?: boolean
}

/**
 * 🎯 统一引用系统主组件
 */
export const UnifiedReferenceSystem: React.FC<UnifiedReferenceSystemProps> = ({
  refId,
  contentId,
  variant = 'standard',
  size = 'md',
  enableHover = true,
  enableClick = true,
  enableKeyboard = true,
  hoverDelay = 150,
  previewMaxLength = 200,
  previewPosition = 'auto',
  modalMaxWidth = 600,
  modalDraggable = true,
  className,
  onHover,
  onUnhover,
  onClick,
  onModalOpen,
  onModalClose,
  debug = false,
}) => {
  // Store 状态
  const { hoveredRef, activeModal, closeModal } = useReferenceStore()
  
  // Refs
  const indicatorRef = useRef<HTMLButtonElement>(null)
  
  // 状态计算
  const isHovered = hoveredRef === refId
  const isModalOpen = activeModal === refId
  
  // 事件处理
  const handleHover = (refId: number) => {
    onHover?.(refId)
  }
  
  const handleUnhover = (refId: number) => {
    onUnhover?.(refId)
  }
  
  const handleClick = (refId: number) => {
    onClick?.(refId)
    onModalOpen?.(refId)
  }
  
  const handleModalClose = () => {
    closeModal()
    onModalClose?.(refId)
  }
  
  return (
    <>
      {/* 引用指示器 */}
      <UnifiedReferenceIndicator
        ref={indicatorRef}
        refId={refId}
        contentId={contentId}
        variant={variant}
        size={size}
        interactions={{
          hover: enableHover,
          click: enableClick,
          keyboard: enableKeyboard,
        }}
        onHover={handleHover}
        onUnhover={handleUnhover}
        onClick={handleClick}
        className={className}
        debug={debug}
      />
      
      {/* 智能悬浮预览 */}
      {enableHover && (
        <SmartHoverPreview
          refId={refId}
          contentId={contentId}
          triggerRef={indicatorRef}
          isVisible={isHovered}
          delay={hoverDelay}
          maxLength={previewMaxLength}
          position={previewPosition}
          debug={debug}
        />
      )}
      
      {/* 优雅详情模态框 */}
      {enableClick && (
        <ElegantDetailModal
          refId={refId}
          contentId={contentId}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          maxWidth={modalMaxWidth}
          draggable={modalDraggable}
          debug={debug}
        />
      )}
    </>
  )
}

/**
 * 🎨 预设的引用组件变体
 */

// 极简引用（只有点击，无悬浮）
export const MinimalReference: React.FC<Omit<UnifiedReferenceSystemProps, 'variant' | 'enableHover'>> = (props) => (
  <UnifiedReferenceSystem
    {...props}
    variant="minimal"
    enableHover={false}
  />
)

// 标准引用（悬浮 + 点击）
export const StandardReference: React.FC<Omit<UnifiedReferenceSystemProps, 'variant'>> = (props) => (
  <UnifiedReferenceSystem
    {...props}
    variant="standard"
  />
)

// 优雅引用（完整功能）
export const ElegantReference: React.FC<Omit<UnifiedReferenceSystemProps, 'variant'>> = (props) => (
  <UnifiedReferenceSystem
    {...props}
    variant="elegant"
  />
)

// 快速引用（无延迟）
export const QuickReference: React.FC<Omit<UnifiedReferenceSystemProps, 'hoverDelay'>> = (props) => (
  <UnifiedReferenceSystem
    {...props}
    hoverDelay={0}
  />
)

/**
 * 🔄 批量引用组件
 */
export interface BatchReferenceSystemProps {
  references: Array<{
    refId: number
    contentId: string
  }>
  variant?: 'minimal' | 'standard' | 'elegant'
  maxVisible?: number
  spacing?: 'tight' | 'normal' | 'loose'
  className?: string
  debug?: boolean
}

export const BatchReferenceSystem: React.FC<BatchReferenceSystemProps> = ({
  references,
  variant = 'standard',
  maxVisible = 3,
  spacing = 'normal',
  className,
  debug = false,
}) => {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-1.5',
    loose: 'gap-2',
  }
  
  const visibleRefs = references.slice(0, maxVisible)
  const hiddenCount = Math.max(0, references.length - maxVisible)
  
  return (
    <span className={`inline-flex items-center ${spacingClasses[spacing]} ${className || ''}`}>
      {visibleRefs.map(({ refId, contentId }, index) => (
        <UnifiedReferenceSystem
          key={`${contentId}-${refId}`}
          refId={refId}
          contentId={contentId}
          variant={variant}
          debug={debug}
        />
      ))}
      
      {hiddenCount > 0 && (
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
          +{hiddenCount}
        </span>
      )}
    </span>
  )
}

/**
 * 🎹 键盘导航增强包装器
 */
export interface KeyboardEnhancedReferenceProps extends UnifiedReferenceSystemProps {
  enableArrowNavigation?: boolean
  groupId?: string
}

export const KeyboardEnhancedReference: React.FC<KeyboardEnhancedReferenceProps> = ({
  enableArrowNavigation = true,
  groupId,
  ...props
}) => {
  // 这里可以添加键盘导航组的逻辑
  // 例如维护一个引用组，支持方向键在组内导航
  
  return (
    <UnifiedReferenceSystem
      {...props}
      enableKeyboard={true}
    />
  )
}

/**
 * 🎨 内联文本引用处理器
 */
export interface InlineReferenceProcessorProps {
  content: string
  contentId: string
  variant?: 'minimal' | 'standard' | 'elegant'
  className?: string
}

export const InlineReferenceProcessor: React.FC<InlineReferenceProcessorProps> = ({
  content,
  contentId,
  variant = 'standard', 
  className,
}) => {
  // 匹配引用模式：[1], [ref:1], [^1]
  const referencePattern = /\[(ref:)?(\^)?(\d+)\]/g
  
  const processContent = () => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    
    while ((match = referencePattern.exec(content)) !== null) {
      const [fullMatch, refPrefix, caretPrefix, refIdStr] = match
      const refId = parseInt(refIdStr, 10)
      
      // 添加引用前的文本
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }
      
      // 添加引用组件
      parts.push(
        <UnifiedReferenceSystem
          key={`ref-${refId}-${match.index}`}
          refId={refId}
          contentId={contentId}
          variant={variant}
          size="sm"
        />
      )
      
      lastIndex = match.index + fullMatch.length
    }
    
    // 添加剩余文本
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }
    
    return parts
  }
  
  return (
    <span className={className}>
      {processContent()}
    </span>
  )
}

// 导出所有组件
export default UnifiedReferenceSystem