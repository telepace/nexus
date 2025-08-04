import { useCallback, useRef, useEffect } from 'react'
import { useReferenceStore } from '@/lib/stores/referenceStore'

/**
 * 🎨 统一引用动画管理 Hook
 * 
 * 设计理念：
 * - GPU 加速优化，60fps 流畅体验
 * - 设备性能自适应，低端设备自动降级
 * - 统一动画配置，一致的视觉体验
 * - 可组合的动画组合，灵活性最大化
 */

export type AnimationType = 'hover' | 'modal' | 'indicator' | 'preview' | 'fade' | 'scale' | 'slide'

export interface AnimationConfig {
  duration: number
  ease: string | number[]
  delay?: number
  
  // 变换属性
  scale?: { from?: number; to?: number }
  opacity?: { from?: number; to?: number }
  y?: { from?: number; to?: number }
  x?: { from?: number; to?: number }
  rotate?: { from?: number; to?: number }
  
  // 特殊效果
  backdropBlur?: { from?: number; to?: number }
  shadow?: { from?: number; to?: number }
  
  // 控制选项
  useGPU?: boolean
  respectMotionPreference?: boolean
}

export interface AnimationVariants {
  initial: Record<string, any>
  animate: Record<string, any>
  exit?: Record<string, any>
  whileHover?: Record<string, any>
  whileTap?: Record<string, any>
  transition: Record<string, any>
}

export interface UseReferenceAnimationOptions {
  type: AnimationType
  customConfig?: Partial<AnimationConfig>
  disabled?: boolean
  debug?: boolean
}

export interface UseReferenceAnimationReturn {
  // Framer Motion 变体
  variants: AnimationVariants
  
  // 动画控制
  startAnimation: () => void
  stopAnimation: () => void
  resetAnimation: () => void
  
  // 状态
  isAnimating: boolean
  
  // 配置
  config: AnimationConfig
}

