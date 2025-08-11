import { useCallback, useEffect, useRef } from "react";
import { useReferenceStore } from "@/lib/stores/referenceStore";

/**
 * 🎹 统一键盘导航管理 Hook
 *
 * 设计理念：
 * - 完整的无障碍支持
 * - 直观的键盘快捷键
 * - 智能焦点管理
 * - 屏幕阅读器友好
 */

export interface KeyboardNavigationOptions {
  refId: number;
  contentId: string;

  // 回调函数
  onActivate?: (refId: number) => void;
  onFocus?: (refId: number) => void;
  onBlur?: (refId: number) => void;
  onEscape?: () => void;

  // 行为控制
  disabled?: boolean;
  preventDefaultKeys?: boolean;
  enableArrowNavigation?: boolean;

  // 无障碍增强
  ariaLabel?: string;
  ariaDescribedBy?: string;

  // 调试模式
  debug?: boolean;
}

export interface KeyboardNavigationReturn {
  // 属性
  tabIndex: number;
  role: string;
  "aria-label": string;
  "aria-describedby"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean;

  // 事件处理器
  onKeyDown: (event: React.KeyboardEvent) => void;
  onFocus: (event: React.FocusEvent) => void;
  onBlur: (event: React.FocusEvent) => void;

  // 焦点控制
  focus: () => void;
  blur: () => void;

  // 状态
  isFocused: boolean;
}

// 支持的按键
const SUPPORTED_KEYS = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

