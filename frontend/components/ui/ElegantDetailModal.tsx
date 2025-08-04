"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useReferenceStore, type ReferenceContent } from '@/lib/stores/referenceStore'
import { useModalAnimation } from '@/lib/hooks/useReferenceAnimation'
import { useReferenceManagerSafe } from './ReferenceManager'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Card, CardContent, CardHeader } from './card'
import { Button } from './button'
import { Skeleton } from './skeleton'
import { X, GripVertical, ExternalLink, MapPin, Clock, FileText } from 'lucide-react'

/**
 * 🎭 优雅详情模态面板
 * 
 * 设计理念：
 * - 居中显示，支持拖拽移动
 * - 丰富的内容展示和格式化
 * - 流畅的滚动体验
 * - 触觉反馈和微交互
 */

export interface ElegantDetailModalProps {
  refId: number
  contentId: string
  
  // 显示控制
  isOpen: boolean
  onClose: () => void
  
  // 位置控制
  initialPosition?: { x: number; y: number }
  draggable?: boolean
  
  // 尺寸控制
  maxWidth?: number
  maxHeight?: string
  
  // 内容配置
  showFullContent?: boolean
  enableMarkdown?: boolean
  showMetadata?: boolean
  
  // 行为配置
  closeOnEscape?: boolean
  closeOnBackdropClick?: boolean
  preventBodyScroll?: boolean
  
  // 回调函数
  onContentLoad?: (content: ReferenceContent) => void
  onError?: (error: Error) => void
  onPositionChange?: (position: { x: number; y: number }) => void
  
  // 样式定制
  className?: string
  