// 预设动画配置
const animationPresets: Record<AnimationType, AnimationConfig> = {
  hover: {
    duration: 0.2,
    ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0, to: 1 },
    y: { from: 8, to: 0 },
    useGPU: true,
    respectMotionPreference: true,
  },
  
  modal: {
    duration: 0.3,
    ease: [0.16, 1, 0.3, 1], // easeOutExpo
    scale: { from: 0.96, to: 1 },
    opacity: { from: 0, to: 1 },
    backdropBlur: { from: 0, to: 4 },
    useGPU: true,
    respectMotionPreference: true,
  },
  
  indicator: {
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1], // easeInOut
    scale: { from: 1, to: 1.1 },
    shadow: { from: 2, to: 8 },
    useGPU: true,
    respectMotionPreference: true,
  },
  
  preview: {
    duration: 0.25,
    ease: [0.34, 1.56, 0.64, 1], // easeOutBack
    scale: { from: 0.9, to: 1 },
    opacity: { from: 0, to: 1 },
    y: { from: 10, to: 0 },
    useGPU: true,
    respectMotionPreference: true,
  },
  
  fade: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1],
    opacity: { from: 0, to: 1 },
    useGPU: false,
    respectMotionPreference: true,
  },
  
  scale: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1],
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0, to: 1 },
    useGPU: true,
    respectMotionPreference: true,
  },
  
  slide: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
    x: { from: -20, to: 0 },
    opacity: { from: 0, to: 1 },
    useGPU: true,
    respectMotionPreference: true,
  },
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Hook 实现
export const useReferenceAnimation = (options: UseReferenceAnimationOptions): UseReferenceAnimationReturn => {
  const { type, customConfig = {}, disabled = false, debug = false } = options
  
  // Store 状态
  const { 
    config: storeConfig, 
    isLowPerformanceDevice,
    animationFrameId,
    setAnimationFrame 
  } = useReferenceStore()
  
  const animationRef = useRef<boolean>(false)
  const shouldReduceMotion = prefersReducedMotion()
  
  // 合并配置
  const baseConfig = animationPresets[type]
  const mergedConfig: AnimationConfig = {
    ...baseConfig,
    ...customConfig,
    // 性能优化配置
    duration: isLowPerformanceDevice 
      ? Math.min(baseConfig.duration, 0.15) 
      : (customConfig.duration ?? baseConfig.duration),
    useGPU: isLowPerformanceDevice 
      ? false 
      : (customConfig.useGPU ?? baseConfig.useGPU ?? storeConfig.useGPUAcceleration),
  }
  
  // 调试日志
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[ReferenceAnimation-${type}] ${message}`, data || '')
    }
  }, [debug, type])
  
  // 根据配置生成动画值
  const generateAnimationValue = useCallback((property: keyof AnimationConfig, phase: 'from' | 'to') => {
    const propConfig = mergedConfig[property] as any
    if (!propConfig) return undefined
    
    return propConfig[phase]
  }, [mergedConfig])
  
  // 生成 CSS transform 属性（GPU优化）
  const generateTransform = useCallback(() => {
    if (!mergedConfig.useGPU) return {}
    
    const transforms: string[] = []
    
    if (mergedConfig.scale) {
      transforms.push(`scale(var(--scale, 1))`)
    }
    if (mergedConfig.x) {
      transforms.push(`translateX(var(--x, 0px))`)
    }
    if (mergedConfig.y) {
      transforms.push(`translateY(var(--y, 0px))`)
    }
    if (mergedConfig.rotate) {
      transforms.push(`rotate(var(--rotate, 0deg))`)
    }
    
    return transforms.length > 0 ? {
      transform: transforms.join(' '),
      transformOrigin: 'center',
      backfaceVisibility: 'hidden' as const,
      perspective: 1000,
    } : {}
  }, [mergedConfig])
  
  // 构建 Framer Motion 变体
  const variants: AnimationVariants = useCallback(() => {
    // 如果禁用动画或用户偏好减少动画
    if (disabled || !storeConfig.enableAnimations || (shouldReduceMotion && mergedConfig.respectMotionPreference)) {
      log('动画被禁用或用户偏好减少动画')
      return {
        initial: {},
        animate: {},
        exit: {},
        transition: { duration: 0 }
      }
    }
    
    const initial: Record<string, any> = {}
    const animate: Record<string, any> = {}
    const exit: Record<string, any> = {}
    
    // 处理各种动画属性
    if (mergedConfig.opacity) {
      initial.opacity = generateAnimationValue('opacity', 'from') ?? 0
      animate.opacity = generateAnimationValue('opacity', 'to') ?? 1
      exit.opacity = generateAnimationValue('opacity', 'from') ?? 0
    }
    
    if (mergedConfig.scale) {
      initial.scale = generateAnimationValue('scale', 'from') ?? 1
      animate.scale = generateAnimationValue('scale', 'to') ?? 1
      exit.scale = generateAnimationValue('scale', 'from') ?? 1
    }
    
    if (mergedConfig.x) {
      initial.x = generateAnimationValue('x', 'from') ?? 0
      animate.x = generateAnimationValue('x', 'to') ?? 0
      exit.x = generateAnimationValue('x', 'from') ?? 0
    }
    
    if (mergedConfig.y) {
      initial.y = generateAnimationValue('y', 'from') ?? 0
      animate.y = generateAnimationValue('y', 'to') ?? 0
      exit.y = generateAnimationValue('y', 'from') ?? 0
    }
    
    if (mergedConfig.rotate) {
      initial.rotate = generateAnimationValue('rotate', 'from') ?? 0
      animate.rotate = generateAnimationValue('rotate', 'to') ?? 0
      exit.rotate = generateAnimationValue('rotate', 'from') ?? 0
    }
    
    // 特殊效果
    if (mergedConfig.backdropBlur) {
      initial.backdropFilter = `blur(${generateAnimationValue('backdropBlur', 'from') ?? 0}px)`
      animate.backdropFilter = `blur(${generateAnimationValue('backdropBlur', 'to') ?? 4}px)`
      exit.backdropFilter = `blur(${generateAnimationValue('backdropBlur', 'from') ?? 0}px)`
    }
    
    // 悬浮和点击效果
    const whileHover = type === 'indicator' ? {
      scale: 1.05,
      transition: { duration: 0.1 }
    } : {}
    
    const whileTap = {
      scale: 0.98,
      transition: { duration: 0.05 }
    }
    
    const transition = {
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay || 0,
    }
    
    log('生成动画变体', { initial, animate, exit, transition })
    
    return {
      initial,
      animate,
      exit,
      whileHover,
      whileTap,
      transition,
    }
  }, [
    disabled, 
    storeConfig.enableAnimations, 
    shouldReduceMotion, 
    mergedConfig, 
    generateAnimationValue, 
    type, 
    log
  ])()
  
  // 动画控制方法
  const startAnimation = useCallback(() => {
    if (disabled) return
    
    animationRef.current = true
    log('开始动画')
    
    // 注册动画帧
    const frameId = requestAnimationFrame(() => {
      // 动画开始回调
    })
    setAnimationFrame(frameId)
  }, [disabled, log, setAnimationFrame])
  
  const stopAnimation = useCallback(() => {
    animationRef.current = false
    log('停止动画')
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      setAnimationFrame(null)
    }
  }, [log, animationFrameId, setAnimationFrame])
  
  const resetAnimation = useCallback(() => {
    stopAnimation()
    log('重置动画')
  }, [stopAnimation, log])
  
  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [animationFrameId])
  
  return {
    variants,
    startAnimation,
    stopAnimation,
    resetAnimation,
    isAnimating: animationRef.current,
    config: mergedConfig,
  }
}

// 便捷的预设 Hook
export const useHoverAnimation = (customConfig?: Partial<AnimationConfig>) => {
  return useReferenceAnimation({ type: 'hover', customConfig })
}

export const useModalAnimation = (customConfig?: Partial<AnimationConfig>) => {
  return useReferenceAnimation({ type: 'modal', customConfig })
}

export const useIndicatorAnimation = (customConfig?: Partial<AnimationConfig>) => {
  return useReferenceAnimation({ type: 'indicator', customConfig })
}

export const usePreviewAnimation = (customConfig?: Partial<AnimationConfig>) => {
  return useReferenceAnimation({ type: 'preview', customConfig })
}

// 导出类型
export type { 
  AnimationType, 
  AnimationConfig, 
  AnimationVariants, 
  UseReferenceAnimationOptions, 
  UseReferenceAnimationReturn 
}