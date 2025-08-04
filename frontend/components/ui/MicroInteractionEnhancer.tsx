"use client"

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * 🎨 微交互增强器
 * 
 * 设计理念：
 * - 极致的细节打磨
 * - 物理感的交互反馈
 * - 情感化设计语言
 * - 性能优先的实现
 */

export interface MicroInteractionEnhancerProps {
  children: React.ReactElement
  
  // 微交互类型
  type?: 'button' | 'card' | 'indicator' | 'modal'
  
  // 物理效果配置
  enablePhysics?: boolean
  enableParticles?: boolean
  enableRipple?: boolean
  enableGlow?: boolean
  enableBreathe?: boolean
  
  // 高级配置
  sensitivity?: number
  intensity?: number
  dampening?: number
  
  // 个性化配置
  primaryColor?: string
  secondaryColor?: string
  
  // 回调函数
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
  
  // 调试模式
  debug?: boolean
  
  className?: string
}

// 粒子系统
interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

// 涟漪效果
interface Ripple {
  id: string
  x: number
  y: number
  startTime: number
  duration: number
}

export const MicroInteractionEnhancer: React.FC<MicroInteractionEnhancerProps> = ({
  children,
  type = 'button',
  enablePhysics = true,
  enableParticles = false,
  enableRipple = true,
  enableGlow = true,
  enableBreathe = false,
  sensitivity = 1,
  intensity = 1,
  dampening = 0.8,
  primaryColor = '#3b82f6',
  secondaryColor = '#8b5cf6',
  onInteractionStart,
  onInteractionEnd,
  debug = false,
  className,
}) => {
  // 状态管理
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<Ripple[]>([])
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  
  // Motion values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const scale = useMotionValue(1)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  
  // Spring configurations
  const springConfig = { damping: 25, stiffness: 300 }
  const smoothMouseX = useSpring(mouseX, springConfig)
  const smoothMouseY = useSpring(mouseY, springConfig)
  const smoothScale = useSpring(scale, springConfig)
  const smoothRotateX = useSpring(rotateX, springConfig)
  const smoothRotateY = useSpring(rotateY, springConfig)
  
  // Transform calculations
  const shadowX = useTransform(smoothMouseX, [-100, 100], [-20, 20])
  const shadowY = useTransform(smoothMouseY, [-100, 100], [-20, 20])
  const glowIntensity = useTransform(smoothScale, [1, 1.05], [0, 0.6])
  
  // 日志函数
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[MicroInteraction] ${message}`, data || '')
    }
  }, [debug])

  // 创建粒子
  const createParticle = useCallback((x: number, y: number): Particle => {
    const angle = Math.random() * Math.PI * 2
    const speed = (Math.random() * 3 + 1) * intensity
    const life = (Math.random() * 60 + 40) * intensity
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.5 ? primaryColor : secondaryColor,
    }
  }, [intensity, primaryColor, secondaryColor])

  // 创建涟漪
  const createRipple = useCallback((x: number, y: number): Ripple => ({
    id: Math.random().toString(36).substr(2, 9),
    x,
    y,
    startTime: Date.now(),
    duration: 800,
  }), [])

  // 更新粒子系统
  const updateParticles = useCallback(() => {
    setParticles(prev => 
      prev
        .map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.1, // 重力效果
          vx: particle.vx * dampening,
          life: particle.life - 1,
        }))
        .filter(particle => particle.life > 0)
    )
  }, [dampening])

  // 更新涟漪
  const updateRipples = useCallback(() => {
    const now = Date.now()
    setRipples(prev => 
      prev.filter(ripple => now - ripple.startTime < ripple.duration)
    )
  }, [])

  // 动画循环
  const animate = useCallback(() => {
    if (enableParticles) updateParticles()
    if (enableRipple) updateRipples()
    
    if (particles.length > 0 || ripples.length > 0) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [enableParticles, enableRipple, updateParticles, updateRipples, particles.length, ripples.length])

  // 鼠标移动处理
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current || !enablePhysics) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const x = (event.clientX - centerX) * sensitivity
    const y = (event.clientY - centerY) * sensitivity
    
    mouseX.set(x)
    mouseY.set(y)
    
    // 3D 倾斜效果
    if (type === 'card' || type === 'modal') {
      rotateX.set(-y * 0.1)
      rotateY.set(x * 0.1)
    }
    
    log('鼠标移动', { x, y })
  }, [enablePhysics, sensitivity, mouseX, mouseY, rotateX, rotateY, type, log])

  // 鼠标进入处理
  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    setIsHovered(true)
    scale.set(1.02 * intensity)
    
    if (enableBreathe) {
      // 启动呼吸动画
    }
    
    onInteractionStart?.()
    log('鼠标进入')
    
    // 传递事件给子组件
    children.props.onMouseEnter?.(event)
  }, [scale, intensity, enableBreathe, onInteractionStart, log, children.props])

  // 鼠标离开处理
  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    setIsHovered(false)
    setIsPressed(false)
    
    scale.set(1)
    mouseX.set(0)
    mouseY.set(0)
    rotateX.set(0)
    rotateY.set(0)
    
    onInteractionEnd?.()
    log('鼠标离开')
    
    // 传递事件给子组件
    children.props.onMouseLeave?.(event)
  }, [scale, mouseX, mouseY, rotateX, rotateY, onInteractionEnd, log, children.props])

  // 鼠标按下处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsPressed(true)
    scale.set(0.98)
    
    if (enableRipple && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const newRipple = createRipple(x, y)
      setRipples(prev => [...prev, newRipple])
    }
    
    if (enableParticles && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      // 创建多个粒子
      const newParticles = Array.from({ length: 8 }, () => createParticle(x, y))
      setParticles(prev => [...prev, ...newParticles])
    }
    
    log('鼠标按下')
    
    // 传递事件给子组件
    children.props.onMouseDown?.(event)
  }, [scale, enableRipple, enableParticles, createRipple, createParticle, log, children.props])

  // 鼠标释放处理
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    setIsPressed(false)
    scale.set(isHovered ? 1.02 * intensity : 1)
    
    log('鼠标释放')
    
    // 传递事件给子组件
    children.props.onMouseUp?.(event)
  }, [scale, isHovered, intensity, log, children.props])

  // 启动动画循环
  useEffect(() => {
    if ((particles.length > 0 || ripples.length > 0) && !animationRef.current) {
      animationRef.current = requestAnimationFrame(animate)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
    }
  }, [particles.length, ripples.length, animate])

  // 渲染粒子
  const renderParticles = () => {
    if (!enableParticles) return null
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.life / particle.maxLife,
            }}
          />
        ))}
      </div>
    )
  }

  // 渲染涟漪
  const renderRipples = () => {
    if (!enableRipple) return null
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-inherit">
        {ripples.map(ripple => {
          const progress = (Date.now() - ripple.startTime) / ripple.duration
          const scale = progress * 4
          const opacity = 1 - progress
          
          return (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full border-2"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 0,
                height: 0,
                borderColor: primaryColor,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: opacity,
              }}
            />
          )
        })}
      </div>
    )
  }

  // 渲染发光效果
  const renderGlow = () => {
    if (!enableGlow || !isHovered) return null
    
    return (
      <motion.div
        className="absolute inset-0 rounded-inherit pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor}20, transparent)`,
          opacity: glowIntensity,
        }}
      />
    )
  }

  // 增强后的子组件
  const enhancedChild = React.cloneElement(children, {
    ...children.props,
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    className: cn(children.props.className, className),
  })

  return (
    <motion.div
      ref={containerRef}
      className="relative"
      style={{
        scale: smoothScale,
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
      }}
    >
      {/* 阴影效果 */}
      {enablePhysics && (
        <motion.div
          className="absolute inset-0 rounded-inherit opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent, rgba(0,0,0,0.1))',
            transform: `translate(${shadowX}px, ${shadowY}px)`,
            filter: 'blur(8px)',
          }}
        />
      )}
      
      {/* 发光效果 */}
      {renderGlow()}
      
      {/* 增强的子组件 */}
      {enhancedChild}
      
      {/* 粒子系统 */}
      {renderParticles()}
      
      {/* 涟漪效果 */}
      {renderRipples()}
      
      {/* 调试信息 */}
      {debug && (
        <div className="absolute top-0 right-0 p-2 bg-black/80 text-white text-xs font-mono rounded z-50">
          <div>Hover: {isHovered ? 'Y' : 'N'}</div>
          <div>Press: {isPressed ? 'Y' : 'N'}</div>
          <div>Particles: {particles.length}</div>
          <div>Ripples: {ripples.length}</div>
        </div>
      )}
    </motion.div>
  )
}

export default MicroInteractionEnhancer