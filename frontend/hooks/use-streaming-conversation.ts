"use client";

import { useState, useCallback, useRef } from "react";
import { getCookie } from "cookies-next";
import { ConversationMessage } from "@/components/ai/StreamingConversationCard";

interface ConversationGroup {
  id: string;
  messages: ConversationMessage[];
  createdAt: Date;
}

interface UseStreamingConversationOptions {
  contentId: string;
  onConversationUpdate?: (conversation: ConversationGroup) => void;
  onError?: (error: string) => void;
}

export function useStreamingConversation({
  contentId,
  onConversationUpdate,
  onError,
}: UseStreamingConversationOptions) {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 生成唯一ID
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 创建新对话
  const createConversation = useCallback(
    async (
      userInput: string,
      promptTemplate?: string,
      metadata?: Record<string, any>
    ): Promise<string> => {
      const conversationId = generateId();
      const userMessageId = generateId();
      const assistantMessageId = generateId();

      const userMessage: ConversationMessage = {
        id: userMessageId,
        role: "user",
        content: userInput,
        timestamp: new Date(),
        status: "completed",
        metadata: {
          promptTemplate,
          ...metadata,
        },
      };

      const assistantMessage: ConversationMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "pending",
        metadata: {
          promptTemplate,
          ...metadata,
        },
      };

      const newConversation: ConversationGroup = {
        id: conversationId,
        messages: [userMessage, assistantMessage],
        createdAt: new Date(),
      };

      setConversations(prev => [newConversation, ...prev]);
      onConversationUpdate?.(newConversation);

      return conversationId;
    },
    [onConversationUpdate]
  );

  // 更新消息状态
  const updateMessageStatus = useCallback(
    (conversationId: string, messageId: string, status: ConversationMessage["status"]) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === messageId ? { ...msg, status } : msg
                ),
              }
            : conv
        )
      );
    },
    []
  );

  // 更新消息内容
  const updateMessageContent = useCallback(
    (conversationId: string, messageId: string, content: string) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === messageId ? { ...msg, content } : msg
                ),
              }
            : conv
        )
      );
    },
    []
  );

  // 设置消息错误
  const setMessageError = useCallback(
    (conversationId: string, messageId: string, error: string) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === messageId
                    ? { ...msg, status: "error", error }
                    : msg
                ),
              }
            : conv
        )
      );
    },
    []
  );

  // 开始流式响应
  const startStreaming = useCallback(
    async (conversationId: string, userInput: string, promptTemplate?: string) => {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const assistantMessage = conversation.messages.find(m => m.role === "assistant");
      if (!assistantMessage) return;

      setIsProcessing(true);
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      try {
        // 设置为思考状态
        updateMessageStatus(conversationId, assistantMessage.id, "thinking");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/content/${contentId}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("accessToken")}`,
            },
            body: JSON.stringify({
              analysis_instruction: userInput,
              template_name: promptTemplate,
            }),
            signal: abortControllerRef.current.signal,
          }
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
        let hasStartedStreaming = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("0:")) {
              // 第一次接收到内容时，切换到 streaming 状态
              if (!hasStartedStreaming) {
                updateMessageStatus(conversationId, assistantMessage.id, "streaming");
                hasStartedStreaming = true;
              }

              const jsonlLine = line.slice(2);
              if (jsonlLine.trim()) {
                accumulatedContent += jsonlLine + "\n";
                updateMessageContent(conversationId, assistantMessage.id, accumulatedContent);
              }
            } else if (line.startsWith("8:")) {
              // 完成信号
              updateMessageStatus(conversationId, assistantMessage.id, "completed");
              break;
            } else if (line.startsWith("9:")) {
              // 错误信号
              try {
                const errorData = JSON.parse(line.slice(2));
                throw new Error(errorData.error || "Stream error");
              } catch {
                throw new Error("Stream error");
              }
            }
          }
        }

        // 确保最终状态是 completed
        updateMessageStatus(conversationId, assistantMessage.id, "completed");

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 用户取消了请求
          console.log("Request was aborted");
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "处理失败";
        console.error("Streaming failed:", error);
        setMessageError(conversationId, assistantMessage.id, errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [conversations, contentId, updateMessageStatus, updateMessageContent, setMessageError, onError]
  );

  // 发送消息（创建对话并开始流式响应）
  const sendMessage = useCallback(
    async (userInput: string, promptTemplate?: string, metadata?: Record<string, any>) => {
      if (!userInput.trim() || isProcessing) return;

      const conversationId = await createConversation(userInput, promptTemplate, metadata);
      await startStreaming(conversationId, userInput, promptTemplate);
    },
    [createConversation, startStreaming, isProcessing]
  );

  // 重试消息
  const retryMessage = useCallback(
    async (messageId: string) => {
      const conversation = conversations.find(c => 
        c.messages.some(m => m.id === messageId)
      );
      
      if (!conversation) return;

      const assistantMessage = conversation.messages.find(m => m.id === messageId);
      const userMessage = conversation.messages.find(m => m.role === "user");

      if (!assistantMessage || !userMessage) return;

      // 重置助手消息状态
      updateMessageStatus(conversation.id, messageId, "pending");
      updateMessageContent(conversation.id, messageId, "");

      // 重新开始流式响应
      await startStreaming(
        conversation.id,
        userMessage.content,
        assistantMessage.metadata?.promptTemplate
      );
    },
    [conversations, updateMessageStatus, updateMessageContent, startStreaming]
  );

  // 删除对话
  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    },
    []
  );

  // 取消当前处理
  const cancelCurrentProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    conversations,
    isProcessing,
    sendMessage,
    retryMessage,
    deleteConversation,
    cancelCurrentProcessing,
  };
}