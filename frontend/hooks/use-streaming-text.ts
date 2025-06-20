import { useState, useEffect, useRef, useCallback } from "react";
import { getCookie } from "@/lib/auth";

export interface StreamingOptions {
  /** 打字机效果的延迟时间（毫秒） */
  typewriterDelay?: number;
  /** 是否启用打字机效果 */
  enableTypewriter?: boolean;
  /** 防抖延迟时间（毫秒） */
  debounceDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟时间（毫秒） */
  retryDelay?: number;
  /** 自定义错误处理 */
  onError?: (error: Error) => void;
  /** 流开始回调 */
  onStart?: () => void;
  /** 流结束回调 */
  onComplete?: (content: string) => void;
  /** 内容更新回调 */
  onUpdate?: (content: string) => void;
}

export interface StreamingState {
  /** 当前显示的内容 */
  content: string;
  /** 原始接收的内容（用于打字机效果） */
  rawContent: string;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在连接 */
  isConnecting: boolean;
  /** 是否已完成 */
  isComplete: boolean;
  /** 是否暂停 */
  isPaused: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重试次数 */
  retryCount: number;
}

export interface StreamingControls {
  /** 开始流式请求 */
  start: (url: string, options?: RequestInit) => Promise<void>;
  /** 停止流式请求 */
  stop: () => void;
  /** 暂停/继续打字机效果 */
  togglePause: () => void;
  /** 重试请求 */
  retry: () => void;
  /** 重置状态 */
  reset: () => void;
  /** 立即显示所有内容（跳过打字机效果） */
  skipTypewriter: () => void;
}

export function useStreamingText(
  options: StreamingOptions = {},
): [StreamingState, StreamingControls] {
  const {
    typewriterDelay = 30,
    enableTypewriter = true,
    debounceDelay = 100,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onStart,
    onComplete,
    onUpdate,
  } = options;

  const [state, setState] = useState<StreamingState>({
    content: "",
    rawContent: "",
    isLoading: false,
    isConnecting: false,
    isComplete: false,
    isPaused: false,
    error: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<{ url: string; options?: RequestInit } | null>(
    null,
  );

  // 防抖更新内容
  const debouncedUpdateContent = useCallback(
    (newContent: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setState((prev) => {
          const updated = { ...prev, rawContent: newContent };
          onUpdate?.(newContent);
          return updated;
        });
      }, debounceDelay);
    },
    [debounceDelay, onUpdate],
  );

  // 打字机效果
  useEffect(() => {
    if (!enableTypewriter || state.isPaused || state.isLoading) {
      setState((prev) => ({ ...prev, content: prev.rawContent }));
      return;
    }

    if (state.content.length < state.rawContent.length) {
      typewriterTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          content: prev.rawContent.slice(0, prev.content.length + 1),
        }));
      }, typewriterDelay);
    } else if (
      state.content === state.rawContent &&
      state.rawContent &&
      state.isComplete
    ) {
      onComplete?.(state.rawContent);
    }

    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, [
    state.content,
    state.rawContent,
    state.isPaused,
    state.isLoading,
    state.isComplete,
    enableTypewriter,
    typewriterDelay,
    onComplete,
  ]);

  // 处理流式响应
  const processStream = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            // 检查是否是 Data Stream Protocol 格式
            if (line.startsWith("0:")) {
              // Vercel AI SDK Data Stream Protocol 文本内容
              const content = line.slice(3, -1); // 移除 0:" 和末尾的 "
              if (content) {
                accumulatedContent += content;
                debouncedUpdateContent(accumulatedContent);
              }
            } else if (line.startsWith("8:")) {
              // Vercel AI SDK Data Stream Protocol 完成信号
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isComplete: true,
              }));
              return accumulatedContent;
            } else if (line.startsWith("9:")) {
              // Vercel AI SDK Data Stream Protocol 错误信号
              try {
                const errorData = JSON.parse(line.slice(2));
                throw new Error(errorData.error || "Stream error");
              } catch (parseError) {
                throw new Error("Stream error");
              }
            } else if (line.startsWith("data: ")) {
              // OpenAI SSE 格式s
              const data = line.slice(6).trim();

              if (data === "[DONE]") {
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  isComplete: true,
                }));
                return accumulatedContent;
              }

              try {
                const parsed = JSON.parse(data);

                // 检查错误
                if (parsed.error) {
                  throw new Error(parsed.message || "LLM 服务错误");
                }

                // 提取内容
                if (parsed.choices?.[0]?.delta?.content) {
                  accumulatedContent += parsed.choices[0].delta.content;
                  debouncedUpdateContent(accumulatedContent);
                }
              } catch (parseError) {
                if (
                  parseError instanceof Error &&
                  parseError.message.includes("LLM 服务错误")
                ) {
                  throw parseError;
                }
                // JSON 解析错误，可能是不完整的数据，继续处理
                console.warn("解析流数据失败:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return accumulatedContent;
    },
    [debouncedUpdateContent],
  );

  // 开始流式请求
  const start = useCallback(
    async (url: string, requestOptions: RequestInit = {}) => {
      // 保存请求信息用于重试
      lastRequestRef.current = { url, options: requestOptions };

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isConnecting: true,
        isComplete: false,
        error: null,
        content: "",
        rawContent: "",
      }));

      onStart?.();

      try {
        // 获取认证 token
        const token = getCookie("accessToken");
        if (!token) {
          throw new Error("未找到认证令牌，请重新登录");
        }

        const response = await fetch(url, {
          ...requestOptions,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...requestOptions.headers,
          },
          signal: abortControllerRef.current.signal,
        });

        setState((prev) => ({ ...prev, isConnecting: false }));

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await processStream(response);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // 用户主动取消，不处理错误
        }

        const errorMessage =
          error instanceof Error ? error.message : "请求失败";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isConnecting: false,
          error: errorMessage,
        }));

        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [processStream, onStart, onError],
  );

  // 停止请求
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isConnecting: false,
    }));
  }, []);

  // 暂停/继续
  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  // 重试
  const retry = useCallback(async () => {
    if (!lastRequestRef.current || state.retryCount >= maxRetries) {
      return;
    }

    setState((prev) => ({ ...prev, retryCount: prev.retryCount + 1 }));

    // 延迟重试
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    const { url, options } = lastRequestRef.current;
    await start(url, options);
  }, [state.retryCount, maxRetries, retryDelay, start]);

  // 重置状态
  const reset = useCallback(() => {
    stop();
    setState({
      content: "",
      rawContent: "",
      isLoading: false,
      isConnecting: false,
      isComplete: false,
      isPaused: false,
      error: null,
      retryCount: 0,
    });
    lastRequestRef.current = null;
  }, [stop]);

  // 跳过打字机效果
  const skipTypewriter = useCallback(() => {
    setState((prev) => ({ ...prev, content: prev.rawContent }));
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return [
    state,
    {
      start,
      stop,
      togglePause,
      retry,
      reset,
      skipTypewriter,
    },
  ];
}
