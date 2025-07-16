import { useState, useCallback, useRef } from "react";
import { useCompletion } from "ai/react";
import { getCookie } from "@/lib/utils";

export interface AIAnalysisConfig {
  /** 分析模式：通用聊天 | 内容分析 | 只读展示 */
  mode: "chat" | "content" | "display";
  /** 内容 ID（用于内容分析模式） */
  contentId?: string;
  /** 系统提示词（用于通用聊天模式） */
  systemPrompt?: string;
  /** API 端点（可选，使用默认端点） */
  apiEndpoint?: string;
  /** 模型选择 */
  model?: string;
  /** 是否启用自动重试 */
  enableRetry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

export interface AIAnalysisState {
  /** 分析内容 */
  content: string;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 是否已开始分析 */
  hasStarted: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 流式内容（实时更新） */
  streamContent: string;
  /** 重试次数 */
  retryCount: number;
}

export interface AIAnalysisActions {
  /** 开始分析 */
  startAnalysis: (instruction: string) => Promise<void>;
  /** 停止分析 */
  stopAnalysis: () => void;
  /** 重试分析 */
  retryAnalysis: () => Promise<void>;
  /** 清空结果 */
  clearResult: () => void;
  /** 复制结果 */
  copyResult: () => Promise<boolean>;
  /** 设置内容（用于只读模式） */
  setContent: (content: string) => void;
}

export interface AIAnalysisReturn {
  state: AIAnalysisState;
  actions: AIAnalysisActions;
}

// JSONL 内容检测函数 - 修复 Data Stream Protocol 检测
const isJsonlContent = (content: string): boolean => {
  if (!content || !content.trim()) return false;

  const lines = content.trim().split("\n");
  let validJsonlLines = 0;
  let totalNonEmptyLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    totalNonEmptyLines++;

    // 检查是否是 Data Stream Protocol 格式 (以数字开头，如 "0:", "8:")
    if (/^\d+:/.test(trimmed)) {
      // 提取业务数据部分
      const jsonContent = trimmed.slice(trimmed.indexOf(":") + 1);
      try {
        const parsed = JSON.parse(jsonContent);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (("type" in parsed && "content" in parsed) ||
            ("t" in parsed && "c" in parsed))
        ) {
          validJsonlLines++;
        }
      } catch {
        // 忽略解析错误
      }
      continue;
    }

    // 检查是否是标准 JSONL 格式
    try {
      const parsed = JSON.parse(trimmed);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (("type" in parsed && "content" in parsed) ||
          ("t" in parsed && "c" in parsed))
      ) {
        validJsonlLines++;
      }
    } catch {
      // 忽略解析错误
    }
  }

  // 如果至少有一行有效JSONL，且有效率超过50%，则认为是JSONL
  return totalNonEmptyLines > 0 && validJsonlLines / totalNonEmptyLines >= 0.5;
};

// 处理 Data Stream Protocol 内容，提取纯 JSONL
const extractJsonlFromDataStream = (content: string): string => {
  const lines = content.trim().split("\n");
  const jsonlLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 提取 Data Stream Protocol 中的业务数据 (0: 开头的行)
    if (trimmed.startsWith("0:")) {
      const jsonContent = trimmed.slice(2); // 移除 "0:" 前缀
      jsonlLines.push(jsonContent);
    }
    // 忽略控制信号 (8:, 9: 等)
  }

  return jsonlLines.join("\n");
};

