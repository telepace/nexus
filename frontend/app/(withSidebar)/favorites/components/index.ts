export { FavoriteCard } from "./FavoriteCard";
export { FavoritePreview } from "./FavoritePreview";
export { FavoriteToolbar } from "./FavoriteToolbar";
export { FavoriteList } from "./FavoriteList";

// 共享类型定义
export interface FavoriteItemData {
  id: string;
  content_item: {
    id: string;
    title?: string;
    type: string;
    source_uri?: string;
    summary?: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
    ai_result?: {
      content_quality_score?: number;
      labels?: string[];
      brief_description?: string;
      reading_time_minutes?: number;
    };
    ai_analysis?: Record<string, unknown>;
  };
  created_at: string;
}
