import type { ContentItemPublic as OpenAPIContentItemPublic } from "@/app/openapi-client/types.gen";

// 扩展 openapi-client 的类型，添加本地需要的字段
export interface ContentItemPublic extends OpenAPIContentItemPublic {
  summary?: string | null;
  meta_info?: string | null;
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
