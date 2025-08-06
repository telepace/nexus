import { useState, useEffect, useCallback } from "react";
import { useReferenceStore } from "@/lib/stores/referenceStore";

/**
 * 📱 响应式引用交互 Hook
 *
 * 设计理念：
 * - 设备类型智能检测
 * - 触摸手势优化
 * - 渐进式功能降级
 * - 性能自适应调整
 */

export interface ResponsiveReferenceOptions {
  refId: number;
  contentId: string;

  // 响应式配置
  enableAdaptiveUI?: boolean;
  enableTouchOptimization?: boolean;
  enableGestureRecognition?: boolean;

  // 移动端特殊配置
  mobileHoverMode?: "disabled" | "tap" | "long-press" | "double-tap";
  tabletHoverMode?: "hybrid" | "desktop" | "mobile";

  // 性能配置
  enablePerformanceOptimization?: boolean;

  // 回调函数
  onDeviceTypeDetected?: (deviceType: DeviceType) => void;
  onGestureDetected?: (gesture: GestureType) => void;

  debug?: boolean;
}

export type DeviceType = "mobile" | "tablet" | "desktop" | "tv";
export type GestureType =
  | "tap"
  | "double-tap"
  | "long-press"
  | "swipe"
  | "pinch";
export type ViewportSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface DeviceCapabilities {
  hasTouch: boolean;
  hasHover: boolean;
  hasFinePointer: boolean;
  supportsForceTouch: boolean;
  screenSize: ViewportSize;
  pixelRatio: number;
  isLowPowerMode: boolean;
}

interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isLongPress: boolean;
  touchCount: number;
}