export function useAIAnalysis(config: AIAnalysisConfig): AIAnalysisReturn {
  const {
    mode,
    contentId,
    systemPrompt,
    apiEndpoint,
    model = "or-llama-3-1-8b-instruct",
    enableRetry = true,
    maxRetries = 3,
  } = config;

  // 内部状态
  const [customContent, setCustomContent] = useState("");
  const [customIsLoading, setCustomIsLoading] = useState(false);
  const [customError, setCustomError] = useState<Error | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [streamContent, setStreamContent] = useState("");
  const [lastInstruction, setLastInstruction] = useState("");

  // useCompletion hook（用于通用聊天模式）
  const {
    completion,
    setInput,
    isLoading: completionIsLoading,
    error: completionError,
    stop,
    complete,
    setCompletion,
  } = useCompletion({
    api:
      apiEndpoint ||
      (contentId
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/content/${contentId}/completion-updated`
        : "/api/v1/chat/completions"),
    body: { model },
    headers: {
      Authorization: `Bearer ${getCookie("accessToken")}`,
    },
    onResponse: (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    },
    onFinish: (prompt, completion) => {
      setHasStarted(false);
      setStreamContent(completion);
    },
    onError: (error) => {
      setHasStarted(false);
      console.error("Completion error:", error);
    },
  });

  // 获取当前状态的统一接口
  const getCurrentState = useCallback((): AIAnalysisState => {
    const isContentMode = mode === "content" && contentId;
    const isDisplayMode = mode === "display";

    return {
      content: isDisplayMode
        ? customContent
        : isContentMode
          ? customContent
          : completion,
      isLoading: isContentMode ? customIsLoading : completionIsLoading,
      error: isContentMode ? customError : completionError,
      hasStarted,
      isCompleted: !hasStarted && (customContent || completion) !== "",
      streamContent: isContentMode ? streamContent : completion,
      retryCount,
    };
  }, [
    mode,
    contentId,
    customContent,
    customIsLoading,
    customError,
    completion,
    completionIsLoading,
    completionError,
    hasStarted,
    streamContent,
    retryCount,
  ]);

  // 内容分析模式的流式处理 - 修复版本
  const handleContentAnalysis = useCallback(
    async (instruction: string) => {
      if (!contentId) {
        throw new Error("内容分析模式需要提供 contentId");
      }

      setCustomIsLoading(true);
      setCustomError(null);
      setCustomContent("");
      setStreamContent("");

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/content/${contentId}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("accessToken")}`,
            },
            body: JSON.stringify({
              analysis_instruction: instruction,
              model: model,
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
        let rawBuffer = ""; // 缓冲区，处理不完整的行
        let jsonlAccumulated = ""; // 累积的JSONL内容

        console.log("🌊 开始处理流式响应");

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("✅ 流式响应完成");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          rawBuffer += chunk;

          // 按行处理，保留不完整的行
          const lines = rawBuffer.split("\n");
          rawBuffer = lines.pop() || ""; // 保留最后一行（可能不完整）

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            console.log("🔍 处理行:", trimmed);

            if (trimmed.startsWith("0:")) {
              // 业务数据行，提取 JSONL 内容
              const jsonContent = trimmed.slice(2);
              console.log("📝 提取的 JSONL:", jsonContent);

              if (jsonContent) {
                jsonlAccumulated += jsonContent + "\n";

                // 实时更新状态
                setCustomContent(jsonlAccumulated);
                setStreamContent(jsonlAccumulated);
              }
            } else if (trimmed.startsWith("8:")) {
              // 完成信号
              console.log("🏁 收到完成信号");
              break;
            } else if (trimmed.startsWith("9:")) {
              // 错误信号
              console.log("❌ 收到错误信号:", trimmed);
              try {
                const errObj = JSON.parse(trimmed.slice(2));
                throw new Error(errObj.error || "Stream error");
              } catch {
                throw new Error("Stream error");
              }
            }
          }
        }

        console.log("🎯 最终 JSONL 内容:", jsonlAccumulated);

        // 最终设置内容
        setCustomContent(jsonlAccumulated);
        setStreamContent(jsonlAccumulated);

        setCustomIsLoading(false);
        setHasStarted(false);
        setRetryCount(0);
      } catch (error) {
        console.error("💥 分析失败:", error);
        setCustomIsLoading(false);
        setHasStarted(false);

        const finalError =
          error instanceof Error ? error : new Error("分析失败");
        setCustomError(finalError);

        // 自动重试逻辑
        if (enableRetry && retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);
          setTimeout(() => {
            handleContentAnalysis(instruction);
          }, 1000 * Math.pow(2, retryCount)); // 指数退避
        }

        throw finalError;
      }
    },
    [contentId, model, enableRetry, maxRetries, retryCount],
  );

  // 通用聊天模式处理
  const handleChatAnalysis = useCallback(
    async (instruction: string) => {
      if (!systemPrompt) {
        throw new Error("通用聊天模式需要提供 systemPrompt");
      }

      const fullPrompt = `${instruction}\n\n以下是要分析的内容：\n${systemPrompt}`;

      try {
        await complete(fullPrompt);
        setRetryCount(0);
      } catch (error) {
        // 自动重试逻辑
        if (enableRetry && retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);
          setTimeout(() => {
            handleChatAnalysis(instruction);
          }, 1000 * Math.pow(2, retryCount));
        }
        throw error;
      }
    },
    [systemPrompt, complete, enableRetry, maxRetries, retryCount],
  );

  // 开始分析
  const startAnalysis = useCallback(
    async (instruction: string) => {
      if (mode === "display") {
        throw new Error("只读模式不支持分析操作");
      }

      setHasStarted(true);
      setLastInstruction(instruction);

      try {
        if (mode === "content") {
          await handleContentAnalysis(instruction);
        } else {
          await handleChatAnalysis(instruction);
        }
      } catch (error) {
        setHasStarted(false);
        throw error;
      }
    },
    [mode, handleContentAnalysis, handleChatAnalysis],
  );

  // 停止分析
  const stopAnalysis = useCallback(() => {
    setHasStarted(false);

    if (mode === "content") {
      setCustomIsLoading(false);
    } else {
      stop();
    }
  }, [mode, stop]);

  // 重试分析
  const retryAnalysis = useCallback(async () => {
    if (!lastInstruction) return;

    // 清空错误状态
    if (mode === "content") {
      setCustomError(null);
      setCustomContent("");
    } else {
      setCompletion("");
    }

    await startAnalysis(lastInstruction);
  }, [lastInstruction, mode, startAnalysis, setCompletion]);

  // 清空结果
  const clearResult = useCallback(() => {
    if (mode === "content") {
      setCustomContent("");
      setCustomError(null);
    } else {
      setCompletion("");
      setInput("");
    }
    setStreamContent("");
    setHasStarted(false);
    setRetryCount(0);
    setLastInstruction("");
  }, [mode, setCompletion, setInput]);

  // 复制结果
  const copyResult = useCallback(async (): Promise<boolean> => {
    try {
      const state = getCurrentState();
      await navigator.clipboard.writeText(state.content);
      return true;
    } catch {
      return false;
    }
  }, [getCurrentState]);

  // 设置内容（用于只读模式）
  const setContent = useCallback(
    (content: string) => {
      if (mode !== "display") {
        console.warn("setContent 只能在只读模式下使用");
        return;
      }
      setCustomContent(content);
    },
    [mode],
  );

  const state = getCurrentState();

  const actions: AIAnalysisActions = {
    startAnalysis,
    stopAnalysis,
    retryAnalysis,
    clearResult,
    copyResult,
    setContent,
  };

  return { state, actions };
}

// 导出 JSONL 检测函数供外部使用
export { isJsonlContent, extractJsonlFromDataStream };