// Hook 实现
export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions,
): KeyboardNavigationReturn => {
  const {
    refId,
    contentId,
    onActivate,
    onFocus,
    onBlur,
    onEscape,
    disabled = false,
    preventDefaultKeys = true,
    enableArrowNavigation = false,
    ariaLabel,
    ariaDescribedBy,
    debug = false,
  } = options;

  // Store 状态
  const { config, activeModal, closeModal, openModal } = useReferenceStore();

  // 内部状态
  const elementRef = useRef<HTMLElement | null>(null);
  const focusedRef = useRef(false);

  // 调试日志
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[KeyboardNav-${refId}] ${message}`, data || "");
      }
    },
    [debug, refId],
  );

  // 焦点状态
  const isFocused = focusedRef.current;

  // 生成无障碍属性
  const accessibilityProps = {
    tabIndex: disabled ? -1 : 0,
    role: "button",
    "aria-label": ariaLabel || `引用第${refId}段内容`,
    "aria-describedby": ariaDescribedBy,
    "aria-expanded": activeModal === refId,
    "aria-haspopup": "dialog" as const,
  };

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || !config.keyboardNavigationEnabled) return;

      const { key, shiftKey, ctrlKey, altKey, metaKey } = event;

      log("按键事件", { key, shiftKey, ctrlKey, altKey, metaKey });

      // 修饰键组合处理
      const hasModifier = shiftKey || ctrlKey || altKey || metaKey;

      switch (key) {
        case SUPPORTED_KEYS.ENTER:
        case SUPPORTED_KEYS.SPACE:
          if (preventDefaultKeys) {
            event.preventDefault();
            event.stopPropagation();
          }

          log("激活引用", { key });
          onActivate?.(refId);

          // 打开详情模态框
          openModal(refId);
          break;

        case SUPPORTED_KEYS.ESCAPE:
          if (activeModal === refId) {
            if (preventDefaultKeys) {
              event.preventDefault();
              event.stopPropagation();
            }

            log("ESC 关闭模态框");
            closeModal();
            onEscape?.();
          }
          break;

        case SUPPORTED_KEYS.TAB:
          // Tab 键导航，不阻止默认行为
          log("Tab 导航", { shiftKey });
          break;

        case SUPPORTED_KEYS.ARROW_UP:
        case SUPPORTED_KEYS.ARROW_DOWN:
        case SUPPORTED_KEYS.ARROW_LEFT:
        case SUPPORTED_KEYS.ARROW_RIGHT:
          if (enableArrowNavigation && !hasModifier) {
            if (preventDefaultKeys) {
              event.preventDefault();
            }

            log("方向键导航", { key });
            // 可以在这里实现引用间的导航逻辑
            handleArrowNavigation(key);
          }
          break;

        case SUPPORTED_KEYS.HOME:
        case SUPPORTED_KEYS.END:
          if (enableArrowNavigation && !hasModifier) {
            if (preventDefaultKeys) {
              event.preventDefault();
            }

            log("Home/End 导航", { key });
            // 可以实现跳转到第一个/最后一个引用
          }
          break;

        default:
          log("未处理的按键", { key });
          break;
      }
    },
    [
      disabled,
      config.keyboardNavigationEnabled,
      preventDefaultKeys,
      enableArrowNavigation,
      refId,
      activeModal,
      onActivate,
      onEscape,
      openModal,
      closeModal,
      log,
      handleArrowNavigation,
    ],
  );

  // 方向键导航处理
  const handleArrowNavigation = useCallback(
    (key: string) => {
      // 这里可以实现更复杂的导航逻辑
      // 例如查找页面上的其他引用并导航到它们

      const allReferences = document.querySelectorAll("[data-reference-id]");
      const currentIndex = Array.from(allReferences).findIndex(
        (el) => el.getAttribute("data-reference-id") === refId.toString(),
      );

      let nextIndex = currentIndex;

      switch (key) {
        case SUPPORTED_KEYS.ARROW_UP:
        case SUPPORTED_KEYS.ARROW_LEFT:
          nextIndex = Math.max(0, currentIndex - 1);
          break;
        case SUPPORTED_KEYS.ARROW_DOWN:
        case SUPPORTED_KEYS.ARROW_RIGHT:
          nextIndex = Math.min(allReferences.length - 1, currentIndex + 1);
          break;
      }

      if (nextIndex !== currentIndex && allReferences[nextIndex]) {
        const nextElement = allReferences[nextIndex] as HTMLElement;
        nextElement.focus();
        log("导航到引用", { from: currentIndex, to: nextIndex });
      }
    },
    [refId, log],
  );

  // 焦点事件处理
  const handleFocus = useCallback(
    (event: React.FocusEvent) => {
      if (disabled) return;

      focusedRef.current = true;
      log("获得焦点");
      onFocus?.(refId);
    },
    [disabled, refId, onFocus, log],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent) => {
      if (disabled) return;

      focusedRef.current = false;
      log("失去焦点");
      onBlur?.(refId);
    },
    [disabled, refId, onBlur, log],
  );

  // 手动焦点控制
  const focus = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.focus();
      log("手动聚焦");
    }
  }, [log]);

  const blur = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.blur();
      log("手动失焦");
    }
  }, [log]);

  // 全局键盘事件监听（用于 ESC 等全局快捷键）
  useEffect(() => {
    if (!config.keyboardNavigationEnabled) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // 只处理全局的 ESC 键
      if (event.key === SUPPORTED_KEYS.ESCAPE && activeModal !== null) {
        closeModal();
        onEscape?.();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [config.keyboardNavigationEnabled, activeModal, closeModal, onEscape]);

  // 设置元素引用
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  return {
    // 无障碍属性
    ...accessibilityProps,

    // 事件处理器
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,

    // 焦点控制
    focus,
    blur,

    // 状态
    isFocused,

    // 内部引用（可选，供组件使用）
    ref: setElementRef,
  };
};

// 便捷的预设 Hook
export const useSimpleKeyboardNav = (
  refId: number,
  contentId: string,
  onActivate?: (refId: number) => void,
) => {
  return useKeyboardNavigation({
    refId,
    contentId,
    onActivate,
    enableArrowNavigation: false,
    preventDefaultKeys: true,
  });
};

export const useFullKeyboardNav = (
  refId: number,
  contentId: string,
  onActivate?: (refId: number) => void,
) => {
  return useKeyboardNavigation({
    refId,
    contentId,
    onActivate,
    enableArrowNavigation: true,
    preventDefaultKeys: true,
  });
};

// 导出类型
export type { KeyboardNavigationOptions, KeyboardNavigationReturn };
