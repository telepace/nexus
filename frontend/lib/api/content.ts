import { client } from "./client";

export interface ContentItem {
  id: string;
  title: string;
  content_text: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  type: string;
  processing_status: string;
  summary?: string;
  source_uri?: string;
}

// 添加 ContentItemPublic 类型，与后端保持一致
export interface ContentItemPublic {
  id: string;
  title: string | null;
  summary: string | null;
  content_text: string | null;
  source_uri: string | null;
  type: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  meta_info?: string | null;
  error_message?: string | null;
}

export interface MarkdownContent {
  id: string;
  title: string;
  markdown_content: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface ContentChunk {
  id: string;
  index: number;
  content: string;
  type: string;
  word_count: number;
  char_count: number;
  meta_info: Record<string, unknown>;
  created_at: string;
}

export interface ContentChunksResponse {
  content_id: string;
  chunks: ContentChunk[];
  pagination: {
    page: number;
    size: number;
    total_chunks: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary: {
    total_chunks: number;
    total_words: number;
    total_chars: number;
    max_index: number;
  };
  content_info: {
    title: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface ContentChunksSummary {
  content_id: string;
  summary: {
    total_chunks: number;
    total_words: number;
    total_chars: number;
    max_index: number;
  };
  content_info: {
    title: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface AIResult {
  optimized_title?: string | null;
  brief_description?: string | null;
  summary?: Record<string, unknown> | null;
  key_points?: Record<string, unknown> | null;
  labels?: string[] | null;
  content_analysis?: Record<string, unknown> | null;
  reading_time_minutes?: number | null;
  difficulty_level?: string | null;
  content_quality_score?: number | null;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationPublic {
  id: string;
  user_id: string;
  content_item_id?: string;
  title?: string;
  conversation_type: string;
  ai_model_name: string;
  messages: ConversationMessage[];
  summary?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: ConversationPublic[];
  total: number;
  has_auto_analysis: boolean;
}

export const contentApi = {
  /**
   * Get all content items for the current user
   */
  async getContentItems(): Promise<ContentItemPublic[]> {
    const response = await client.get<ContentItemPublic[]>("/api/v1/content/");
    return response;
  },

  /**
   * Get a specific content item by ID
   */
  async getContentItem(id: string): Promise<ContentItemPublic> {
    const response = await client.get<ContentItemPublic>(
      `/api/v1/content/${id}`,
    );
    return response;
  },

  /**
   * Get markdown content for a specific content item
   */
  async getContentMarkdown(id: string): Promise<MarkdownContent> {
    const response = await client.get<MarkdownContent>(
      `/api/v1/content/${id}/markdown`,
    );
    return response;
  },

  /**
   * Get content chunks with pagination
   */
  async getContentChunks(
    id: string,
    page: number = 1,
    size: number = 10,
  ): Promise<ContentChunksResponse> {
    const response = await client.get<ContentChunksResponse>(
      `/api/v1/content/${id}/chunks?page=${page}&size=${size}`,
    );
    return response;
  },

  /**
   * Get content chunks summary
   */
  async getContentChunksSummary(id: string): Promise<ContentChunksSummary> {
    const response = await client.get<ContentChunksSummary>(
      `/api/v1/content/${id}/chunks/summary`,
    );
    return response;
  },

  /**
   * Create a new content item
   */
  async createContentItem(data: {
    type: string;
    source_uri?: string;
    title?: string;
    summary?: string;
    content_text?: string;
  }): Promise<ContentItemPublic> {
    const response = await client.post<ContentItemPublic>(
      "/api/v1/content/create",
      data,
    );
    return response;
  },

  /**
   * Process a content item to convert it to markdown
   */
  async processContentItem(id: string): Promise<ContentItemPublic> {
    const response = await client.post<ContentItemPublic>(
      `/api/v1/content/process/${id}`,
    );
    return response;
  },

  /**
   * Reprocess a failed content item
   */
  async reprocessContentItem(id: string): Promise<ContentItemPublic> {
    const response = await client.post<ContentItemPublic>(
      `/api/v1/content/reprocess/${id}`,
    );
    return response;
  },

  /**
   * Get supported content types and processors
   */
  async getSupportedProcessors(): Promise<{
    supported_types: string[];
    processors: Record<string, string>;
    pipeline_info: {
      engine: string;
      storage: string;
      extensible: boolean;
      supports_llm_integration: boolean;
    };
  }> {
    const response = await client.get<{
      supported_types: string[];
      processors: Record<string, string>;
      pipeline_info: {
        engine: string;
        storage: string;
        extensible: boolean;
        supports_llm_integration: boolean;
      };
    }>("/api/v1/content/processors/supported");
    return response;
  },

  async analyzeContent(
    contentId: string,
    analysisInstruction: string,
  ): Promise<Record<string, unknown>> {
    const response = await client.post<Record<string, unknown>>(
      `/api/v1/content/${contentId}/analyze-ai-sdk`,
      {
        user_prompt: analysisInstruction, // 分析指令
        model: "or-llama-3-1-8b-instruct",
      },
    );
    return response;
  },

  async deleteContentItem(id: string): Promise<void> {
    await client.delete(`/api/v1/content/${id}`);
  },

  /**
   * Get AI conversations for a content item
   */
  async getContentConversations(
    contentId: string,
    includeInactive: boolean = false,
  ): Promise<ConversationListResponse> {
    const params = includeInactive ? "?include_inactive=true" : "";
    const response = await client.get<ConversationListResponse>(
      `/api/v1/content/${contentId}/conversations${params}`,
    );
    return response;
  },

  /**
   * Get AI analysis result for a content item
   */
  async getContentAnalysisResult(contentId: string): Promise<AIResult | null> {
    try {
      const content = await this.getContentItem(contentId);
      // AIResult 数据在 ContentItemPublic 的 ai_result 字段中
      return (
        (content as ContentItemPublic & { ai_result?: AIResult | null })
          .ai_result || null
      );
    } catch (error) {
      console.error("Failed to get AI analysis result:", error);
      return null;
    }
  },
};
