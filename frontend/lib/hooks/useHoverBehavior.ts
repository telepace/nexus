import { useCallback, useRef, useEffect } from "react";
import { useReferenceStore } from "@/lib/stores/referenceStore";

/**
 * 🎯 智能悬浮行为管理 Hook
 *
 * 设计理念：
 * - 防抖处理，避免意外触发
 * - 智能冲突解决，多引用场景优化
 * - 性能优化，最小化重渲染
 * - 响应式适配，移动端特殊处理
 */

export interface HoverBehaviorOptions {
  refId: number;
  contentId: string;

  // 延迟配置
  hoverDelay?: number;
  hideDelay?: number;

  // 回调函数
  onHoverStart?: (refId: number) => void;
  onHoverEnd?: (refId: number) => void;
  onPreviewShow?: (refId: number) => void;
  onPreviewHide?: (refId: number) => void;

  // 行为控制
  disabled?: boolean;
  preventMobileHover?: boolean;
  requireShiftKey?: boolean;

  // 调试模式
  debug?: boolean;
}

export interface HoverBehaviorReturn {
  // 状态
  isHovered: boolean;
  isPreviewVisible: boolean;

  // 事件处理器
  handleMouseEnter: (event: React.MouseEvent) => void;
  handleMouseLeave: (event: React.MouseEvent) => void;
  handleFocus: (event: React.FocusEvent) => void;
  handleBlur: (event: React.FocusEvent) => void;

  // 手动控制
  showPreview: () => void;
  hidePreview: () => void;
  togglePreview: () => void;

  // 清理函数
  cleanup: () => void;
}

// 检测是否为移动设备
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window
  );
};

// Hook 实现
export const useHoverBehavior = (
  options: HoverBehaviorOptions,
): HoverBehaviorReturn => {
  const {
    refId,
    contentId,
    hoverDelay,
    hideDelay,
    onHoverStart,
    onHoverEnd,
    onPreviewShow,
    onPreviewHide,
    disabled = false,
    preventMobileHover = true,
    requireShiftKey = false,
    debug = false,
  } = options;

  // Store 状态和方法
  const { hoveredRef, config, setHoveredRef, setHoverTimeout, hoverTimeout } =
    useReferenceStore();

  // 内部状态
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobileRef = useRef(isMobileDevice());

  // 计算实际延迟时间
  const actualHoverDelay = hoverDelay ?? config.hoverDelay;
  const actualHideDelay = hideDelay ?? config.hideDelay;

  // 状态计算
  const isHovered = hoveredRef === refId;
  const isPreviewVisible = isHovered;

  // 调试日志
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[HoverBehavior-${refId}] ${message}`, data || "");
      }
    },
    [debug, refId],
  );

  // 清理所有定时器
  const clearTimeouts = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  }, [hoverTimeout, setHoverTimeout]);

  // 显示预览
  const showPreview = useCallback(() => {
    if (disabled) return;

    clearTimeouts();

    log("显示预览", { refId, contentId });

    setHoveredRef(refId);
    onHoverStart?.(refId);
    onPreviewShow?.(refId);
  }, [
    disabled,
    clearTimeouts,
    log,
    refId,
    contentId,
    setHoveredRef,
    onHoverStart,
    onPreviewShow,
  ]);

  // 隐藏预览
  const hidePreview = useCallback(() => {
    clearTimeouts();

    log("隐藏预览", { refId });

    setHoveredRef(null);
    onHoverEnd?.(refId);
    onPreviewHide?.(refId);
  }, [clearTimeouts, log, refId, setHoveredRef, onHoverEnd, onPreviewHide]);

  // 切换预览状态
  const togglePreview = useCallback(() => {
    if (isPreviewVisible) {
      hidePreview();
    } else {
      showPreview();
    }
  }, [isPreviewVisible, hidePreview, showPreview]);

  // 鼠标进入处理
  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      // 移动设备特殊处理
      if (isMobileRef.current && preventMobileHover) {
        log("移动设备，忽略鼠标悬浮");
        return;
      }

      // Shift 键检查
      if (requireShiftKey && !event.shiftKey) {
        log("需要 Shift 键，但未按下");
        return;
      }

      // 清理离开定时器
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      // 如果已经是当前悬浮的引用，直接返回
      if (hoveredRef === refId) {
        log("已经是当前悬浮引用");
        return;
      }

      log("鼠标进入，设置延迟显示", { delay: actualHoverDelay });

      // 设置进入延迟
      enterTimeoutRef.current = setTimeout(() => {
        showPreview();
      }, actualHoverDelay);

      setHoverTimeout(enterTimeoutRef.current);
    },
    [
      disabled,
      preventMobileHover,
      requireShiftKey,
      hoveredRef,
      refId,
      actualHoverDelay,
      showPreview,
      setHoverTimeout,
      log,
    ],
  );

  // 鼠标离开处理
  const handleMouseLeave = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      // 清理进入定时器
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
        enterTimeoutRef.current = null;
      }

      // 如果不是当前悬浮引用，直接返回
      if (hoveredRef !== refId) {
        log("不是当前悬浮引用");
        return;
      }

      log("鼠标离开，设置延迟隐藏", { delay: actualHideDelay });

      // 设置离开延迟
      leaveTimeoutRef.current = setTimeout(() => {
        hidePreview();
      }, actualHideDelay);
    },
    [disabled, hoveredRef, refId, actualHideDelay, hidePreview, log],
  );

  // 焦点处理（键盘导航支持）
  const handleFocus = useCallback(
    (event: React.FocusEvent) => {
      if (disabled || !config.keyboardNavigationEnabled) return;

      log("获得焦点");
      showPreview();
    },
    [disabled, config.keyboardNavigationEnabled, showPreview, log],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent) => {
      if (disabled || !config.keyboardNavigationEnabled) return;

      log("失去焦点");
      hidePreview();
    },
    [disabled, config.keyboardNavigationEnabled, hidePreview, log],
  );

  // 清理函数
  const cleanup = useCallback(() => {
    clearTimeouts();
    if (hoveredRef === refId) {
      setHoveredRef(null);
    }
  }, [clearTimeouts, hoveredRef, refId, setHoveredRef]);

  // 响应配置变化
  useEffect(() => {
    isMobileRef.current = isMobileDevice();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 监听其他引用的悬浮状态变化
  useEffect(() => {
    if (hoveredRef !== null && hoveredRef !== refId) {
      // 其他引用被悬浮，清理当前定时器
      clearTimeouts();
      log("其他引用被悬浮，清理定时器");
    }
  }, [hoveredRef, refId, clearTimeouts, log]);

  return {
    // 状态
    isHovered,
    isPreviewVisible,

    // 事件处理器
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,

    // 手动控制
    showPreview,
    hidePreview,
    togglePreview,

    // 清理函数
    cleanup,
  };
};

// 导出类型
export type { HoverBehaviorOptions, HoverBehaviorReturn };

// 便捷变体 Hook
export const useSimpleHover = (refId: number, contentId: string) => {
  return useHoverBehavior({
    refId,
    contentId,
    hoverDelay: 200,
    hideDelay: 150,
  });
};

export const useInstantHover = (refId: number, contentId: string) => {
  return useHoverBehavior({
    refId,
    contentId,
    hoverDelay: 0,
    hideDelay: 100,
  });
};

export const useDelayedHover = (refId: number, contentId: string) => {
  return useHoverBehavior({
    refId,
    contentId,
    hoverDelay: 500,
    hideDelay: 300,
  });
};
