"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// 浮层操作项接口
interface TextAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  prompt: string;
}

// 浮层位置信息
interface FloatingPosition {
  show: boolean;
  x: number;
  y: number;
  selectedText: string;
}

// 组件属性接口
interface TextSelectionFloaterProps {
  /** 是否启用浮层 */
  enabled?: boolean;
  /** 限制生效的容器选择器 */
  containerSelector?: string;
  /** 排除生效的元素选择器 */
  excludeSelector?: string;
  /** 自定义操作项 */
  actions?: TextAction[];
  /** 选择操作回调 */
  onAction?: (action: TextAction, selectedText: string) => void;
  /** 最小选择文本长度 */
  minSelectionLength?: number;
  /** 最大选择文本长度 */
  maxSelectionLength?: number;
  /** 自定义样式类名 */
  className?: string;
  /** Z-index 层级 */
  zIndex?: number;
}

// 默认操作项
const DEFAULT_ACTIONS: TextAction[] = [
  {
    id: "explain",
    label: "解释",
    icon: "💡",
    color: "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30",
    prompt: "请详细解释以下内容的含义和概念：",
  },
  {
    id: "improve",
    label: "改善",
    icon: "✨",
    color: "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30",
    prompt: "请改善以下内容的表达和质量：",
  },
  {
    id: "translate",
    label: "翻译",
    icon: "🌐",
    color:
      "hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30",
    prompt: "请翻译以下内容（如果是中文翻译成英文，如果是英文翻译成中文）：",
  },
  {
    id: "search",
    label: "搜索",
    icon: "🔍",
    color:
      "hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/30",
    prompt: "请搜索并分析与以下内容相关的信息：",
  },
];

