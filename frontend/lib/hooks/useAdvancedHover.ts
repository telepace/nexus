import { useCallback, useRef, useEffect, useState } from 'react'
import { useReferenceStore } from '@/lib/stores/referenceStore'

/**
 * 🎯 高级悬浮行为管理 Hook
 * 
 * 新增功能：
 * - 智能预测用户意图
 * - 磁吸效果优化
 * - 连续悬浮路径跟踪
 * - 鼠标速度感知
 * - 智能延迟调整
 */

export interface AdvancedHoverOptions {
  refId: number
  contentId: string
  
  // 智能行为配置
  enableIntentPrediction?: boolean
  enableMagnetEffect?: boolean
  enablePathTracking?: boolean
  enableSpeedSensing?: boolean
  
  // 高级延迟配置
  baseDelay?: number
  minDelay?: number
  maxDelay?: number
  speedThreshold?: number
  
  // 磁吸配置
  magnetRadius?: number
  magnetStrength?: number
  
  // 回调函数
  onIntentDetected?: (intent: 'hover' | 'pass') => void
  onSpeedChange?: (speed: number) => void
  
  debug?: boolean
}

interface MousePosition {
  x: number
  y: number
  timestamp: number
}

interface HoverIntent {
  direction: 'towards' | 'away' | 'parallel'
  speed: number
  confidence: number
}

