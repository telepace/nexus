import { client } from "../client";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string;
  visibility: "public" | "private";
  version: number;
  enabled: boolean;
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
      searchParams.append("enabled", params.enabled.toString());

    const endpoint = `/api/v1/prompts/?${searchParams.toString()}`;
    return client.get<Prompt[]>(endpoint);
  },

  async getEnabledPrompts(): Promise<Prompt[]> {
    return this.getPrompts({ enabled: true, limit: 100 });
  },

  async getDisabledPrompts(): Promise<Prompt[]> {
    return this.getPrompts({ enabled: false, limit: 100 });
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
