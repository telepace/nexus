import { MarkdownRenderer } from "../MarkdownRenderer";
import { EnhancedReferenceIndicator } from "../ReferenceManager";

/** 樣式渲染結果 */
export interface StyleRenderResult {
  /** 渲染的React元素 */
  element: React.ReactNode;
  /** 是否已經處理了展開按鈕功能（如果是，JsonLineWithExpandButton將不顯示按鈕） */
  hasCustomExpandButton?: boolean;
}

/** 傳遞給樣式渲染器的參數 */
export interface StyleRenderParams {
  block: Record<string, unknown>;
  references: number[];
  hasReferences: boolean;
  MarkdownRenderer: typeof MarkdownRenderer;
  EnhancedReferenceIndicator: typeof EnhancedReferenceIndicator;
  /** Callback when expand button is clicked */
  onExpand?: (jsonContent: Record<string, unknown>) => void;
}

export type StyleRenderer = (params: StyleRenderParams) => StyleRenderResult;