export const useAdvancedHover = (options: AdvancedHoverOptions) => {
  const {
    refId,
    contentId,
    enableIntentPrediction = true,
    enableMagnetEffect = true,
    enablePathTracking = true,
    enableSpeedSensing = true,
    baseDelay = 150,
    minDelay = 50,
    maxDelay = 300,
    speedThreshold = 100,
    magnetRadius = 20,
    magnetStrength = 0.3,
    onIntentDetected,
    onSpeedChange,
    debug = false,
  } = options

  // 状态管理
  const [mouseHistory, setMouseHistory] = useState<MousePosition[]>([])
  const [currentIntent, setCurrentIntent] = useState<HoverIntent | null>(null)
  const [adaptiveDelay, setAdaptiveDelay] = useState(baseDelay)
  const [isMagnetActive, setIsMagnetActive] = useState(false)
  
  const elementRef = useRef<HTMLElement | null>(null)
  const lastMoveTime = useRef<number>(0)
  const intentTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Store hooks
  const { hoveredRef, setHoveredRef, config } = useReferenceStore()
  
  // 调试日志
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[AdvancedHover-${refId}] ${message}`, data || '')
    }
  }, [debug, refId])

  // 计算鼠标速度
  const calculateMouseSpeed = useCallback((history: MousePosition[]) => {
    if (history.length < 2) return 0
    
    const recent = history.slice(-2)
    const [prev, curr] = recent
    
    const deltaX = curr.x - prev.x
    const deltaY = curr.y - prev.y
    const deltaTime = curr.timestamp - prev.timestamp
    
    if (deltaTime === 0) return 0
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    return distance / deltaTime * 1000 // px/s
  }, [])

  // 预测用户意图
  const predictHoverIntent = useCallback((
    mousePos: MousePosition,
    elementRect: DOMRect
  ): HoverIntent => {
    const centerX = elementRect.left + elementRect.width / 2
    const centerY = elementRect.top + elementRect.height / 2
    
    // 计算鼠标相对于元素中心的方向向量
    const toCenter = {
      x: centerX - mousePos.x,
      y: centerY - mousePos.y
    }
    
    const distanceToCenter = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y)
    
    // 基于历史记录计算移动方向
    if (mouseHistory.length >= 3) {
      const recentHistory = mouseHistory.slice(-3)
      const velocityX = recentHistory[2].x - recentHistory[0].x
      const velocityY = recentHistory[2].y - recentHistory[0].y
      
      // 计算速度向量与指向中心向量的点积
      const dotProduct = (velocityX * toCenter.x + velocityY * toCenter.y)
      const velocityMagnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
      const toCenterMagnitude = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y)
      
      const cosAngle = dotProduct / (velocityMagnitude * toCenterMagnitude || 1)
      
      let direction: 'towards' | 'away' | 'parallel'
      let confidence = Math.abs(cosAngle)
      
      if (cosAngle > 0.3) {
        direction = 'towards'
      } else if (cosAngle < -0.3) {
        direction = 'away'
      } else {
        direction = 'parallel'
        confidence = 1 - Math.abs(cosAngle)
      }
      
      const speed = calculateMouseSpeed(recentHistory)
      
      return { direction, speed, confidence }
    }
    
    // 默认基于距离判断
    return {
      direction: distanceToCenter < magnetRadius ? 'towards' : 'parallel',
      speed: 0,
      confidence: 0.5
    }
  }, [mouseHistory, calculateMouseSpeed, magnetRadius])

  // 智能延迟调整
  const calculateAdaptiveDelay = useCallback((intent: HoverIntent) => {
    if (!enableSpeedSensing) return baseDelay
    
    let delay = baseDelay
    
    // 基于速度调整延迟
    if (intent.speed > speedThreshold) {
      // 快速移动时增加延迟，避免意外触发
      delay = Math.min(maxDelay, baseDelay + (intent.speed - speedThreshold) * 0.5)
    } else {
      // 慢速移动时减少延迟，提升响应性
      delay = Math.max(minDelay, baseDelay - (speedThreshold - intent.speed) * 0.3)
    }
    
    // 基于意图调整延迟
    if (intent.direction === 'towards' && intent.confidence > 0.7) {
      delay *= 0.7 // 明确意图时减少延迟
    } else if (intent.direction === 'away') {
      delay *= 1.5 // 远离时增加延迟
    }
    
    return Math.round(delay)
  }, [enableSpeedSensing, baseDelay, minDelay, maxDelay, speedThreshold])

  // 磁吸效果计算
  const calculateMagnetEffect = useCallback((
    mousePos: MousePosition,
    elementRect: DOMRect
  ) => {
    if (!enableMagnetEffect) return { x: mousePos.x, y: mousePos.y }
    
    const centerX = elementRect.left + elementRect.width / 2
    const centerY = elementRect.top + elementRect.height / 2
    
    const deltaX = centerX - mousePos.x
    const deltaY = centerY - mousePos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance <= magnetRadius) {
      const magnetForce = (magnetRadius - distance) / magnetRadius * magnetStrength
      
      return {
        x: mousePos.x + deltaX * magnetForce,
        y: mousePos.y + deltaY * magnetForce
      }
    }
    
    return { x: mousePos.x, y: mousePos.y }
  }, [enableMagnetEffect, magnetRadius, magnetStrength])

  // 鼠标移动处理
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const now = performance.now()
    const newPosition: MousePosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now
    }
    
    // 更新鼠标历史记录（保持最近10个位置）
    setMouseHistory(prev => [...prev.slice(-9), newPosition])
    
    if (elementRef.current && enableIntentPrediction) {
      const rect = elementRef.current.getBoundingClientRect()
      const intent = predictHoverIntent(newPosition, rect)
      
      setCurrentIntent(intent)
      onIntentDetected?.(intent.direction === 'towards' ? 'hover' : 'pass')
      
      // 计算自适应延迟
      const newDelay = calculateAdaptiveDelay(intent)
      setAdaptiveDelay(newDelay)
      
      // 检查磁吸效果
      const magnetPos = calculateMagnetEffect(newPosition, rect)
      const isInMagnetRange = magnetPos.x !== newPosition.x || magnetPos.y !== newPosition.y
      setIsMagnetActive(isInMagnetRange)
      
      // 速度变化回调
      onSpeedChange?.(intent.speed)
      
      log('意图预测', {
        direction: intent.direction,
        speed: Math.round(intent.speed),
        confidence: Math.round(intent.confidence * 100) + '%',
        adaptiveDelay: newDelay,
        magnetActive: isInMagnetRange
      })
    }
    
    lastMoveTime.current = now
  }, [
    enableIntentPrediction,
    predictHoverIntent,
    calculateAdaptiveDelay,
    calculateMagnetEffect,
    onIntentDetected,
    onSpeedChange,
    log
  ])

  // 鼠标进入处理
  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    if (!elementRef.current) return
    
    // 立即开始意图分析
    const rect = elementRef.current.getBoundingClientRect()
    const mousePos: MousePosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }
    
    setMouseHistory([mousePos])
    
    if (enableIntentPrediction) {
      const intent = predictHoverIntent(mousePos, rect)
      setCurrentIntent(intent)
      
      const delay = calculateAdaptiveDelay(intent)
      setAdaptiveDelay(delay)
      
      log('进入元素', { intent, delay })
      
      // 使用自适应延迟
      intentTimeoutRef.current = setTimeout(() => {
        if (intent.direction === 'towards' || intent.confidence > 0.6) {
          setHoveredRef(refId)
        }
      }, delay)
    } else {
      // 使用基础延迟
      intentTimeoutRef.current = setTimeout(() => {
        setHoveredRef(refId)
      }, baseDelay)
    }
  }, [
    refId,
    enableIntentPrediction,
    predictHoverIntent,
    calculateAdaptiveDelay,
    setHoveredRef,
    baseDelay,
    log
  ])

  // 鼠标离开处理
  const handleMouseLeave = useCallback(() => {
    if (intentTimeoutRef.current) {
      clearTimeout(intentTimeoutRef.current)
      intentTimeoutRef.current = null
    }
    
    // 清理状态
    setMouseHistory([])
    setCurrentIntent(null)
    setIsMagnetActive(false)
    
    if (hoveredRef === refId) {
      setHoveredRef(null)
    }
    
    log('离开元素')
  }, [hoveredRef, refId, setHoveredRef, log])

  // 设置元素引用
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element
  }, [])

  // 全局鼠标移动监听
  useEffect(() => {
    if (enablePathTracking) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [enablePathTracking, handleMouseMove])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intentTimeoutRef.current) {
        clearTimeout(intentTimeoutRef.current)
      }
    }
  }, [])

  return {
    // 状态
    currentIntent,
    adaptiveDelay,
    isMagnetActive,
    isHovered: hoveredRef === refId,
    
    // 事件处理器
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    
    // 元素引用
    ref: setElementRef,
    
    // 调试信息
    debugInfo: debug ? {
      mouseHistory: mouseHistory.slice(-3),
      intent: currentIntent,
      delay: adaptiveDelay,
      magnetActive: isMagnetActive
    } : undefined
  }
}

export default useAdvancedHover