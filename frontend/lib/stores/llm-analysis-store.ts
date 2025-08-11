import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { promptsApi, Prompt } from "@/lib/api/services/prompts";
import { getCookie } from "@/lib/auth";
import { convertPromptToRecommendation } from "@/lib/utils/prompt-utils";
import {
  generateFriendlyTitle,
  isQuestion,
  formatQuestionTitle,
} from "@/lib/utils/title-utils";
import { detectLocale } from "@/lib/i18n";

export interface LLMAnalysis {
  id: string;
  type:
    | "summary"
    | "key_points"
    | "questions"
    | "insights"
    | "tags_extractor"
    | "custom";
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
    analysisInstruction: string,
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
          isExpanded: true,
        };

        set((state) => ({
          analyses: [
            ...state.analyses.map((a) => ({ ...a, isExpanded: false })),
            newAnalysis,
          ],
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
        const state = get();
        if (state.enabledPrompts.length > 0 || state.isLoadingPrompts) {
          return;
        }
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
          enabledPrompts,
        } = get();

        // 如果有promptId，标记为已使用
        if (promptId) {
          markPromptAsUsed(promptId);
        }

        // 智能生成用户友好的标题
        const promptName = promptId
          ? enabledPrompts.find((p) => p.id === promptId)?.name
          : undefined;

        const friendlyTitle = generateFriendlyTitle({
          userInput: analysisInstruction,
          promptName: promptName,
          promptId: promptId,
          originalTitle: title,
          analysisType: promptId ? "prompt" : "manual",
        });

        // 创建一个loading状态的分析
        const loadingAnalysis = {
          type: "custom" as const,
          title: friendlyTitle,
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
            `${apiUrl}/api/v1/content/${contentId}/analyze-stream`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                analysis_instruction: analysisInstruction, // 用户的分析指令
                // 移除硬编码的语言检测，让后端从用户设置获取
                // output_language 参数现在是可选的，后端会自动从用户设置获取
                // 如果前端需要覆盖用户设置，可以传递这个参数
                // output_language: (() => {
                //   try {
                //     const locale = detectLocale();
                //     const outputLang = locale === 'en' ? 'English' : 'Chinese';
                //     console.log('🌐 语言检测详情:', {
                //       locale,
                //       outputLang,
                //       navigatorLanguage: typeof navigator !== 'undefined' ? navigator.language : 'N/A',
                //       storedLanguage: typeof localStorage !== 'undefined' ? localStorage.getItem('preferred-language') : 'N/A'
                //     });
                //     return outputLang;
                //   } catch (error) {
                //     console.error('❌ 语言检测失败，使用默认值 English:', error);
                //     return 'English'; // 出错时使用英文作为默认值
                //   }
                // })(),
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

          // 智能更新函数，对 JSONL 支持块级实时更新
          const smartUpdate = (content: string) => {
            if (updateTimer) {
              clearTimeout(updateTimer);
            }

            // 检查是否是 JSONL 格式
            const isJsonlContent = content
              .trim()
              .split("\n")
              .some((line) => {
                const trimmed = line.trim();
                if (!trimmed) return false;
                try {
                  const parsed = JSON.parse(trimmed);
                  return (
                    (parsed.t || parsed.type) && (parsed.c || parsed.content)
                  );
                } catch {
                  return false;
                }
              });

            if (isJsonlContent) {
              // 对于 JSONL 内容，检查是否有完整的新行
              const lines = content.trim().split("\n");
              const lastLine = lines[lines.length - 1]?.trim();

              try {
                // 如果最后一行是完整的 JSON，立即更新
                if (lastLine && lastLine.endsWith("}")) {
                  JSON.parse(lastLine);
                  // 立即更新，无防抖
                  updateAnalysis(targetAnalysis.id, { content });
                  return;
                }
              } catch {
                // 最后一行不是完整的 JSON，使用短防抖
              }

              // 使用短防抖（10ms）用于 JSONL
              updateTimer = setTimeout(() => {
                updateAnalysis(targetAnalysis.id, { content });
              }, 10);
            } else {
              // 普通内容使用标准防抖（50ms）
              updateTimer = setTimeout(() => {
                updateAnalysis(targetAnalysis.id, { content });
              }, 50);
            }
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
                  // 直接累加原始 JSON 行，保持合法 JSONL
                  const rawLine = jsonContent.trim();
                  if (rawLine) {
                    accumulatedContent += rawLine + "\n";
                    // 使用防抖更新
                    smartUpdate(accumulatedContent);
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

                    // 提取内容（兼容 OpenAI SSE 和自定义 JSON 格式）
                    if (
                      parsed.choices &&
                      parsed.choices[0] &&
                      parsed.choices[0].delta
                    ) {
                      // OpenAI SSE 格式
                      const delta = parsed.choices[0].delta;
                      if (delta.content) {
                        accumulatedContent += delta.content + "\n";
                        smartUpdate(accumulatedContent);
                      }
                    } else if (typeof parsed.content === "string") {
                      // 自定义 SSE 格式 {type, content, finished}
                      if (!parsed.finished) {
                        accumulatedContent += parsed.content + "\n";
                        smartUpdate(accumulatedContent);
                      } else {
                        if (updateTimer) clearTimeout(updateTimer);
                        updateAnalysis(targetAnalysis.id, {
                          content: accumulatedContent,
                          isLoading: false,
                        });
                        return;
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
          // 使用选择的prompt - 标题显示prompt名称
          await generateAnalysis(
            contentId,
            selectedPrompt.content, // 分析指令
            selectedPrompt.id,
            selectedPrompt.name, // 传入prompt名称作为title
          );
        } else {
          // 直接使用内容作为自由对话 - 智能生成标题
          const smartTitle = isQuestion(content)
            ? formatQuestionTitle(content)
            : generateFriendlyTitle({
                userInput: content,
                analysisType: "manual",
              });

          await generateAnalysis(
            contentId,
            content, // 用户输入的内容作为分析指令
            undefined,
            smartTitle, // 使用智能生成的标题
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
          enabledPrompts,
        } = get();

        // 标记prompt为已使用
        markPromptAsUsed(promptId);

        // 智能生成用户友好的标题
        const promptName = enabledPrompts.find((p) => p.id === promptId)?.name;

        const friendlyTitle = generateFriendlyTitle({
          userInput: analysisInstruction,
          promptName: promptName,
          promptId: promptId,
          originalTitle: title,
          analysisType: "prompt",
        });

        // 创建一个loading状态的分析
        const loadingAnalysis = {
          type: "custom" as const,
          title: friendlyTitle,
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

          // 智能更新函数，对 JSONL 支持块级实时更新
          const smartUpdate = (content: string) => {
            if (updateTimer) {
              clearTimeout(updateTimer);
            }

            // 检查是否是 JSONL 格式
            const isJsonlContent = content
              .trim()
              .split("\n")
              .some((line) => {
                const trimmed = line.trim();
                if (!trimmed) return false;
                try {
                  const parsed = JSON.parse(trimmed);
                  return (
                    (parsed.t || parsed.type) && (parsed.c || parsed.content)
                  );
                } catch {
                  return false;
                }
              });

            if (isJsonlContent) {
              // 对于 JSONL 内容，检查是否有完整的新行
              const lines = content.trim().split("\n");
              const lastLine = lines[lines.length - 1]?.trim();

              try {
                // 如果最后一行是完整的 JSON，立即更新
                if (lastLine && lastLine.endsWith("}")) {
                  JSON.parse(lastLine);
                  // 立即更新，无防抖
                  updateAnalysis(targetAnalysis.id, { content });
                  return;
                }
              } catch {
                // 最后一行不是完整的 JSON，使用短防抖
              }

              // 使用短防抖（10ms）用于 JSONL
              updateTimer = setTimeout(() => {
                updateAnalysis(targetAnalysis.id, { content });
              }, 10);
            } else {
              // 普通内容使用标准防抖（50ms）
              updateTimer = setTimeout(() => {
                updateAnalysis(targetAnalysis.id, { content });
              }, 50);
            }
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
                  // 直接累加原始 JSON 行，保持合法 JSONL
                  const rawLine = jsonContent.trim();
                  if (rawLine) {
                    accumulatedContent += rawLine + "\n";
                    // 使用防抖更新
                    smartUpdate(accumulatedContent);
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

                    // 提取内容（兼容 OpenAI SSE 和自定义 JSON 格式）
                    if (
                      parsed.choices &&
                      parsed.choices[0] &&
                      parsed.choices[0].delta
                    ) {
                      // OpenAI SSE 格式
                      const delta = parsed.choices[0].delta;
                      if (delta.content) {
                        accumulatedContent += delta.content + "\n";
                        smartUpdate(accumulatedContent);
                      }
                    } else if (typeof parsed.content === "string") {
                      // 自定义 SSE 格式 {type, content, finished}
                      if (!parsed.finished) {
                        accumulatedContent += parsed.content + "\n";
                        smartUpdate(accumulatedContent);
                      } else {
                        if (updateTimer) clearTimeout(updateTimer);
                        updateAnalysis(targetAnalysis.id, {
                          content: accumulatedContent,
                          isLoading: false,
                        });
                        return;
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