  // 调试模式
  debug?: boolean
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export const ElegantDetailModal: React.FC<ElegantDetailModalProps> = ({
  refId,
  contentId,
  isOpen,
  onClose,
  initialPosition,
  draggable = true,
  maxWidth = 600,
  maxHeight = '80vh',
  showFullContent = true,
  enableMarkdown = true,
  showMetadata = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  preventBodyScroll = true,
  onContentLoad,
  onError,
  onPositionChange,
  className,
  debug = false,
}) => {
  // 状态管理
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [referenceContent, setReferenceContent] = useState<ReferenceContent | null>(null)
  const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  
  // Store 和服务
  const { getCachedContent, setCachedContent, getContentCacheKey, updateModalPosition } = useReferenceStore()
  const { actions } = useReferenceManagerSafe()
  const animation = useModalAnimation({
    customConfig: {
      duration: isDragging ? 0.1 : undefined,
    }
  })
  
  // 调试日志
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[ElegantDetailModal-${refId}] ${message}`, data || '')
    }
  }, [debug, refId])
  
  // 加载引用内容
  const loadReferenceContent = useCallback(async () => {
    if (loadingState === 'loading') return
    
    const cacheKey = getContentCacheKey(refId, contentId)
    const cached = getCachedContent(cacheKey)
    
    if (cached) {
      log('使用缓存内容')
      setReferenceContent(cached)
      setLoadingState('success')
      onContentLoad?.(cached)
      return
    }
    
    setLoadingState('loading')
    log('开始加载详细内容')
    
    try {
      const content = await actions.getEnhancedReferenceInfo(refId, contentId)
      
      if (content) {
        const referenceData: ReferenceContent = {
          id: `${contentId}-${refId}`,
          refId,
          content: content.content || content.snippet || '',
          snippet: content.snippet || content.content || '',
          position: content.position,
          metadata: content.metadata,
          loadedAt: Date.now(),
        }
        
        setReferenceContent(referenceData)
        setCachedContent(cacheKey, referenceData)
        setLoadingState('success')
        log('详细内容加载成功')
        onContentLoad?.(referenceData)
      } else {
        throw new Error('引用内容为空')
      }
    } catch (error) {
      log('详细内容加载失败', error)
      setLoadingState('error')
      onError?.(error as Error)
    }
  }, [
    refId,
    contentId,
    loadingState,
    getContentCacheKey,
    getCachedContent,
    setCachedContent,
    actions,
    onContentLoad,
    onError,
    log
  ])
  
  // 处理拖拽
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    log('开始拖拽')
  }, [log])
  
  const handleDragEnd = useCallback((event: any, info: any) => {
    setIsDragging(false)
    
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    }
    
    setPosition(newPosition)
    updateModalPosition(newPosition)
    onPositionChange?.(newPosition)
    
    log('拖拽结束', { newPosition })
  }, [position, updateModalPosition, onPositionChange, log])
  
  // 处理关闭
  const handleClose = useCallback((reason?: string) => {
    log('关闭模态框', { reason })
    onClose()
  }, [onClose, log])
  
  // 处理背景点击
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      handleClose('backdrop')
    }
  }, [closeOnBackdropClick, handleClose])
  
  // 处理键盘事件
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose('escape')
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, handleClose])
  
  // 防止 body 滚动
  useEffect(() => {
    if (!isOpen || !preventBodyScroll) return
    
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [isOpen, preventBodyScroll])
  
  // 加载内容
  useEffect(() => {
    if (isOpen) {
      loadReferenceContent()
    }
  }, [isOpen, loadReferenceContent])
  
  // 定位到原文
  const handleJumpToOriginal = useCallback(() => {
    actions.jumpToParagraph(refId)
    handleClose('jump')
  }, [actions, refId, handleClose])
  
  // 渲染加载状态
  const renderLoadingContent = () => (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
  
  // 渲染错误状态
  const renderErrorContent = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        无法加载引用内容
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        引用内容暂时无法访问，请稍后重试
      </p>
      <Button variant="ghost" onClick={() => loadReferenceContent()}>
        重新加载
      </Button>
    </div>
  )
  
  // 渲染成功内容
  const renderSuccessContent = () => {
    if (!referenceContent) return null
    
    return (
      <>
        {/* 头部 */}
        <CardHeader className="pb-4 cursor-grab active:cursor-grabbing" data-drag-handle>
          <div 
            className="flex items-center justify-between"
            onPointerDown={(e) => draggable && dragControls.start(e)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-200/50 dark:border-blue-400/20 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{refId}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  原文引用
                </h3>
                {referenceContent.position && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {referenceContent.position.chapter && (
                      <span>{referenceContent.position.chapter} ·</span>
                    )}
                    <span>第 {referenceContent.position.index} 段</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClose('close-button')}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 拖拽提示条 */}
          {draggable && (
            <div className="flex justify-center mt-3">
              <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-600" />
            </div>
          )}
        </CardHeader>
        
        {/* 内容区域 */}
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div 
            className="flex-1 overflow-y-auto scrollbar-thin pr-2"
            style={{ maxHeight: `calc(${maxHeight} - 200px)` }}
          >
            <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {enableMarkdown && referenceContent.content ? (
                <MarkdownRenderer 
                  content={referenceContent.content}
                  className="prose-sm prose-gray dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-4"
                  disableInlineReferences={true}
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {showFullContent ? referenceContent.content : referenceContent.snippet}
                </div>
              )}
            </div>
          </div>
          
          {/* 元信息 */}
          {showMetadata && referenceContent.metadata && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {referenceContent.metadata.wordCount && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{referenceContent.metadata.wordCount} 字</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>刚刚加载</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <ExternalLink className="w-3 h-3" />
                <span>查看原文</span>
              </div>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={handleJumpToOriginal}
              className="flex-1"
              size="sm"
            >
              <MapPin className="w-4 h-4 mr-2" />
              定位原文
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => handleClose('close-button')}
              size="sm"
            >
              关闭
            </Button>
          </div>
        </CardContent>
      </>
    )
  }
  
  // 渲染内容
  const renderContent = () => {
    switch (loadingState) {
      case 'loading':
        return renderLoadingContent()
      case 'error':
        return renderErrorContent()
      case 'success':
        return renderSuccessContent()
      default:
        return null
    }
  }
  
  if (!isOpen) return null
  
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" />
        
        {/* 模态框 */}
        <motion.div
          ref={modalRef}
          className={cn(
            'relative max-w-full max-h-full',
            isDragging && 'cursor-grabbing'
          )}
          style={{ width: maxWidth }}
          variants={animation.variants}
          initial="initial"
          animate="animate"
          exit="exit"
          drag={draggable}
          dragControls={dragControls}
          dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
          dragElastic={0.05}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          whileDrag={{ 
            scale: 1.02, 
            rotateZ: isDragging ? 0.5 : 0,
            transition: { duration: 0.1 }
          }}
        >
          <Card className={cn(
            'shadow-2xl border border-gray-200/50 dark:border-gray-700/50',
            'bg-white/98 dark:bg-gray-900/98 backdrop-blur-md',
            'flex flex-col overflow-hidden',
            className
          )} style={{ height: maxHeight }}>
            {renderContent()}
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default ElegantDetailModal