/**
 * 🎨 统一动画配置常量
 *
 * 设计理念：
 * - 一致的视觉体验
 * - 性能优先的配置
 * - 易于维护和扩展
 * - 符合现代设计趋势
 */

// === 动画时长配置 ===
export const ANIMATION_DURATION = {
  // 快速交互反馈
  INSTANT: 0,
  FAST: 150,

  // 标准交互
  QUICK: 200,
  NORMAL: 300,
  MEDIUM: 400,

  // 复杂动画
  SLOW: 500,
  VERY_SLOW: 800,
} as const;

// === 缓动曲线配置 ===
export const EASING_CURVES = {
  // 标准缓动
  LINEAR: [0, 0, 1, 1],
  EASE: [0.25, 0.1, 0.25, 1],
  EASE_IN: [0.42, 0, 1, 1],
  EASE_OUT: [0, 0, 0.58, 1],
  EASE_IN_OUT: [0.42, 0, 0.58, 1],

  // 现代缓动（推荐）
  EASE_OUT_QUART: [0.25, 0.46, 0.45, 0.94], // 悬浮效果
  EASE_OUT_EXPO: [0.16, 1, 0.3, 1], // 模态框
  EASE_OUT_BACK: [0.34, 1.56, 0.64, 1], // 弹性效果
  EASE_OUT_CIRC: [0.08, 0.82, 0.17, 1], // 圆形缓动

  // 特殊效果
  BOUNCE: [0.68, -0.55, 0.265, 1.55], // 弹跳效果
  ELASTIC: [0.175, 0.885, 0.32, 1.275], // 弹性效果
} as const;

// === 引用组件专用动画配置 ===
export const REFERENCE_ANIMATIONS = {
  // 悬浮预览动画
  HOVER_PREVIEW: {
    duration: ANIMATION_DURATION.QUICK,
    ease: EASING_CURVES.EASE_OUT_QUART,
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0, to: 1 },
    y: { from: 8, to: 0 },
    stagger: 0.02, // 多个元素时的交错延迟
  },

  // 引用指示器动画
  INDICATOR: {
    duration: ANIMATION_DURATION.FAST,
    ease: EASING_CURVES.EASE_IN_OUT,
    scale: {
      hover: { from: 1, to: 1.1 },
      tap: { from: 1, to: 0.95 },
    },
    shadow: { from: 2, to: 8 },
  },

  // 模态框动画
  MODAL: {
    duration: ANIMATION_DURATION.NORMAL,
    ease: EASING_CURVES.EASE_OUT_EXPO,
    scale: { from: 0.96, to: 1 },
    opacity: { from: 0, to: 1 },
    backdropBlur: { from: 0, to: 4 },
    // 拖拽动画
    drag: {
      scale: { from: 1, to: 1.02 },
      rotate: { from: 0, to: 0.5 },
      transition: { duration: ANIMATION_DURATION.FAST },
    },
  },

  // 内容加载动画
  CONTENT_LOADING: {
    duration: ANIMATION_DURATION.MEDIUM,
    ease: EASING_CURVES.EASE_OUT_CIRC,
    opacity: { from: 0, to: 1 },
    y: { from: 16, to: 0 },
    stagger: 0.05,
  },

  // 列表动画
  LIST_ITEMS: {
    duration: ANIMATION_DURATION.QUICK,
    ease: EASING_CURVES.EASE_OUT_QUART,
    x: { from: -20, to: 0 },
    opacity: { from: 0, to: 1 },
    stagger: 0.03,
  },

  // 淡入淡出
  FADE: {
    duration: ANIMATION_DURATION.QUICK,
    ease: EASING_CURVES.EASE_IN_OUT,
    opacity: { from: 0, to: 1 },
  },

  // 滑动效果
  SLIDE: {
    duration: ANIMATION_DURATION.NORMAL,
    ease: EASING_CURVES.EASE_OUT_QUART,
    x: { from: -20, to: 0 },
    opacity: { from: 0, to: 1 },
  },
} as const;

// === 响应式动画配置 ===
export const RESPONSIVE_ANIMATIONS = {
  // 桌面端（完整动画）
  DESKTOP: {
    enableAllAnimations: true,
    useGPUAcceleration: true,
    duration: 1.0, // 倍数
  },

  // 平板端（适中动画）
  TABLET: {
    enableAllAnimations: true,
    useGPUAcceleration: true,
    duration: 0.8,
  },

  // 移动端（精简动画）
  MOBILE: {
    enableAllAnimations: true,
    useGPUAcceleration: false,
    duration: 0.6,
  },

  // 低性能设备（最小动画）
  LOW_PERFORMANCE: {
    enableAllAnimations: false,
    useGPUAcceleration: false,
    duration: 0.3,
  },

  // 偏好减少动画（无动画）
  REDUCED_MOTION: {
    enableAllAnimations: false,
    useGPUAcceleration: false,
    duration: 0,
  },
} as const;

