import { client } from "./client";

export interface SourceParagraph {
  id: string;
  content_item_id: string;
  display_number: number;
  content: string;
  start_offset?: number;
  end_offset?: number;
  created_at: string;
  updated_at: string;
}

export interface ReferenceMapping {
  refId: number;
  paragraphId: string;
  relevanceScore?: number;
  snippet?: string;
}

export interface ContentReferenceInfo {
  segments: SourceParagraph[];
  total: number;
  missing_numbers: number[];
}

export const referenceApi = {
  /**
   * 获取内容的段落信息
   */
  async getContentParagraphs(contentId: string): Promise<ContentReferenceInfo> {
    try {
      const response = await client.get<ContentReferenceInfo>(`/api/v1/content/${contentId}/segments`);
      return response;
    } catch (error) {
      console.error("Failed to fetch content paragraphs:", error);
      throw error;
    }
  },

  /**
   * 根据引用ID获取段落内容
   */
  async getParagraphByRef(contentId: string, refId: number): Promise<SourceParagraph | null> {
    try {
      const response = await client.get<SourceParagraph>(`/api/v1/content/${contentId}/segments/${refId}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch paragraph ${refId}:`, error);
      return null;
    }
  },

  /**
   * 批量获取多个引用段落
   */
  async getParagraphsByRefs(contentId: string, refIds: number[]): Promise<SourceParagraph[]> {
    try {
      // 使用查询参数传递段落号列表
      const numbers = refIds.join(',');
      const response = await client.get<ContentReferenceInfo>(`/api/v1/content/${contentId}/segments?numbers=${numbers}`);
      return response.segments;
    } catch (error) {
      console.error("Failed to fetch paragraphs by refs:", error);
      return [];
    }
  },

  /**
   * 搜索包含特定文本的段落
   */
  async searchParagraphs(contentId: string, query: string): Promise<SourceParagraph[]> {
    try {
      // 注意：后端可能没有实现搜索功能，这里先返回空数组
      console.warn("搜索功能暂未实现");
      return [];
    } catch (error) {
      console.error("Failed to search paragraphs:", error);
      return [];
    }
  },

  /**
   * 获取段落的上下文（前后几段）
   */
  async getParagraphContext(contentId: string, refId: number, contextSize: number = 2): Promise<{
    target: SourceParagraph;
    context: SourceParagraph[];
  } | null> {
    try {
      // 计算上下文范围
      const fromNumber = Math.max(1, refId - contextSize);
      const toNumber = refId + contextSize;
      
      const response = await client.get<ContentReferenceInfo>(`/api/v1/content/${contentId}/segments?from_number=${fromNumber}&to_number=${toNumber}`);
      
      const target = response.segments.find(s => s.display_number === refId);
      if (!target) {
        return null;
      }
      
      return {
        target,
        context: response.segments,
      };
    } catch (error) {
      console.error(`Failed to fetch paragraph context for ${refId}:`, error);
      return null;
    }
  },
}; 