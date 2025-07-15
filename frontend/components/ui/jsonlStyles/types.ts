import { MarkdownRenderer } from "../MarkdownRenderer";
import { EnhancedReferenceIndicator } from "../ReferenceManager";

/** 傳遞給樣式渲染器的參數 */
export interface StyleRenderParams {
  block: Record<string, unknown>;
  references: number[];
  hasReferences: boolean;
  MarkdownRenderer: typeof MarkdownRenderer;
  EnhancedReferenceIndicator: typeof EnhancedReferenceIndicator;
}

export type StyleRenderer = (
  params: StyleRenderParams
) => React.ReactNode; 