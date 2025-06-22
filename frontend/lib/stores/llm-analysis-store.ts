import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { promptsApi, Prompt } from "@/lib/api/services/prompts";
import { getCookie } from "@/lib/auth";
import { convertPromptToRecommendation } from "@/lib/utils/prompt-utils";

export interface LLMAnalysis {
  id: string;
  type: "summary" | "key_points" | "questions" | "insights" | "tags_extractor" | "custom";
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

  // Used prompts tracking
  usedPromptIds: Set<string>;
  showAllPrompts: boolean;

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

  // Used prompts actions
  markPromptAsUsed: (promptId: string) => void;
  toggleShowAllPrompts: () => void;
  resetUsedPrompts: () => void;
  getAvailablePrompts: () => Prompt[];

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

  generateAnalysisUpdated: (
    contentId: string,
    analysisInstruction: string,
    promptId: string,
    title: string,
  ) => Promise<void>;

  // Get prompt recommendations (从 enabled prompts 转换)
  getPromptRecommendations: () => PromptRecommendation[];
}

export const useLLMAnalysisStore = create<LLMAnalysisState>()(
  devtools(
    (set, get) => ({
      analyses: [],
      isGenerating: false,
      error: null,
      enabledPrompts: [],
      disabledPrompts: [],
      isLoadingPrompts: false,
      usedPromptIds: new Set(),
      showAllPrompts: false,

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
          console.log("[LLM Analysis Store] 开始加载 prompts...");

          const [enabled, disabled] = await Promise.all([
            promptsApi.getEnabledPrompts(),
            promptsApi.getDisabledPrompts(),
          ]);

          console.log("[LLM Analysis Store] 加载结果:", {
            enabledCount: enabled?.length || 0,
            disabledCount: disabled?.length || 0,
            enabledPrompts: enabled,
            disabledPrompts: disabled,
          });

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

      generateAnalysis: async (
        contentId,
        systemPrompt,
        userPrompt,
        promptId,
        title,
      ) => {
        const {
          addAnalysis,
          updateAnalysis,
          setGenerating,
          setError,
          markPromptAsUsed,
        } = get();

        // 如果有promptId，标记为已使用
        if (promptId) {
          markPromptAsUsed(promptId);
        }

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

          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

          // 调用流式分析API
          const response = await fetch(
            `${apiUrl}/api/v1/content/${contentId}/analyze-stream`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                model: "gemini-2.5-flash-preview-05-20",
              }),
            },
          );

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
          let updateTimer: NodeJS.Timeout | null = null;

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

          // 防抖更新函数，避免过于频繁的渲染
          const debouncedUpdate = (content: string) => {
            if (updateTimer) {
              clearTimeout(updateTimer);
            }
            updateTimer = setTimeout(() => {
              updateAnalysis(targetAnalysis.id, {
                content,
              });
            }, 50); // 50ms 防抖
          };

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                // 支持 Data Stream Protocol 和 OpenAI SSE 格式
                if (line.startsWith("0:")) {
                  // Vercel AI SDK Data Stream Protocol 文本内容
                  // 解析 JSON 转义的内容
                  const jsonContent = line.slice(2); // 移除 "0:"
                  let content = "";

                  try {
                    // 使用 JSON.parse 正确解析转义字符
                    content = JSON.parse(jsonContent);
                  } catch (_parseError) {
                    void _parseError; // 明确标记参数已被处理
                    // 如果解析失败，尝试简单的字符串处理（向后兼容）
                    content =
                      jsonContent.startsWith('"') && jsonContent.endsWith('"')
                        ? jsonContent.slice(1, -1)
                        : jsonContent;
                  }

                  if (content) {
                    accumulatedContent += content;
                    // 使用防抖更新
                    debouncedUpdate(accumulatedContent);
                  }
                } else if (line.startsWith("8:")) {
                  // Vercel AI SDK Data Stream Protocol 完成信号
                  // 清除防抖定时器，立即更新最终内容
                  if (updateTimer) {
                    clearTimeout(updateTimer);
                  }
                  updateAnalysis(targetAnalysis.id, {
                    content: accumulatedContent,
                    isLoading: false,
                  });
                  return;
                } else if (line.startsWith("9:")) {
                  // Vercel AI SDK Data Stream Protocol 错误信号
                  if (updateTimer) {
                    clearTimeout(updateTimer);
                  }
                  try {
                    const errorData = JSON.parse(line.slice(2));
                    throw new Error(errorData.error || "Stream error");
                  } catch {
                    throw new Error("Stream error");
                  }
                } else if (line.startsWith("data: ")) {
                  // OpenAI SSE 格式（向后兼容）
                  const data = line.slice(6).trim();

                  if (data === "[DONE]") {
                    // 流结束
                    if (updateTimer) {
                      clearTimeout(updateTimer);
                    }
                    updateAnalysis(targetAnalysis.id, {
                      content: accumulatedContent,
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
                    if (
                      parsed.choices &&
                      parsed.choices[0] &&
                      parsed.choices[0].delta
                    ) {
                      const delta = parsed.choices[0].delta;
                      if (delta.content) {
                        accumulatedContent += delta.content;

                        // 使用防抖更新
                        debouncedUpdate(accumulatedContent);
                      }
                    }
                  } catch (parseError) {
                    // 检查是否是JSON解析错误还是业务错误
                    if (
                      parseError instanceof Error &&
                      parseError.message.includes("LLM 服务错误")
                    ) {
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
            // 清理定时器
            if (updateTimer) {
              clearTimeout(updateTimer);
            }
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
              error:
                error instanceof Error ? error.message : "生成失败，请重试",
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

      markPromptAsUsed: (promptId) => {
        set((state) => ({
          usedPromptIds: new Set(state.usedPromptIds).add(promptId),
        }));
      },

      toggleShowAllPrompts: () => {
        set((state) => ({
          showAllPrompts: !state.showAllPrompts,
        }));
      },

      resetUsedPrompts: () => {
        set({ usedPromptIds: new Set() });
      },

      getAvailablePrompts: () => {
        const { enabledPrompts } = get();
        // 确保始终返回数组，并过滤掉无效的prompt
        return (enabledPrompts || []).filter(
          (prompt) =>
            prompt &&
            typeof prompt === "object" &&
            prompt.id &&
            prompt.name &&
            prompt.content,
        );
      },

      generateAnalysisUpdated: async (
        contentId,
        analysisInstruction,
        promptId,
        title,
      ) => {
        const {
          addAnalysis,
          updateAnalysis,
          setGenerating,
          setError,
          markPromptAsUsed,
        } = get();

        // 标记prompt为已使用
        markPromptAsUsed(promptId);

        // 创建一个loading状态的分析
        const loadingAnalysis = {
          type: "custom" as const,
          title: title || "AI 分析",
          content: "",
          prompt: analysisInstruction,
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

          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

          // 调用流式分析API
          const response = await fetch(
            `${apiUrl}/api/v1/content/${contentId}/analyze-ai-sdk`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_prompt: analysisInstruction, // 分析指令
                model: "or-llama-3-1-8b-instruct",
              }),
            },
          );

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
          let updateTimer: NodeJS.Timeout | null = null;

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

          // 防抖更新函数，避免过于频繁的渲染
          const debouncedUpdate = (content: string) => {
            if (updateTimer) {
              clearTimeout(updateTimer);
            }
            updateTimer = setTimeout(() => {
              updateAnalysis(targetAnalysis.id, {
                content,
              });
            }, 50); // 50ms 防抖
          };

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                // 支持 Data Stream Protocol 和 OpenAI SSE 格式
                if (line.startsWith("0:")) {
                  // Vercel AI SDK Data Stream Protocol 文本内容
                  // 解析 JSON 转义的内容
                  const jsonContent = line.slice(2); // 移除 "0:"
                  let content = "";

                  try {
                    // 使用 JSON.parse 正确解析转义字符
                    content = JSON.parse(jsonContent);
                  } catch (_parseError) {
                    void _parseError; // 明确标记参数已被处理
                    // 如果解析失败，尝试简单的字符串处理（向后兼容）
                    content =
                      jsonContent.startsWith('"') && jsonContent.endsWith('"')
                        ? jsonContent.slice(1, -1)
                        : jsonContent;
                  }

                  if (content) {
                    accumulatedContent += content;
                    // 使用防抖更新
                    debouncedUpdate(accumulatedContent);
                  }
                } else if (line.startsWith("8:")) {
                  // Vercel AI SDK Data Stream Protocol 完成信号
                  // 清除防抖定时器，立即更新最终内容
                  if (updateTimer) {
                    clearTimeout(updateTimer);
                  }
                  updateAnalysis(targetAnalysis.id, {
                    content: accumulatedContent,
                    isLoading: false,
                  });
                  return;
                } else if (line.startsWith("9:")) {
                  // Vercel AI SDK Data Stream Protocol 错误信号
                  if (updateTimer) {
                    clearTimeout(updateTimer);
                  }
                  try {
                    const errorData = JSON.parse(line.slice(2));
                    throw new Error(errorData.error || "Stream error");
                  } catch {
                    throw new Error("Stream error");
                  }
                } else if (line.startsWith("data: ")) {
                  // OpenAI SSE 格式（向后兼容）
                  const data = line.slice(6).trim();

                  if (data === "[DONE]") {
                    // 流结束
                    if (updateTimer) {
                      clearTimeout(updateTimer);
                    }
                    updateAnalysis(targetAnalysis.id, {
                      content: accumulatedContent,
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
                    if (
                      parsed.choices &&
                      parsed.choices[0] &&
                      parsed.choices[0].delta
                    ) {
                      const delta = parsed.choices[0].delta;
                      if (delta.content) {
                        accumulatedContent += delta.content;

                        // 使用防抖更新
                        debouncedUpdate(accumulatedContent);
                      }
                    }
                  } catch (parseError) {
                    // 检查是否是JSON解析错误还是业务错误
                    if (
                      parseError instanceof Error &&
                      parseError.message.includes("LLM 服务错误")
                    ) {
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
            // 清理定时器
            if (updateTimer) {
              clearTimeout(updateTimer);
            }
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
              content: "分析生成失败",
              isLoading: false,
              error: error instanceof Error ? error.message : "分析生成失败",
            });
          }
        } finally {
          setGenerating(false);
        }
      },

      // Get prompt recommendations (从 enabled prompts 转换)
      getPromptRecommendations: () => {
        const { enabledPrompts } = get();
        return enabledPrompts.map(convertPromptToRecommendation);
      },
    }),
    {
      name: "llm-analysis-store",
    },
  ),
);
