export interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title: string | null;
  summary?: string | null;
  /** 文章全文或純文本，用於 AI 分析 */
  content_text?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
  ai_result?: {
    optimized_title?: string | null;
    brief_description?: string | null;
    summary?: Record<string, unknown> | null;
    key_points?: Record<string, unknown> | null;
    labels?: string[] | null;
    content_analysis?: Record<string, unknown> | null;
    reading_time_minutes?: number | null;
    difficulty_level?: string | null;
    content_quality_score?: number | null;
  } | null;
  ai_analysis?: {
    summarizer?: {
      summary?: {
        main_thesis?: string;
        key_insights?: string[];
        conclusion?: string;
      };
      raw_text?: string;
    };
    key_points_extractor?: {
      key_points?: {
        core_concepts?: Array<{ point: string; explanation?: string }>;
        important_facts?: Array<{ fact: string; context?: string }>;
        actionable_insights?: Array<{ insight: string; application?: string }>;
      };
      raw_text?: string;
    };
    [key: string]: unknown;
  } | null;
  // 内部状态标记，用于跟踪完整数据获取状态
  _fetchingCompleteData?: boolean;
}

// 辅助类型定义
export interface LLMAnalysis {
  id: string;
  type: string;
  status: "pending" | "completed" | "failed";
  result: Record<string, unknown> | null;
  error_message: string | null;
  content_id: string;
  created_at: string;
  updated_at: string;
}

export interface FormData {
  [key: string]: unknown;
}

export interface FilterOptions {
  sort_by?: string;
  order?: "asc" | "desc";
  [key: string]: unknown;
}