export const useResponsiveReference = (options: ResponsiveReferenceOptions) => {
  const {
    refId,
    contentId,
    enableAdaptiveUI = true,
    enableTouchOptimization = true,
    enableGestureRecognition = true,
    mobileHoverMode = "tap",
    tabletHoverMode = "hybrid",
    enablePerformanceOptimization = true,
    onDeviceTypeDetected,
    onGestureDetected,
    debug = false,
  } = options;

  // 状态管理
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(
    null,
  );
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(false);

  // Store hooks
  const { config, updateConfig } = useReferenceStore();

  // 日志函数
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[ResponsiveReference-${refId}] ${message}`, data || "");
      }
    },
    [debug, refId],
  );

  // 检测设备类型和能力
  const detectDeviceCapabilities = useCallback((): DeviceCapabilities => {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const supportsForceTouch = "ontouchforcechange" in window;

    // 检测屏幕尺寸
    const width = window.innerWidth;
    let screenSize: ViewportSize;

    if (width < 640) screenSize = "xs";
    else if (width < 768) screenSize = "sm";
    else if (width < 1024) screenSize = "md";
    else if (width < 1280) screenSize = "lg";
    else if (width < 1536) screenSize = "xl";
    else screenSize = "2xl";

    // 检测设备性能
    const pixelRatio = window.devicePixelRatio || 1;
    const isLowPowerMode =
      // @ts-ignore
      navigator.hardwareConcurrency <= 2 ||
      // @ts-ignore
      navigator.deviceMemory <= 2 ||
      pixelRatio > 2;

    return {
      hasTouch,
      hasHover,
      hasFinePointer,
      supportsForceTouch,
      screenSize,
      pixelRatio,
      isLowPowerMode,
    };
  }, []);

  // 基于设备能力确定设备类型
  const determineDeviceType = useCallback(
    (caps: DeviceCapabilities): DeviceType => {
      const { hasTouch, hasHover, hasFinePointer, screenSize } = caps;

      // TV/大屏设备
      if (screenSize === "2xl" && !hasTouch && hasHover) {
        return "tv";
      }

      // 桌面设备
      if (!hasTouch && hasHover && hasFinePointer) {
        return "desktop";
      }

      // 平板设备
      if (hasTouch && (screenSize === "md" || screenSize === "lg")) {
        return "tablet";
      }

      // 移动设备
      if (hasTouch && (screenSize === "xs" || screenSize === "sm")) {
        return "mobile";
      }

      // 混合设备（如 Surface）
      if (hasTouch && hasHover && hasFinePointer) {
        return screenSize === "xs" || screenSize === "sm" ? "mobile" : "tablet";
      }

      // 默认为桌面
      return "desktop";
    },
    [],
  );

  // 应用自适应配置
  const applyAdaptiveConfiguration = useCallback(
    (deviceType: DeviceType, capabilities: DeviceCapabilities) => {
      if (!enableAdaptiveUI) return;

      let adaptiveConfig = { ...config };

      switch (deviceType) {
        case "mobile":
          adaptiveConfig = {
            ...adaptiveConfig,
            hoverDelay:
              mobileHoverMode === "disabled"
                ? 0
                : mobileHoverMode === "long-press"
                  ? 500
                  : 150,
            hideDelay: 100,
            animationDuration: capabilities.isLowPowerMode ? 150 : 200,
            enableAnimations: !capabilities.isLowPowerMode,
            useGPUAcceleration: false,
            maxPreviewLength: 150, // 移动端显示更少文字
          };
          break;

        case "tablet":
          const mode = tabletHoverMode;
          adaptiveConfig = {
            ...adaptiveConfig,
            hoverDelay:
              mode === "mobile" ? 300 : mode === "desktop" ? 150 : 200,
            hideDelay: 150,
            animationDuration: capabilities.isLowPowerMode ? 200 : 250,
            enableAnimations: true,
            useGPUAcceleration: !capabilities.isLowPowerMode,
            maxPreviewLength: 180,
          };
          break;

        case "desktop":
          adaptiveConfig = {
            ...adaptiveConfig,
            hoverDelay: 150,
            hideDelay: 200,
            animationDuration: 300,
            enableAnimations: true,
            useGPUAcceleration: true,
            maxPreviewLength: 200,
          };
          break;

        case "tv":
          adaptiveConfig = {
            ...adaptiveConfig,
            hoverDelay: 100, // TV 通常有快速响应需求
            hideDelay: 300,
            animationDuration: 400, // 大屏幕可以有更多动画
            enableAnimations: true,
            useGPUAcceleration: true,
            maxPreviewLength: 300, // 大屏可显示更多内容
          };
          break;
      }

      // 性能优化
      if (enablePerformanceOptimization && capabilities.isLowPowerMode) {
        adaptiveConfig = {
          ...adaptiveConfig,
          animationDuration: Math.min(adaptiveConfig.animationDuration, 150),
          enableAnimations: false,
          useGPUAcceleration: false,
          maxCacheSize: Math.floor(adaptiveConfig.maxCacheSize / 2),
        };
      }

      updateConfig(adaptiveConfig);
      setIsAdaptiveMode(true);

      log("应用自适应配置", {
        deviceType,
        isLowPowerMode: capabilities.isLowPowerMode,
        config: adaptiveConfig,
      });
    },
    [
      enableAdaptiveUI,
      enablePerformanceOptimization,
      config,
      mobileHoverMode,
      tabletHoverMode,
      updateConfig,
      log,
    ],
  );

  // 手势识别处理
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enableGestureRecognition || !enableTouchOptimization) return;

      const touch = event.touches[0];
      const newTouchState: TouchState = {
        startTime: Date.now(),
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isLongPress: false,
        touchCount: event.touches.length,
      };

      setTouchState(newTouchState);

      // 长按检测
      if (mobileHoverMode === "long-press") {
        setTimeout(() => {
          setTouchState((prev) => {
            if (prev && Date.now() - prev.startTime >= 500) {
              onGestureDetected?.("long-press");
              return { ...prev, isLongPress: true };
            }
            return prev;
          });
        }, 500);
      }

      log("触摸开始", { touchCount: event.touches.length });
    },
    [
      enableGestureRecognition,
      enableTouchOptimization,
      mobileHoverMode,
      onGestureDetected,
      log,
    ],
  );

  // 触摸移动处理
  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!touchState || !enableGestureRecognition) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 如果移动距离过大，取消长按
      if (distance > 10 && touchState.isLongPress) {
        setTouchState((prev) =>
          prev ? { ...prev, isLongPress: false } : null,
        );
      }

      setTouchState((prev) =>
        prev
          ? {
              ...prev,
              currentX: touch.clientX,
              currentY: touch.clientY,
            }
          : null,
      );

      // 滑动检测
      if (distance > 50) {
        const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
        let direction: string;

        if (Math.abs(angle) < 45) direction = "right";
        else if (Math.abs(angle) > 135) direction = "left";
        else if (angle > 0) direction = "down";
        else direction = "up";

        onGestureDetected?.("swipe");
        log("滑动手势", { direction, distance });
      }
    },
    [touchState, enableGestureRecognition, onGestureDetected, log],
  );

  // 触摸结束处理
  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!touchState || !enableGestureRecognition) return;

      const duration = Date.now() - touchState.startTime;
      const deltaX = touchState.currentX - touchState.startX;
      const deltaY = touchState.currentY - touchState.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 判断手势类型
      if (distance < 10 && duration < 300) {
        // 快速点击
        onGestureDetected?.("tap");
        log("点击手势");
      } else if (distance < 10 && duration >= 500) {
        // 长按
        onGestureDetected?.("long-press");
        log("长按手势");
      }

      setTouchState(null);
    },
    [touchState, enableGestureRecognition, onGestureDetected, log],
  );

  // 初始化设备检测
  useEffect(() => {
    const caps = detectDeviceCapabilities();
    const type = determineDeviceType(caps);

    setCapabilities(caps);
    setDeviceType(type);

    applyAdaptiveConfiguration(type, caps);
    onDeviceTypeDetected?.(type);

    log("设备检测完成", { type, capabilities: caps });
  }, [
    detectDeviceCapabilities,
    determineDeviceType,
    applyAdaptiveConfiguration,
    onDeviceTypeDetected,
    log,
  ]);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const caps = detectDeviceCapabilities();
      const type = determineDeviceType(caps);

      if (type !== deviceType) {
        setCapabilities(caps);
        setDeviceType(type);
        applyAdaptiveConfiguration(type, caps);
        onDeviceTypeDetected?.(type);

        log("设备类型变化", { from: deviceType, to: type });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    deviceType,
    detectDeviceCapabilities,
    determineDeviceType,
    applyAdaptiveConfiguration,
    onDeviceTypeDetected,
    log,
  ]);

  // 设置触摸事件监听
  useEffect(() => {
    if (enableTouchOptimization && capabilities?.hasTouch) {
      document.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      document.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      document.addEventListener("touchend", handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    enableTouchOptimization,
    capabilities?.hasTouch,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // 获取当前设备的最佳交互模式
  const getOptimalInteractionMode = useCallback(() => {
    if (!capabilities) return "default";

    switch (deviceType) {
      case "mobile":
        return mobileHoverMode === "disabled" ? "click-only" : mobileHoverMode;
      case "tablet":
        return tabletHoverMode === "hybrid"
          ? "hover-and-touch"
          : tabletHoverMode;
      case "desktop":
        return "hover-and-click";
      case "tv":
        return "focus-and-click";
      default:
        return "default";
    }
  }, [deviceType, capabilities, mobileHoverMode, tabletHoverMode]);

  return {
    // 设备信息
    deviceType,
    capabilities,
    isAdaptiveMode,

    // 交互状态
    touchState,
    interactionMode: getOptimalInteractionMode(),

    // 工具方法
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    isTouch: capabilities?.hasTouch || false,
    hasHover: capabilities?.hasHover || false,
    isLowPowerMode: capabilities?.isLowPowerMode || false,

    // 调试信息
    debugInfo: debug
      ? {
          deviceType,
          capabilities,
          touchState,
          adaptiveMode: isAdaptiveMode,
        }
      : undefined,
  };
};

export default useResponsiveReference;
