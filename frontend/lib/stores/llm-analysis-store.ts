import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { promptsApi, Prompt } from "@/lib/api/services/prompts";
import { getCookie } from "@/lib/auth";

export interface LLMAnalysis {
  id: string;
  type: "summary" | "key_points" | "questions" | "insights" | "custom";
  title: string;
  content: string;
  prompt?: string;
  promptId?: string;
  isExpanded: boolean;
  isLoading: boolean;
  error?: string;
  created_at: string;
  contentId: string;
}

export interface PromptRecommendation {
  id: string;
  name: string;
  description: string;
  prompt: string;
  type: LLMAnalysis["type"];
  icon?: string;
}

interface LLMAnalysisState {
  analyses: LLMAnalysis[];
  isGenerating: boolean;
  error: string | null;

  // Prompts data
  enabledPrompts: Prompt[];
  disabledPrompts: Prompt[];
  isLoadingPrompts: boolean;

  // Actions
  addAnalysis: (analysis: Omit<LLMAnalysis, "id" | "created_at">) => void;
  updateAnalysis: (id: string, updates: Partial<LLMAnalysis>) => void;
  removeAnalysis: (id: string) => void;
  toggleExpanded: (id: string) => void;
  clearAnalyses: () => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;

  // Prompts actions
  loadPrompts: () => Promise<void>;

  // Generate analysis
  generateAnalysis: (
    contentId: string,
    systemPrompt: string,
    userPrompt: string,
    promptId?: string,
    title?: string,
  ) => Promise<void>;

  // Execute analysis with content
  executeAnalysisWithContent: (
    contentId: string,
    content: string,
    selectedPrompt?: Prompt | null,
  ) => Promise<void>;
}

// 默认的prompt推荐
export const defaultPromptRecommendations: PromptRecommendation[] = [
  {
    id: "summary",
    name: "生成摘要",
    description: "为内容生成简洁的摘要",
    prompt: "请为以下内容生成一个简洁明了的摘要，突出主要观点和关键信息：",
    type: "summary",
    icon: "📝",
  },
  {
    id: "key_points",
    name: "提取要点",
    description: "提取内容中的关键要点",
    prompt: "请从以下内容中提取关键要点，以清晰的列表形式呈现：",
    type: "key_points",
    icon: "🎯",
  },
  {
    id: "questions",
    name: "生成问题",
    description: "基于内容生成思考问题",
    prompt: "基于以下内容，生成一些深入思考的问题，帮助更好地理解和分析：",
    type: "questions",
    icon: "❓",
  },
  {
    id: "insights",
    name: "深度洞察",
    description: "提供深度分析和洞察",
    prompt: "请对以下内容进行深度分析，提供有价值的洞察和观点：",
    type: "insights",
    icon: "💡",
  },
];

