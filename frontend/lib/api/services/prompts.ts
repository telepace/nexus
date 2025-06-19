import { client } from "../client";
import { promptsTogglePromptEnabled } from "@/app/openapi-client/sdk.gen";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string;
  visibility: "public" | "private";
  version: number;
  enabled: boolean;
  user_enabled?: boolean;
  updated_at: string;
  type: "template";
  input_vars: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  meta_data: Record<string, unknown>;
  team_id: string | null;
  created_at: string;
  embedding: Record<string, unknown>;
  created_by: string;
}

export interface PromptListParams {
  skip?: number;
  limit?: number;
  order?: "asc" | "desc";
  enabled?: boolean;
}

export interface PromptListResponse {
  prompts: Prompt[];
  total: number;
}

export const promptsApi = {
  async getPrompts(params: PromptListParams = {}): Promise<Prompt[]> {
    const searchParams = new URLSearchParams();

    if (params.skip !== undefined)
      searchParams.append("skip", params.skip.toString());
    if (params.limit !== undefined)
      searchParams.append("limit", params.limit.toString());
    if (params.order) searchParams.append("order", params.order);
    if (params.enabled !== undefined)
      searchParams.append("user_enabled", params.enabled.toString());

    const endpoint = `/api/v1/prompts/?${searchParams.toString()}`;
    return client.get<Prompt[]>(endpoint);
  },

  async getEnabledPrompts(): Promise<Prompt[]> {
    // 使用自定义 APIClient，自动附带认证 Token
    try {
      const data = await client.get<Prompt[]>(
        "/api/v1/prompts/user-enabled",
        { limit: 100 },
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[promptsApi] 获取启用的 prompts 失败:", error);
      return [];
    }
  },

  async getDisabledPrompts(): Promise<Prompt[]> {
    // 使用自定义 APIClient，自动附带认证 Token
    try {
      const data = await client.get<Prompt[]>(
        "/api/v1/prompts/user-disabled",
        { limit: 100 },
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[promptsApi] 获取未启用的 prompts 失败:", error);
      return [];
    }
  },

  async togglePromptEnabled(
    promptId: string,
  ): Promise<{ user_enabled: boolean }> {
    const response = await promptsTogglePromptEnabled({
      path: { prompt_id: promptId },
    });
    return response.data as { user_enabled: boolean };
  },

  async executePrompt(
    promptId: string,
    variables: Record<string, unknown>,
  ): Promise<string> {
    const endpoint = `/api/v1/prompts/${promptId}/execute`;
    const response = await client.post<{ result: string }>(endpoint, {
      variables,
    });
    return response.result;
  },
};
