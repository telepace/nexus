/**
 * 智能卡片块界面组件导出
 */

// 主组件
export { default as CardBlockInterface } from "./card-block-interface";

// 类型定义
export type {
  Block,
  BlockType,
  Capability,
  CapabilityType,
  CardData,
  ModalState,
  BlockComponentProps,
  CapabilityModalProps,
  CardBlockInterfaceProps,
  BlockStyles,
  ThemeConfig,
  AIAction,
  ExportConfig,
  CardBlockEvents,
  CardBlockConfig,
} from "./types";

// 常量和配置
export const BLOCK_TYPES = ["h2", "h3", "p", "quote"] as const;
export const CAPABILITY_TYPES = [
  "explain",
  "search",
  "discuss",
  "method",
  "connect",
] as const;

// 默认配置
export const DEFAULT_CONFIG = {
  theme: {
    colors: {
      primary: "hsl(var(--primary))",
      secondary: "hsl(var(--secondary))",
      muted: "hsl(var(--muted))",
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
    },
    fonts: {
      sans: "var(--font-sans)",
      mono: "var(--font-mono)",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
  },
  enableAnimations: true,
  enableKeyboardShortcuts: true,
  enableDragAndDrop: false,
  maxBlocks: 100,
  autoSaveInterval: 5000,
};