// === GPU 优化配置 ===
export const GPU_OPTIMIZATIONS = {
  // 启用 GPU 加速的属性
  GPU_PROPERTIES: ["transform", "opacity", "filter"],

  // GPU 加速样式
  GPU_STYLES: {
    backfaceVisibility: "hidden" as const,
    perspective: 1000,
    transformStyle: "preserve-3d" as const,
    willChange: "transform, opacity",
  },

  // 禁用 GPU 加速时的替代方案
  CPU_FALLBACK: {
    willChange: "auto",
    transform: "none",
  },
} as const;

// === 无障碍动画配置 ===
export const ACCESSIBILITY_CONFIG = {
  // 默认遵循用户偏好
  RESPECT_REDUCED_MOTION: true,

  // 焦点指示器动画
  FOCUS_INDICATOR: {
    duration: ANIMATION_DURATION.FAST,
    ease: EASING_CURVES.EASE_OUT_QUART,
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0.8, to: 1 },
  },

  // 屏幕阅读器友好的动画
  SCREEN_READER_SAFE: {
    // 只使用不影响布局的动画
    allowedProperties: ["opacity", "transform"],
    duration: ANIMATION_DURATION.FAST,
  },
} as const;

// === 动画预设组合 ===
export const ANIMATION_PRESETS = {
  // 极简模式
  MINIMAL: {
    duration: ANIMATION_DURATION.FAST,
    ease: EASING_CURVES.EASE_IN_OUT,
    properties: ["opacity"],
  },

  // 标准模式
  STANDARD: {
    duration: ANIMATION_DURATION.QUICK,
    ease: EASING_CURVES.EASE_OUT_QUART,
    properties: ["opacity", "transform"],
  },

  // 华丽模式
  FANCY: {
    duration: ANIMATION_DURATION.NORMAL,
    ease: EASING_CURVES.EASE_OUT_BACK,
    properties: ["opacity", "transform", "filter"],
  },

  // 性能优先模式
  PERFORMANCE: {
    duration: ANIMATION_DURATION.FAST,
    ease: EASING_CURVES.LINEAR,
    properties: ["opacity"],
    useGPU: false,
  },
} as const;

// === 工具函数 ===

/**
 * 根据设备性能选择合适的动画配置
 */
export const getResponsiveAnimationConfig = () => {
  if (typeof window === "undefined") return RESPONSIVE_ANIMATIONS.DESKTOP;

  // 检查是否偏好减少动画
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return RESPONSIVE_ANIMATIONS.REDUCED_MOTION;
  }

  // 检查设备性能
  const navigator = window.navigator as any;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = navigator.deviceMemory || 4;

  if (hardwareConcurrency <= 2 || deviceMemory <= 2) {
    return RESPONSIVE_ANIMATIONS.LOW_PERFORMANCE;
  }

  // 检查屏幕尺寸
  if (window.matchMedia("(max-width: 768px)").matches) {
    return RESPONSIVE_ANIMATIONS.MOBILE;
  }

  if (window.matchMedia("(max-width: 1024px)").matches) {
    return RESPONSIVE_ANIMATIONS.TABLET;
  }

  return RESPONSIVE_ANIMATIONS.DESKTOP;
};

/**
 * 创建动画变体
 */
export const createAnimationVariant = (
  type: keyof typeof REFERENCE_ANIMATIONS,
  overrides?: Record<string, any>,
) => {
  const baseConfig = REFERENCE_ANIMATIONS[type];
  const responsiveConfig = getResponsiveAnimationConfig();

  return {
    ...baseConfig,
    duration: baseConfig.duration * responsiveConfig.duration,
    ...overrides,
  };
};

/**
 * 生成 Framer Motion 变体
 */
export const generateMotionVariants = (config: any) => {
  const { duration, ease, scale, opacity, x, y, stagger } = config;

  return {
    initial: {
      scale: scale?.from ?? 1,
      opacity: opacity?.from ?? 0,
      x: x?.from ?? 0,
      y: y?.from ?? 0,
    },
    animate: {
      scale: scale?.to ?? 1,
      opacity: opacity?.to ?? 1,
      x: x?.to ?? 0,
      y: y?.to ?? 0,
    },
    exit: {
      scale: scale?.from ?? 1,
      opacity: opacity?.from ?? 0,
      x: x?.from ?? 0,
      y: y?.from ?? 0,
    },
    transition: {
      duration,
      ease,
      staggerChildren: stagger,
    },
  };
};

// 导出所有配置
export default {
  ANIMATION_DURATION,
  EASING_CURVES,
  REFERENCE_ANIMATIONS,
  RESPONSIVE_ANIMATIONS,
  GPU_OPTIMIZATIONS,
  ACCESSIBILITY_CONFIG,
  ANIMATION_PRESETS,
  getResponsiveAnimationConfig,
  createAnimationVariant,
  generateMotionVariants,
};