export const useLLMAnalysisStore = create<LLMAnalysisState>()(
  devtools(
    (set, get) => ({
      analyses: [],
      isGenerating: false,
      error: null,
      enabledPrompts: [],
      disabledPrompts: [],
      isLoadingPrompts: false,

      addAnalysis: (analysis) => {
        const newAnalysis: LLMAnalysis = {
          ...analysis,
          id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          analyses: [...state.analyses, newAnalysis],
        }));
      },

      updateAnalysis: (id, updates) => {
        set((state) => ({
          analyses: state.analyses.map((analysis) =>
            analysis.id === id ? { ...analysis, ...updates } : analysis,
          ),
        }));
      },

      removeAnalysis: (id) => {
        set((state) => ({
          analyses: state.analyses.filter((analysis) => analysis.id !== id),
        }));
      },

      toggleExpanded: (id) => {
        set((state) => ({
          analyses: state.analyses.map((analysis) =>
            analysis.id === id
              ? { ...analysis, isExpanded: !analysis.isExpanded }
              : analysis,
          ),
        }));
      },

      clearAnalyses: () => {
        set({ analyses: [] });
      },

      setGenerating: (isGenerating) => {
        set({ isGenerating });
      },

      setError: (error) => {
        set({ error });
      },

      loadPrompts: async () => {
        set({ isLoadingPrompts: true, error: null });

        try {
          const [enabled, disabled] = await Promise.all([
            promptsApi.getEnabledPrompts(),
            promptsApi.getDisabledPrompts(),
          ]);

          set({
            enabledPrompts: enabled,
            disabledPrompts: disabled,
            isLoadingPrompts: false,
          });
        } catch (error) {
          console.error("加载 prompts 失败:", error);
          set({
            error: error instanceof Error ? error.message : "加载 prompts 失败",
            isLoadingPrompts: false,
          });
        }
      },

      generateAnalysis: async (contentId, systemPrompt, userPrompt, promptId, title) => {
        const { addAnalysis, updateAnalysis, setGenerating, setError } = get();

        // 创建一个loading状态的分析
        const loadingAnalysis = {
          type: "custom" as const,
          title: title || "AI 分析",
          content: "",
          prompt: systemPrompt,
          promptId,
          isExpanded: true,
          isLoading: true,
          contentId,
        };

        addAnalysis(loadingAnalysis);
        setGenerating(true);
        setError(null);

        try {
          // 获取认证token
          const token = getCookie("accessToken");
          if (!token) {
            throw new Error("未找到认证令牌，请重新登录");
          }

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          
          // 调用流式分析API
          const response = await fetch(`${apiUrl}/api/v1/content/${contentId}/analyze`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              system_prompt: systemPrompt,
              user_prompt: userPrompt,
              model: "gpt-3.5-turbo",
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // 处理流式响应
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("无法获取响应流");
          }

          const decoder = new TextDecoder();
          let accumulatedContent = "";

          // 找到刚创建的分析
          const currentAnalyses = get().analyses;
          const targetAnalysis = currentAnalyses.find(
            (a) =>
              a.contentId === contentId &&
              a.isLoading &&
              a.promptId === promptId,
          );

          if (!targetAnalysis) {
            throw new Error("无法找到目标分析");
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  
                  if (data === '[DONE]') {
                    // 流结束
                    updateAnalysis(targetAnalysis.id, {
                      isLoading: false,
                    });
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    
                    // 检查是否是错误
                    if (parsed.error) {
                      throw new Error(parsed.message || "LLM 服务错误");
                    }

                    // 提取内容
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                      const delta = parsed.choices[0].delta;
                      if (delta.content) {
                        accumulatedContent += delta.content;
                        
                        // 实时更新内容
                        updateAnalysis(targetAnalysis.id, {
                          content: accumulatedContent,
                        });
                      }
                    }
                  } catch (parseError) {
                    // 检查是否是JSON解析错误还是业务错误
                    if (parseError instanceof Error && parseError.message.includes("LLM 服务错误")) {
                      // 这是业务错误，需要抛出
                      throw parseError;
                    }
                    // 其他情况是JSON解析错误，可能是不完整的JSON，继续处理
                    console.warn("解析流数据失败:", parseError);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // 确保最终状态正确
          updateAnalysis(targetAnalysis.id, {
            content: accumulatedContent || "分析完成，但未收到内容",
            isLoading: false,
          });

        } catch (error) {
          console.error("生成分析失败:", error);
          setError(error instanceof Error ? error.message : "生成分析失败");

          // 更新失败的分析
          const currentAnalyses = get().analyses;
          const targetAnalysis = currentAnalyses.find(
            (a) =>
              a.contentId === contentId &&
              a.isLoading &&
              a.promptId === promptId,
          );

          if (targetAnalysis) {
            updateAnalysis(targetAnalysis.id, {
              isLoading: false,
              error: error instanceof Error ? error.message : "生成失败，请重试",
            });
          }
        } finally {
          setGenerating(false);
        }
      },

      executeAnalysisWithContent: async (
        contentId,
        content,
        selectedPrompt,
      ) => {
        const { generateAnalysis } = get();

        if (selectedPrompt) {
          // 使用选择的prompt
          await generateAnalysis(
            contentId,
            selectedPrompt.content,
            content,
            selectedPrompt.id,
            selectedPrompt.name,
          );
        } else {
          // 直接使用内容作为自由对话
          await generateAnalysis(
            contentId,
            "请分析以下内容：",
            content,
            undefined,
            "自由对话",
          );
        }
      },
    }),
    {
      name: "llm-analysis-store",
    },
  ),
);

// 生成模拟内容的辅助函数（保留用于回退）
function generateMockContent(type: LLMAnalysis["type"], title: string): string {
  switch (type) {
    case "summary":
      return `这是一个关于"${title}"的内容摘要。本文档主要讨论了相关主题的核心概念、实际应用和未来发展趋势。通过深入分析，我们可以看到该领域的重要性和发展潜力。`;

    case "key_points":
      return `• 核心概念和基本定义\n• 主要特点和优势\n• 实际应用场景和案例\n• 当前面临的挑战\n• 未来发展方向和趋势\n• 对相关领域的影响`;

    case "questions":
      return `1. 这个主题的核心价值是什么？\n2. 在实际应用中可能遇到哪些挑战？\n3. 如何评估其效果和影响？\n4. 与其他相关方法相比有什么优势？\n5. 未来可能的发展方向是什么？`;

    case "insights":
      return `通过深入分析，我们发现这个主题具有重要的战略意义。它不仅在当前环境中发挥着关键作用，还为未来的发展提供了新的可能性。值得注意的是，成功实施需要考虑多个因素的协调配合。`;

    default:
      return `这是一个自定义分析结果。基于提供的内容和要求，我们进行了详细的分析和思考。`;
  }
}
