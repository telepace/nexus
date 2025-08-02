"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 存储键，每个内容页面独立存储
  const STORAGE_KEY = `streaming_conversations_${contentId}`;
  
  // 页面加载时恢复对话状态
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // 恢复时间戳为Date对象
        const restoredConversations = parsedData.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(restoredConversations);
        console.log('📥 恢复对话历史:', restoredConversations.length, '个对话');
      }
    } catch (error) {
      console.error('❌ 恢复对话历史失败:', error);
    }
  }, [contentId, STORAGE_KEY]);
  
  // 对话状态变化时保存到localStorage - 添加防抖机制
  useEffect(() => {
    if (conversations.length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          // 限制存储的对话数量，只保留最近50个对话以防止内存泄漏
          const limitedConversations = conversations.slice(-50);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedConversations));
          console.log('💾 保存对话历史:', limitedConversations.length, '个对话');
        } catch (error) {
          console.error('❌ 保存对话历史失败:', error);
          // 如果存储失败，尝试清理旧数据后重试
          try {
            localStorage.removeItem(STORAGE_KEY);
            const limitedConversations = conversations.slice(-20);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedConversations));
          } catch (retryError) {
            console.error('❌ 重试保存也失败:', retryError);
          }
        }
      }, 500); // 500ms防抖延迟

      return () => clearTimeout(timeoutId);
    }
  }, [conversations, STORAGE_KEY]);

  // 生成唯一ID
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 创建新对话 - 立即创建并显示
  const createConversation = useCallback(
    (
      userInput: string,
      promptTemplate?: string,
      metadata?: Record<string, any>
    ): string => {
      const conversationId = generateId();
      const userMessageId = generateId();
      const assistantMessageId = generateId();

      // 🎯 优化：确保历史记录显示简洁内容
      // 优先级：originalUserInput > promptName > 截断的userInput
      let displayContent = userInput;
      if (metadata?.originalUserInput) {
        displayContent = metadata.originalUserInput;
      } else if (metadata?.promptName) {
        displayContent = metadata.promptName;
      } else if (userInput.length > 50) {
        // 如果是长文本且没有提供简洁版本，则截断显示
        displayContent = userInput.substring(0, 50) + "...";
      }
      
      const userMessage: ConversationMessage = {
        id: userMessageId,
        role: "user",
        content: displayContent, // 使用简洁的显示内容
        timestamp: new Date(),
        status: "completed",
        metadata: {
          promptTemplate,
          promptName: metadata?.promptName, // 保存prompt名称
          promptId: metadata?.promptId, // 保存prompt ID
          originalUserInput: metadata?.originalUserInput, // 保存原始用户输入
          actualPromptContent: metadata?.actualPromptContent, // 保留完整内容用于API调用
          isPromptBased: !!metadata?.promptName, // 标记是否基于prompt
          ...metadata,
        },
      };

      const assistantMessage: ConversationMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "pending", // 立即设置为pending状态
        metadata: {
          promptTemplate,
          promptName: metadata?.promptName,
          ...metadata,
        },
      };

      const newConversation: ConversationGroup = {
        id: conversationId,
        messages: [userMessage, assistantMessage],
        createdAt: new Date(),
      };

      // 🎯 修复：将新对话添加到数组末尾，确保最新对话出现在最下面
      setConversations(prev => {
        const newConversations = [...prev, newConversation];
        console.log("📊 对话状态更新:", {
          previousCount: prev.length,
          newCount: newConversations.length,
          newConversationId: conversationId,
          displayContent: displayContent
        });
        return newConversations;
      });
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
    async (
      conversationId: string, 
      assistantMessageId: string,
      userInput: string, 
      actualContent: string,
      promptTemplate?: string
    ) => {
      console.log("🚀 开始流式请求:", {
        conversationId,
        assistantMessageId,
        userInput,
        actualContent: actualContent.substring(0, 100) + "...",
        promptTemplate,
      });

      // 为每个对话创建独立的 AbortController
      const conversationAbortController = new AbortController();
      
      try {
        // 设置为思考状态
        updateMessageStatus(conversationId, assistantMessageId, "thinking");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const token = getCookie("accessToken");
        
        if (!token) {
          console.error("❌ 未找到访问令牌");
          throw new Error("未找到访问令牌，请重新登录");
        }

        const requestBody = {
          analysis_instruction: actualContent, // 🎯 使用实际内容发送请求
          template_name: promptTemplate,
        };

        console.log("📤 API请求参数:", {
          url: `${apiUrl}/api/v1/content/${contentId}/completion-updated`,
          body: requestBody,
          hasToken: !!token
        });

        console.log("🌐 即将发送 fetch 请求...");

        const response = await fetch(
          `${apiUrl}/api/v1/content/${contentId}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
            signal: conversationAbortController.signal,
          }
        );

        console.log("📥 API响应状态:", response.status, response.statusText);
        console.log("📥 收到响应，开始处理流式数据...");

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ API错误响应:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
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
                updateMessageStatus(conversationId, assistantMessageId, "streaming");
                hasStartedStreaming = true;
              }

              const jsonlLine = line.slice(2);
              if (jsonlLine.trim()) {
                accumulatedContent += jsonlLine + "\n";
                updateMessageContent(conversationId, assistantMessageId, accumulatedContent);
              }
            } else if (line.startsWith("8:")) {
              // 完成信号
              updateMessageStatus(conversationId, assistantMessageId, "completed");
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
        updateMessageStatus(conversationId, assistantMessageId, "completed");

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 用户取消了请求
          console.log("Request was aborted");
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "处理失败";
        console.error("Streaming failed:", error);
        setMessageError(conversationId, assistantMessageId, errorMessage);
        onError?.(errorMessage);
      }
    },
    [contentId, updateMessageStatus, updateMessageContent, setMessageError, onError]
  );

  // 发送消息（立即创建对话卡片，然后开始流式响应）
  const sendMessage = useCallback(
    async (userInput: string, promptTemplate?: string, metadata?: Record<string, any>) => {
      console.log("🎯 sendMessage 被调用:", {
        userInput,
        promptTemplate,
        metadata,
        contentId
      });

      if (!userInput.trim()) {
        console.warn("⚠️ 用户输入为空，跳过发送");
        return;
      }

      // 🎯 在创建对话前就准备好所有信息
      const conversationId = generateId();
      const userMessageId = generateId();
      const assistantMessageId = generateId();

      // 获取实际要发送的内容
      const actualContent = metadata?.actualPromptContent || userInput;

      console.log("📋 准备创建对话:", {
        conversationId,
        assistantMessageId,
        actualContent: actualContent.substring(0, 100) + "..."
      });

      // 🎯 优化：确保历史记录显示简洁内容
      // 优先级：originalUserInput > promptName > 截断的userInput
      let displayContent = userInput;
      if (metadata?.originalUserInput) {
        displayContent = metadata.originalUserInput;
      } else if (metadata?.promptName) {
        displayContent = metadata.promptName;
      } else if (userInput.length > 50) {
        // 如果是长文本且没有提供简洁版本，则截断显示
        displayContent = userInput.substring(0, 50) + "...";
      }
      
      // 创建用户消息
      const userMessage: ConversationMessage = {
        id: userMessageId,
        role: "user",
        content: displayContent, // 使用简洁的显示内容
        timestamp: new Date(),
        status: "completed",
        metadata: {
          promptTemplate,
          promptName: metadata?.promptName, // 保存prompt名称
          promptId: metadata?.promptId, // 保存prompt ID
          originalUserInput: metadata?.originalUserInput, // 保存原始用户输入
          actualPromptContent: metadata?.actualPromptContent, // 保留完整内容用于API调用
          isPromptBased: !!metadata?.promptName, // 标记是否基于prompt
          ...metadata,
        },
      };

      // 创建助手消息
      const assistantMessage: ConversationMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "pending",
        metadata: {
          promptTemplate,
          promptName: metadata?.promptName,
          ...metadata,
        },
      };

      // 创建对话
      const newConversation: ConversationGroup = {
        id: conversationId,
        messages: [userMessage, assistantMessage],
        createdAt: new Date(),
      };

      // 更新状态
      setConversations(prev => {
        const newConversations = [...prev, newConversation];
        console.log("📊 对话状态更新:", {
          previousCount: prev.length,
          newCount: newConversations.length,
          newConversationId: conversationId,
          displayContent: displayContent
        });
        return newConversations;
      });
      onConversationUpdate?.(newConversation);

      console.log("📋 对话卡片已创建，开始流式响应...", conversationId);
      
      // 🎯 修复：直接调用 startStreaming，传递所有必要参数
      try {
        console.log("⏰ 立即开始流式响应...");
        await startStreaming(conversationId, assistantMessageId, userInput, actualContent, promptTemplate);
      } catch (error) {
        console.error("❌ startStreaming 调用失败:", error);
      }
    },
    [startStreaming, contentId, onConversationUpdate]
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

      // 获取实际内容
      const actualContent = userMessage.metadata?.actualPromptContent || userMessage.content;

      // 重新开始流式响应
      await startStreaming(
        conversation.id,
        assistantMessage.id,
        userMessage.content,
        actualContent,
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

  // 清除存储的对话历史
  const clearConversationHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setConversations([]);
      console.log('🗑️ 清除对话历史');
    } catch (error) {
      console.error('❌ 清除对话历史失败:', error);
    }
  }, [STORAGE_KEY]);
  
  // 恢复特定对话
  const restoreConversation = useCallback((conversation: ConversationGroup) => {
    setConversations(prev => {
      // 检查是否已存在相同ID的对话
      const existingIndex = prev.findIndex(c => c.id === conversation.id);
      if (existingIndex >= 0) {
        // 更新现有对话
        const updated = [...prev];
        updated[existingIndex] = conversation;
        return updated;
      } else {
        // 添加新对话
        return [...prev, conversation];
      }
    });
  }, []);

  return {
    conversations,
    sendMessage,
    retryMessage,
    deleteConversation,
    cancelCurrentProcessing,
    clearConversationHistory,
    restoreConversation,
  };
}