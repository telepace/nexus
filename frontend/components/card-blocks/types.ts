/**
 * 卡片块界面的TypeScript类型定义
 */

import { LucideIcon } from "lucide-react";

/**
 * 块的类型定义
 */
export type BlockType = "h2" | "h3" | "p" | "quote";

/**
 * AI能力类型定义
 */
export type CapabilityType =
  | "explain"
  | "search"
  | "discuss"
  | "method"
  | "connect";

/**
 * AI能力配置接口
 */
export interface Capability {
  /** 图标组件 */
  icon: LucideIcon;
  /** 能力名称 */
  name: string;
  /** 能力描述 */
  description?: string;
  /** 颜色主题 */
  color?: string;
}

/**
 * 文本块接口
 */
export interface Block {
  /** 唯一标识符 */
  id: string;
  /** 块类型 */
  type: BlockType;
  /** 文本内容 */
  content: string;
  /** 对应的AI能力 */
  capability: CapabilityType;
  /** 扩展属性 */
  metadata?: {
    /** 原文映射 */
    mapping?: string;
    /** 置信度 */
    confidence?: number;
    /** 相关话题数量 */
    relatedTopics?: number;
    /** 是否可编辑 */
    editable?: boolean;
  };
}

/**
 * 卡片数据接口
 */
export interface CardData {
  /** 卡片标题 */
  title: string;
  /** 文本块列表 */
  blocks: Block[];
  /** 卡片元数据 */
  metadata?: {
    /** 数据源 */
    source?: string;
    /** 阅读时间 */
    readTime?: string;
    /** 创建时间 */
    createdAt?: string;
    /** 更新时间 */
    updatedAt?: string;
    /** 标签 */
    tags?: string[];
  };
}

/**
 * 能力弹窗状态接口
 */
export interface ModalState {
  /** 选中的块 */
  block: Block;
  /** 对应的能力 */
  capability: Capability;
}

/**
 * 块组件属性接口
 */
export interface BlockComponentProps {
  /** 块数据 */
  block: Block;
  /** 能力点击回调 */
  onCapabilityClick: (block: Block, capability: Capability) => void;
  /** 是否活跃状态 */
  isActive?: boolean;
  /** 是否可编辑 */
  editable?: boolean;
}

/**
 * 能力弹窗组件属性接口
 */
export interface CapabilityModalProps {
  /** 选中的块 */
  block: Block | null;
  /** 对应的能力 */
  capability: Capability | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 执行操作回调 */
  onAction?: (action: string, block: Block) => void;
}

/**
 * 卡片块界面组件属性接口
 */
export interface CardBlockInterfaceProps {
  /** 卡片数据 */
  data?: CardData;
  /** 是否可编辑模式 */
  editable?: boolean;
  /** 块点击回调 */
  onBlockClick?: (block: Block) => void;
  /** 块内容更改回调 */
  onBlockChange?: (blockId: string, newContent: string) => void;
  /** 块删除回调 */
  onBlockDelete?: (blockId: string) => void;
  /** 块添加回调 */
  onBlockAdd?: (afterBlockId?: string, blockType?: BlockType) => void;
  /** 收藏状态变化回调 */
  onBookmarkChange?: (isBookmarked: boolean) => void;
  /** 分享回调 */
  onShare?: () => void;
}

/**
 * 块样式配置接口
 */
export interface BlockStyles {
  /** 容器样式 */
  wrapper: string;
  /** 内容样式 */
  content: string;
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  /** 颜色配置 */
  colors: {
    primary: string;
    secondary: string;
    muted: string;
    border: string;
    background: string;
    foreground: string;
  };
  /** 字体配置 */
  fonts: {
    sans: string;
    mono: string;
  };
  /** 间距配置 */
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * AI操作接口
 */
export interface AIAction {
  /** 操作类型 */
  type: "analyze" | "explain" | "search" | "relate" | "summarize";
  /** 操作名称 */
  name: string;
  /** 操作描述 */
  description: string;
  /** 图标 */
  icon: LucideIcon;
  /** 执行函数 */
  execute: (block: Block) => Promise<any>;
}

/**
 * 导出配置接口
 */
export interface ExportConfig {
  /** 导出格式 */
  format: "markdown" | "html" | "pdf" | "json";
  /** 是否包含样式 */
  includeStyles: boolean;
  /** 是否包含元数据 */
  includeMetadata: boolean;
  /** 文件名 */
  filename?: string;
}

/**
 * 事件回调接口集合
 */
export interface CardBlockEvents {
  onBlockHover?: (block: Block, isHovered: boolean) => void;
  onCapabilityActivate?: (block: Block, capability: Capability) => void;
  onModalOpen?: (modalState: ModalState) => void;
  onModalClose?: () => void;
  onExport?: (config: ExportConfig) => void;
  onImport?: (data: CardData) => void;
}

/**
 * 配置选项接口
 */
export interface CardBlockConfig {
  /** 主题配置 */
  theme?: ThemeConfig;
  /** 是否启用动画 */
  enableAnimations?: boolean;
  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts?: boolean;
  /** 是否启用拖拽功能 */
  enableDragAndDrop?: boolean;
  /** 最大块数量限制 */
  maxBlocks?: number;
  /** 自动保存间隔(毫秒) */
  autoSaveInterval?: number;
}
