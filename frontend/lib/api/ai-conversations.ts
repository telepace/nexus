import { client } from "./client";

// 对话消息类型
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// 创建对话的请求类型
export interface CreateConversationRequest {
  content_item_id?: string;
  title?: string;
  ai_model_name?: string;
  messages?: ConversationMessage[];
  summary?: string;
}

// 对话基础信息类型
export interface ConversationPublic {
  id: string;
  content_item_id?: string;
  title?: string;
  ai_model_name: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

// 对话详情类型
export interface ConversationDetail extends ConversationPublic {
  messages: ConversationMessage[];
  meta_info?: Record<string, unknown> | null;
}

// 对话列表查询参数
export interface ConversationListParams {
  skip?: number;
  limit?: number;
  content_item_id?: string;
  [key: string]: unknown; // 添加索引签名以兼容 client.get 的参数类型
}

/**
 * AI 对话 API 服务
 */
export class AIConversationsAPI {
  private static readonly BASE_PATH = "/api/v1/ai/conversations";

  /**
   * 获取对话列表
   */
  static async list(
    params: ConversationListParams = {},
  ): Promise<ConversationPublic[]> {
    return client.get<ConversationPublic[]>(this.BASE_PATH, params);
  }

  /**
   * 创建新对话
   */
  static async create(
    data: CreateConversationRequest,
  ): Promise<ConversationDetail> {
    return client.post<ConversationDetail>(this.BASE_PATH, data);
  }

  /**
   * 获取对话详情
   */
  static async getDetail(conversationId: string): Promise<ConversationDetail> {
    return client.get<ConversationDetail>(
      `${this.BASE_PATH}/${conversationId}`,
    );
  }

  /**
   * 获取对话消息
   */
  static async getMessages(
    conversationId: string,
  ): Promise<ConversationMessage[]> {
    return client.get<ConversationMessage[]>(
      `${this.BASE_PATH}/${conversationId}/messages`,
    );
  }

  /**
   * 根据内容项ID获取相关对话
   */
  static async getByContentItem(
    contentItemId: string,
    params: Omit<ConversationListParams, "content_item_id"> = {},
  ): Promise<ConversationPublic[]> {
    return this.list({
      ...params,
      content_item_id: contentItemId,
    });
  }
}

// 默认导出
export default AIConversationsAPI;