export const TextSelectionFloater: React.FC<TextSelectionFloaterProps> = ({
  enabled = true,
  containerSelector = ".content-area",
  excludeSelector = ".card, .sidebar, .panel, .analysis-card, .llm-analysis-card, .ai-analysis-card, .content-analysis-sidebar, .content-analysis-panel, .ai-analysis-panel, .insight-pane, .floating-menu, .dropdown-menu, .tooltip, .popover, .modal, .dialog, [data-exclude-selection], [data-dropdown-trigger], [data-tooltip], [data-popover], [data-modal], [data-dialog], .shadcn-ui-card, .ui-card, .enhanced-card, button, .button, input, textarea, select, .form-control, .toolbar, .header, .footer, .navigation, .nav, .menu",
  actions = DEFAULT_ACTIONS,
  onAction,
  minSelectionLength = 2,
  maxSelectionLength = 500,
  className,
  zIndex = 1000,
}) => {
  const [position, setPosition] = useState<FloatingPosition>({
    show: false,
    x: 0,
    y: 0,
    selectedText: "",
  });

  const floaterRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 检查选择的文本是否在有效区域内
  const isValidSelection = useCallback(
    (selection: Selection): boolean => {
      if (!selection.rangeCount) return false;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element =
        container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : (container as Element);

      if (!element) return false;

      // 检查是否在指定容器内
      if (containerSelector) {
        const targetContainer = element.closest(containerSelector);
        if (!targetContainer) return false;
      }

      // 增强的排除区域检查
      if (excludeSelector) {
        const excludedElement = element.closest(excludeSelector);
        if (excludedElement) return false;
      }

      // 额外检查：确保不在右侧面板、侧边栏、或任何UI组件中
      const additionalExclusions = [
        "[data-exclude-selection]",
        ".sidebar",
        ".panel",
        ".analysis-card",
        ".ai-analysis-card",
        ".content-analysis-sidebar",
        ".shadcn-ui-card",
        ".enhanced-card",
        "button",
        "input",
        "textarea",
        "select",
        ".dropdown-menu",
        ".tooltip",
        ".popover",
        ".modal",
        ".dialog",
        ".menu",
        ".toolbar",
        ".header",
        ".footer",
        ".navigation",
      ];

      for (const selector of additionalExclusions) {
        if (element.closest(selector)) {
          return false;
        }
      }

      // 检查父元素链，确保没有任何祖先元素标记为排除
      let currentElement = element;
      while (currentElement && currentElement !== document.body) {
        if (currentElement.hasAttribute("data-exclude-selection")) {
          return false;
        }

        // 检查是否在右侧面板中（通过ResizablePanel检查）
        if (
          currentElement.getAttribute("data-panel-id") ||
          currentElement.className?.includes("resizable-panel") ||
          currentElement.className?.includes("analysis") ||
          currentElement.className?.includes("sidebar")
        ) {
          return false;
        }

        currentElement = currentElement.parentElement;
      }

      return true;
    },
    [containerSelector, excludeSelector],
  );

  // 计算浮层最佳位置
  const calculatePosition = useCallback(
    (rect: DOMRect): { x: number; y: number } => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const floaterWidth = 280; // 预估浮层宽度
      const floaterHeight = 60; // 预估浮层高度
      const padding = 16;

      let x = rect.left + rect.width / 2;
      let y = rect.top - floaterHeight - padding;

      // 水平边界检查
      if (x + floaterWidth / 2 > viewportWidth - padding) {
        x = viewportWidth - floaterWidth / 2 - padding;
      } else if (x - floaterWidth / 2 < padding) {
        x = floaterWidth / 2 + padding;
      }

      // 垂直边界检查 - 如果上方空间不够，显示在下方
      if (y < padding) {
        y = rect.bottom + padding;
      }

      // 如果下方也不够空间，使用视口中央
      if (y + floaterHeight > viewportHeight - padding) {
        y = viewportHeight / 2 - floaterHeight / 2;
      }

      return { x, y };
    },
    [],
  );

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (
      !text ||
      text.length < minSelectionLength ||
      text.length > maxSelectionLength
    ) {
      setPosition({ show: false, x: 0, y: 0, selectedText: "" });
      return;
    }

    if (!selection || !isValidSelection(selection)) {
      setPosition({ show: false, x: 0, y: 0, selectedText: "" });
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 延迟显示浮层，避免快速选择时闪烁
    timeoutRef.current = setTimeout(() => {
      const { x, y } = calculatePosition(rect);
      setPosition({
        show: true,
        x,
        y,
        selectedText: text,
      });
    }, 100);
  }, [
    isValidSelection,
    calculatePosition,
    minSelectionLength,
    maxSelectionLength,
  ]);

  // 隐藏浮层
  const hideFloater = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPosition({ show: false, x: 0, y: 0, selectedText: "" });
  }, []);

  // 处理操作点击
  const handleActionClick = useCallback(
    (action: TextAction) => {
      if (onAction && position.selectedText) {
        onAction(action, position.selectedText);
      }

      // 清除文本选择
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      hideFloater();
    },
    [onAction, position.selectedText, hideFloater],
  );

  // 监听文本选择事件
  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = () => {
      // 延迟处理，确保选择已完成
      setTimeout(handleTextSelection, 10);
    };

    const handleClickOutside = (e: MouseEvent) => {
      // 如果点击的是浮层内部，不要隐藏
      if (floaterRef.current?.contains(e.target as Node)) {
        return;
      }
      hideFloater();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideFloater();
      }
    };

    const handleScroll = () => {
      hideFloater();
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", hideFloater);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", hideFloater);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, handleTextSelection, hideFloater]);

  // 如果未启用或未显示，不渲染
  if (!enabled || !position.show) {
    return null;
  }

  // 渲染浮层
  const floaterElement = (
    <div
      ref={floaterRef}
      className={cn(
        "fixed animate-in fade-in-50 slide-in-from-bottom-2 duration-200",
        className,
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
        zIndex,
      }}
    >
      <Card className="shadow-2xl border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <CardContent className="p-2">
          <div className="flex items-center gap-1">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  "text-gray-700 dark:text-gray-300 hover:scale-105",
                  action.color,
                )}
              >
                <span className="text-base">{action.icon}</span>
                <span>{action.label}</span>
              </Button>
            ))}
          </div>

          {/* 浮层箭头 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 使用 Portal 渲染到 body
  return createPortal(floaterElement, document.body);
};

// Hook 形式的使用方式
export const useTextSelectionFloater = (
  props: Omit<TextSelectionFloaterProps, "enabled">,
) => {
  const [enabled, setEnabled] = useState(false);

  return {
    enabled,
    setEnabled,
    floater: <TextSelectionFloater {...props} enabled={enabled} />,
  };
};

export default TextSelectionFloater;
