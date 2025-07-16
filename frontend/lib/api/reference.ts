import { client } from "./client";

export interface SourceParagraph {
  id: string;
  index: number;
  content: string;
  title?: string;
  startOffset?: number;
  endOffset?: number;
  chunkId?: string;
  metadata?: Record<string, any>;
}

export interface ReferenceMapping {
  refId: number;
  paragraphId: string;
  relevanceScore?: number;
  snippet?: string;
}

export interface ContentReferenceInfo {
  contentId: string;
  paragraphs: SourceParagraph[];
  mappings: ReferenceMapping[];
  totalParagraphs: number;
}

export const referenceApi = {
  /**
   * 获取内容的段落信息
   */
  async getContentParagraphs(contentId: string): Promise<ContentReferenceInfo> {
    try {
      const response = await client.get<ContentReferenceInfo>(
        `/api/v1/content/${contentId}/paragraphs`,
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch content paragraphs:", error);
      throw error;
    }
  },

  /**
   * 根据引用ID获取段落内容
   */
  async getParagraphByRef(
    contentId: string,
    refId: number,
  ): Promise<SourceParagraph | null> {
    try {
      const response = await client.get<SourceParagraph>(
        `/api/v1/content/${contentId}/paragraphs/${refId}`,
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch paragraph ${refId}:`, error);
      return null;
    }
  },

  /**
   * 批量获取多个引用段落
   */
  async getParagraphsByRefs(
    contentId: string,
    refIds: number[],
  ): Promise<SourceParagraph[]> {
    try {
      const response = await client.post<SourceParagraph[]>(
        `/api/v1/content/${contentId}/paragraphs/batch`,
        {
          refIds,
        },
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch paragraphs by refs:", error);
      return [];
    }
  },

  /**
   * 搜索包含特定文本的段落
   */
  async searchParagraphs(
    contentId: string,
    query: string,
  ): Promise<SourceParagraph[]> {
    try {
      const response = await client.get<SourceParagraph[]>(
        `/api/v1/content/${contentId}/paragraphs/search`,
        {
          q: query,
        },
      );
      return response;
    } catch (error) {
      console.error("Failed to search paragraphs:", error);
      return [];
    }
  },

  /**
   * 获取段落的上下文（前后几段）
   */
  async getParagraphContext(
    contentId: string,
    refId: number,
    contextSize: number = 2,
  ): Promise<{
    target: SourceParagraph;
    context: SourceParagraph[];
  } | null> {
    try {
      const response = await client.get<{
        target: SourceParagraph;
        context: SourceParagraph[];
      }>(`/api/v1/content/${contentId}/paragraphs/${refId}/context`, {
        size: contextSize,
      });
      return response;
    } catch (error) {
      console.error(`Failed to fetch paragraph context for ${refId}:`, error);
      return null;
    }
  },
};
