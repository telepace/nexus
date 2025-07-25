"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  MessageSquare,
  ArrowUpRight,
  Share,
  Sparkles,
  RefreshCw,
  Minus,
  Plus,
  Loader2,
  Bot,
  User,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useCardHeight } from "@/hooks/use-card-height";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import { useToast } from "@/hooks/use-toast";
import {
  AIResult,
  ConversationListResponse,
  ConversationPublic,
} from "@/lib/api/content";
import { ContentItemPublic } from "@/app/(withSidebar)/content-library/types";
import { adaptAnalysisData } from "./AnalysisCards";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { getCookie } from "cookies-next";
// import { getConversationTitle, getConversationTypeLabel } from "@/utils/conversationUtils";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useLLMAnalysisStore } from "@/lib/stores/llm-analysis-store";

// 简单的对话标题获取函数
const getConversationTitle = (conversation: ConversationPublic, maxLength: number = 25): string => {
  if (conversation.title) {
    return conversation.title.length > maxLength 
      ? conversation.title.substring(0, maxLength) + '...'
      : conversation.title;
  }
  
  // 如果没有标题，尝试从第一条消息获取
  if (conversation.messages && conversation.messages.length > 0) {
    const firstMessage = conversation.messages[0];
    const content = firstMessage.content || '';
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }
  
  return "未命名对话";
};

// 简单的对话类型标签获取函数
const getConversationTypeLabel = (conversation: ConversationPublic): string => {
  // 根据对话的属性判断类型
  if (conversation.conversation_type) {
    switch (conversation.conversation_type) {
      case 'chat_conversation':
        return '对话';
      case 'summarizer':
        return '摘要';
      case 'processing_pipeline':
        return '处理';
      default:
        return '分析';
    }
  }
  return '对话';
};

interface ModernAnalysisInterfaceProps {
  content: ContentItemPublic;
  conversations?: ConversationListResponse["conversations"];
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
  // 新增变体配置支持
  variant?: "preview" | "sidebar" | "fullscreen";
  showPreprocessedContent?: boolean;
  height?: "fixed" | "full";
  hideHeader?: boolean;
  onHistoryCountChange?: (count: number) => void;
  showHistory?: boolean;
}

interface AnalysisCard {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "conversations" | "historyConversation" | "custom" | "streaming";
    data: any;
  };
}

const ModernAnalysisInterface: React.FC<ModernAnalysisInterfaceProps> = ({
  content,
  conversations,
  analysisResult = null,
  isLoading = false,
  className = "",
  // 新增变体配置，默认为fullscreen（保持现有行为）
  variant = "fullscreen",
  showPreprocessedContent = true,
  height = "full",
  hideHeader = false,
  onHistoryCountChange,
  showHistory: showHistoryProp,
}) => {
  const { toast } = useToast();

  // 状态管理
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  // 新增：追踪当前分析的标题
  const [currentAnalysisTitle, setCurrentAnalysisTitle] = useState<string>("AI 回复");
  
  // 滚动控制相关状态
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lastCardCount, setLastCardCount] = useState(0);
  const { enabledPrompts, isLoadingPrompts, loadPrompts } = useLLMAnalysisStore();
  // Load prompts from store
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  // 动态高度管理
  const { registerElement, getCardHeight } = useCardHeight();

  // 移除原有的文本操作按钮 - 现在由独立组件处理
  // const textActions = [...]

  // 获取真实的prompts作为AI指令标签
  // useEffect(() => {
  //   const loadPrompts = async () => {
  //     try {
  //       setLoadingPrompts(true);
  //       const promptsResponse = await fetchPrompts({
  //         sort: "updated_at",
  //         order: "desc",
  //       });

  //       if (Array.isArray(promptsResponse)) {
  //         // 优化的过滤逻辑：
  //         // 1. 显示用户明确启用的 prompts (user_enabled: true)
  //         // 2. 显示系统启用且用户未设置的 prompts (enabled: true && user_enabled: undefined/null)
  //         // 3. 排除用户明确禁用的 prompts (user_enabled: false)
  //         const availablePrompts = promptsResponse
  //           .filter((p) => {
  //             // 系统级别必须启用
  //             if (!p.enabled) return false;

  //             // 如果用户明确禁用，则不显示
  //             if (p.user_enabled === false) return false;

  //             // 用户明确启用或者用户未设置（默认采用系统设置）
  //             return (
  //               p.user_enabled === true ||
  //               p.user_enabled === undefined ||
  //               p.user_enabled === null
  //             );
  //           })
  //           .slice(0, 7);

  //         setPrompts(availablePrompts);

  //         // 调试信息
  //         console.log("[ModernAnalysisInterface] Prompts 加载情况:", {
  //           总数: promptsResponse.length,
  //           系统启用: promptsResponse.filter((p) => p.enabled).length,
  //           用户启用: promptsResponse.filter((p) => p.user_enabled === true)
  //             .length,
  //           用户禁用: promptsResponse.filter((p) => p.user_enabled === false)
  //             .length,
  //           用户未设置: promptsResponse.filter(
  //           (p) => p.user_enabled === undefined || p.user_enabled === null,
  //         ).length,
  //         最终显示: availablePrompts.length,
  //         显示的prompts: availablePrompts.map((p) => ({
  //         name: p.name,
  //         enabled: p.enabled,
  //         user_enabled: p.user_enabled,
  //       })),
  //     });
  //   }
  // } catch (error) {
  //   console.error("获取prompts失败:", error);
  // } finally {
  //   setLoadingPrompts(false);
  // }
  // };

  // loadPrompts();
  // }, []);

  // 获取真实的历史对话记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const historyResponse = await contentApi.getContentConversations(
          content.id,
        );
        const records = historyResponse.conversations.slice(0, 10);
        setHistoryRecords(records);
        onHistoryCountChange?.(records.length);
      } catch (error) {
        console.error("获取历史记录失败:", error);
        onHistoryCountChange?.(0);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (content.id) {
      loadHistory();
    }
  }, [content.id, onHistoryCountChange]);

  // 监听来自正文区域的文本选择事件
  useEffect(() => {
    const handleTextSelectionAction = (event: CustomEvent) => {
      const { action, selectedText } = event.detail;

      // 自动填充输入框并执行分析
      const prompt = `${action.prompt}\n\n${selectedText}`;
      setInputValue(prompt);

      // 可选：自动开始分析
      // setTimeout(() => {
      //   if (prompt.trim()) {
      //     handleAnalysis();
      //   }
      // }, 500);
    };

    window.addEventListener(
      "textSelectionAction" as keyof WindowEventMap,
      handleTextSelectionAction,
    );

    return () => {
      window.removeEventListener(
        "textSelectionAction" as keyof WindowEventMap,
        handleTextSelectionAction,
      );
    };
  }, []);

  // 监听点击外部 - 简化逻辑
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedBlock(null);
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // 处理AI分析
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const performCompletion = useCallback(
    async (body: Record<string, unknown>, title: string) => {
      // isAnalyzing 是在函数外部定义的，但在函数内部使用。
      // 为了确保函数在重新渲染时能够获取到最新的 isAnalyzing 状态，
      // 我们不应该将其包含在 useCallback 的依赖数组中，
      // 否则会导致函数在 isAnalyzing 变化时重新创建，从而引发逻辑问题。
      // 正确的做法是，useCallback 依赖的应该是那些在组件生命周期内基本不变的函数或值。
      if (isAnalyzing) return;

      setIsAnalyzing(true);
      
      // 立即设置加载状态，让卡片立即显示
      setStreamingResponse("LOADING_PLACEHOLDER_" + Date.now());

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/content/${content.id}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("accessToken")}`,
            },
            body: JSON.stringify(body),
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
        let hasStartedStreaming = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            // 处理Vercel AI SDK数据流协议
            if (line.startsWith("0:")) {
              // 第一次接收到数据时，清空加载占位符
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                accumulatedContent = "";
              }
              
              // 文本内容 - 提取JSONL行
              const jsonlLine = line.slice(2); // 移除 "0:" 前缀
              if (jsonlLine.trim()) {
                accumulatedContent += jsonlLine + "\n";
                setStreamingResponse(accumulatedContent);
              }
            } else if (line.startsWith("8:")) {
              // 完成信号 - 最终更新
              setStreamingResponse(accumulatedContent);
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

        setInputValue("");
        toast({
          title: title,
          description: "AI 分析已成功完成",
        });
      } catch (error) {
        console.error("Analysis failed:", error);
        // 错误时清空streamingResponse，避免显示加载占位符
        setStreamingResponse("");
        toast({
          title: "分析失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [
      content.id,
      toast,
      setInputValue,
      setStreamingResponse,
      setIsAnalyzing,
      isAnalyzing,
    ],
  );

  // 处理prompt标签点击
  const handlePromptClick = useCallback(
    async (prompt: PromptData) => {
      // 设置分析标题为 prompt 名称
      setCurrentAnalysisTitle(prompt.name);
      
      // 替换prompt模板中的变量
      let promptContent = prompt.content;
      if (promptContent.includes("{content}")) {
        promptContent = promptContent.replace(
          "{content}",
          content.content_text || content.title || "内容",
        );
      }

      // 立即开始处理，不需要用户再次点击发送
      await performCompletion(
        {
          analysis_instruction: promptContent,
          template_name: prompt.name,
        },
        `正在使用"${prompt.name}"模板进行分析`,
      );

      // 清空输入框
      setInputValue("");
    },
    [content, performCompletion],
  );

  // 处理历史记录点击
  const handleHistoryClick = useCallback((conversation: ConversationPublic) => {
    const historyContent = conversation.summary 
      ? `继续关于"${conversation.title}"的对话：${conversation.summary}`
      : `继续关于"${conversation.title}"的对话`;
    
    // 设置分析标题为历史对话标题
    const title = conversation.title || "历史对话";
    const displayTitle = title.length > 20 ? title.substring(0, 20) + "..." : title;
    setCurrentAnalysisTitle(`继续：${displayTitle}`);
    
    setInputValue(historyContent);
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim()) return;
    
    // 设置分析标题为用户输入的消息（截取前20个字符）
    const userMessage = inputValue.trim();
    const title = userMessage.length > 20 ? userMessage.substring(0, 20) + "..." : userMessage;
    setCurrentAnalysisTitle(title);
    
    await performCompletion(
      {
        analysis_instruction: inputValue,
        template_name: "simple_chat.j2",  // 🎯 手动输入使用简单聊天模板
      },
      "分析完成",
    );
  }, [inputValue, performCompletion]);

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      console.log(
        "[ModernAnalysisInterface] JSON line expand requested:",
        jsonContent,
      );

      // 构造展开讨论的prompt
      const selectedPoint =
        jsonContent.c || jsonContent.content || JSON.stringify(jsonContent);
      const instruction = `请对以下要点进行深度展开讨论：${selectedPoint}`;

      // 设置分析标题
      const pointText = String(selectedPoint);
      const title = pointText.length > 15 ? pointText.substring(0, 15) + "..." : pointText;
      setCurrentAnalysisTitle(`展开：${title}`);

      // 立即触发分析，不设置输入值
      await performCompletion(
        {
          analysis_instruction: instruction,
          template_name: "expand_discussion.j2",
          selected_point: selectedPoint,
        },
        "展开分析完成",
      );
    },
    [performCompletion],
  );

  // 构建分析卡片数据
  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    if (!analysisResult && !streamingResponse && (!conversations || conversations.length === 0)) return [];

    const cards: AnalysisCard[] = [];
    // 使用meta_info代替ai_analysis
    const metaInfo = content.meta_info ? JSON.parse(content.meta_info) : null;
    const adaptedData = adaptAnalysisData(analysisResult, metaInfo);

    // 只有在显示预处理内容时才添加这些卡片
    if (showPreprocessedContent) {
      // 内容摘要卡片
      if (adaptedData.summary) {
        cards.push({
          id: `summary-${content.id}`,
          title: "内容摘要",
          subtitle: "",
          emoji: "📄",
          content: {
            type: "summary",
            data: adaptedData.summary,
          },
        });
      }

      // 关键要点卡片
      if (adaptedData.keyPoints) {
        cards.push({
          id: `keyPoints-${content.id}`,
          title: "提问清单",
          subtitle: "",
          emoji: "🤔",
          content: {
            type: "keyPoints",
            data: adaptedData.keyPoints,
          },
        });
      }
    }

    // 历史对话卡片 - 每个对话作为独立卡片显示
    if (conversations && conversations.length > 0) {
      const conversationsWithMessages = conversations.filter(conv => 
        conv.messages && conv.messages.length > 0
      );
      
      // 为每个历史对话创建独立卡片
      conversationsWithMessages.forEach((conversation, index) => {
        const userMessages = conversation.messages?.filter((msg: any) => msg.role !== "system") || [];
        const messageCount = userMessages.length;
        
        // 获取对话标题
        const conversationTitle = conversation.title || 
          getConversationTitle(conversation, 25) || 
          "历史对话";
          
        // 获取对话类型标签
        const typeLabel = getConversationTypeLabel(conversation);
        
        cards.push({
          id: `conversation-${conversation.id}`,
          title: conversationTitle,
          subtitle: `${typeLabel} · ${messageCount} 条消息 · ${formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true, locale: zhCN })}`,
          emoji: "💬",
          content: {
            type: "historyConversation",
            data: conversation,
          },
        });
      });
    }

    // AI响应卡片 - 当有流式响应时显示（但不显示用户输入）
    if (streamingResponse && !streamingResponse.startsWith("LOADING_PLACEHOLDER_")) {
      cards.push({
        id: `streaming-${content.id}`,
        title: currentAnalysisTitle,
        subtitle: isAnalyzing ? "正在生成回复..." : "回复完成",
        emoji: "🤖",
        content: {
          type: "streaming",
          data: streamingResponse,
        },
      });
    }

    return cards;
  }, [
    analysisResult,
    content.meta_info,
    streamingResponse,
    isAnalyzing,
    showPreprocessedContent,
    conversations,
    currentAnalysisTitle,
  ]);

  const cards = buildAnalysisCards();

  // 监测新卡片出现并自动滚动到底部
  useEffect(() => {
    const currentCardCount = cards.length;
    
    // 只在卡片数量增加时（新卡片出现）滚动到底部
    if (currentCardCount > lastCardCount && lastCardCount > 0) {
      // 延迟一下以确保DOM已更新
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
    
    setLastCardCount(currentCardCount);
  }, [cards.length, lastCardCount]);

  // 渲染卡片内容
  const renderCardContent = (card: AnalysisCard) => {
    const { content: cardContent } = card;

    if (cardContent.type === "summary" || cardContent.type === "keyPoints") {
      let textContent = "";

      if (typeof cardContent.data === "string") {
        textContent = cardContent.data;
      } else if (cardContent.data && typeof cardContent.data === "object") {
        textContent =
          (cardContent.data as any).text ||
          (cardContent.data as any).content ||
          (cardContent.data as any).summary ||
          JSON.stringify(cardContent.data);
      }

      if (!textContent) return null;

      return (
        <div
          className={`
            px-6 py-3 rounded-lg transition-all duration-200
            ${
              selectedBlock === `${card.id}-main`
                ? "linear-bg-1 opacity-90"
                : "hover:linear-bg-1"
            }
          `}
        >
          <div className="select-text prose prose-sm max-w-none dark:prose-invert">
            <UniversalContentRenderer
              content={textContent}
              onExpandLine={handleJsonLineExpand}
              enableDelayedRendering={false}
              renderDelay={400}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // 渲染输入内容 - 优雅处理长文本
  const renderInputContent = (content: string, timestamp: number) => {
    const maxLength = 200; // 最大显示长度
    const isLong = content.length > maxLength;
    
    const toggleExpanded = () => {
      // This function is no longer needed as expandedInputs state is removed
    };
    
    if (!isLong) {
      // 短文本直接显示
      return (
        <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      );
    }

    // 长文本处理
    const displayContent = content; // No longer need to truncate
    
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </div>
        <button
          onClick={toggleExpanded}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200 flex items-center gap-1"
        >
          {/* This button is no longer needed as expandedInputs state is removed */}
          {/* {isExpanded ? (
            <>
              <Minus className="h-3 w-3" />
              收起
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              显示完整内容 ({content.length - maxLength} 个字符)
            </>
          )} */}
        </button>
      </div>
    );
  };

  // 处理卡片折叠状态
  const toggleCardCollapse = useCallback((cardId: string) => {
    setCollapsedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // 渲染卡片组件
  const CardComponent = ({ card }: { card: AnalysisCard }) => {
    const isSelected = selectedCard === card.id;
    const isHovered = hoveredCard === card.id;
    const isCollapsed = collapsedCards.has(card.id);

    // 检测是否为文本选择操作
    const handleCardClick = (e: React.MouseEvent) => {
      // 如果用户正在进行文本选择，不触发卡片选中
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }

      // 如果点击的是按钮或链接，不触发卡片选中
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a")
      ) {
        return;
      }

      setSelectedCard(isSelected ? null : card.id);
    };

    return (
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${isSelected ? "scale-[1.02] shadow-lg" : ""}
          ${isHovered ? "shadow-md" : ""}
        `}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={handleCardClick}
      >
        <Card
          className={`
            cursor-pointer transition-all duration-200 overflow-hidden
            ${
              isSelected
                ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
                : ""
            }
            ${isHovered ? "border-neutral-300 dark:border-neutral-600" : ""}
          `}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl" role="img" aria-label={card.title}>
                  {card.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                      {card.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCardCollapse(card.id);
                }}
                className="flex-shrink-0"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div
              className={`
              transition-all duration-300 ease-in-out overflow-hidden
              ${isCollapsed ? "opacity-0" : "opacity-100"}
            `}
              style={{
                maxHeight: isCollapsed
                  ? 0
                  : `${getCardHeight(card.id, isCollapsed)}px`,
              }}
            >
              <div
                ref={(el) => registerElement(card.id, el)}
                className="card-content-inner"
              >
                {card.content.type === "summary" || card.content.type === "keyPoints" ? (
                  renderCardContent(card)
                ) : card.content.type === "conversations" ? (
                  <div className="space-y-3">
                    {card.content.data.map((conversation: any, index: number) => (
                      <div key={conversation.id || index} className="border rounded-lg p-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {conversation.title || getConversationTitle(conversation, 25) || "未命名对话"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getConversationTypeLabel(conversation)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.created_at), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                        {conversation.messages && conversation.messages.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {conversation.messages
                              .filter((msg: any) => msg.role !== "system")
                              .slice(0, 3) // 只显示前3条消息
                              .map((message: any, msgIndex: number) => {
                                // 🎯 优化消息内容显示
                                const getDisplayContent = (msg: any) => {
                                  if (msg.role === "user") {
                                    const metadata = msg.metadata || {};
                                    
                                    // 如果是基于prompt的消息，优先显示prompt名称
                                    if (metadata.isPromptBased && metadata.promptName) {
                                      return `📝 ${metadata.promptName}`;
                                    }
                                    
                                    // 如果有原始用户输入，显示原始输入
                                    if (metadata.originalUserInput) {
                                      return metadata.originalUserInput.length > 60
                                        ? `${metadata.originalUserInput.substring(0, 60)}...`
                                        : metadata.originalUserInput;
                                    }
                                    
                                    // 默认显示消息内容，但限制长度
                                    return msg.content.length > 60
                                      ? `${msg.content.substring(0, 60)}...`
                                      : msg.content;
                                  } else {
                                    // AI消息正常显示，但限制长度
                                    return msg.content.length > 100
                                      ? `${msg.content.substring(0, 100)}...`
                                      : msg.content;
                                  }
                                };

                                return (
                                  <div
                                    key={msgIndex}
                                    className={`flex gap-2 ${
                                      message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                                  >
                                    <div
                                      className={`max-w-[80%] p-2 rounded text-xs ${
                                        message.role === "user"
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {getDisplayContent(message)}
                                    </div>
                                  </div>
                                );
                              })}
                            {conversation.messages.filter((msg: any) => msg.role !== "system").length > 3 && (
                              <div className="text-center text-xs text-muted-foreground">
                                还有 {conversation.messages.filter((msg: any) => msg.role !== "system").length - 3} 条消息...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : card.content.type === "historyConversation" ? (
                  <div className="space-y-4">
                    {card.content.data.messages && card.content.data.messages.length > 0 ? (
                      card.content.data.messages
                        .filter((msg: any) => msg.role !== "system")
                        .map((message: any, msgIndex: number) => {
                          // 🎯 优化消息内容显示
                          const getDisplayContent = (msg: any) => {
                            if (msg.role === "user") {
                              const metadata = msg.metadata || {};
                              
                              // 如果是基于prompt的消息，优先显示prompt名称
                              if (metadata.isPromptBased && metadata.promptName) {
                                return `📝 ${metadata.promptName}`;
                              }
                              
                              // 如果有原始用户输入，显示原始输入
                              if (metadata.originalUserInput) {
                                return metadata.originalUserInput.length > 80
                                  ? `${metadata.originalUserInput.substring(0, 80)}...`
                                  : metadata.originalUserInput;
                              }
                              
                              // 默认显示消息内容，但限制长度
                              return msg.content.length > 80
                                ? `${msg.content.substring(0, 80)}...`
                                : msg.content;
                            } else {
                              // AI消息正常显示，但限制长度
                              return msg.content.length > 200
                                ? `${msg.content.substring(0, 200)}...`
                                : msg.content;
                            }
                          };

                          return (
                            <div
                              key={msgIndex}
                              className={`flex gap-3 ${
                                message.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              {message.role !== "user" && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <Bot className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {getDisplayContent(message)}
                                </div>
                                {message.timestamp && (
                                  <div className="text-xs opacity-70 mt-1">
                                    {formatDistanceToNow(new Date(message.timestamp), {
                                      addSuffix: true,
                                      locale: zhCN,
                                    })}
                                  </div>
                                )}
                              </div>

                              {message.role === "user" && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">此对话暂无消息</p>
                      </div>
                    )}
                  </div>
                ) : card.content.type === "streaming" ? (
                  <div
                    className={`
                      px-6 py-4 rounded-lg transition-all duration-200
                      ${
                        selectedBlock === `${card.id}-main`
                          ? "linear-bg-1 opacity-90"
                          : "hover:linear-bg-1"
                      }
                    `}
                  >
                    {card.content.data.startsWith("LOADING_PLACEHOLDER_") ? (
                      // 简化的加载状态显示
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                      </div>
                    ) : (
                      // 正常内容显示
                      <div className="select-text prose prose-sm max-w-none dark:prose-invert">
                        <UniversalContentRenderer
                          content={card.content.data}
                          onExpandLine={handleJsonLineExpand}
                        />
                        {/* 流式响应时的打字机效果光标 */}
                        {isAnalyzing && (
                          <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-1 align-middle" />
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-neutral-400" />
          <p className="text-sm text-neutral-500">正在加载分析结果...</p>
        </div>
      </div>
    );
  }

  // 根据变体计算样式
  const containerHeight = height === "fixed" ? "h-80" : "h-full";
  const containerClasses =
    variant === "preview"
      ? `flex flex-col ${containerHeight} ${className} linear-bg-1`
      : `flex flex-col h-full ${className}`;

  return (
    <div className={containerClasses} data-exclude-selection>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* 可滚动的主内容区域 */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto custom-scrollbar ${variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""}`}
      >
        {/* 页面标题 - 根据配置条件渲染 */}
        {!hideHeader && (
          <div
            className={`px-6 py-3 ${variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""}`}
            data-exclude-selection
          >
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 卡片列表 */}
        <div className="px-8 pt-4 pb-6">
          <div
            className={`space-y-6 ${
              variant === "preview" ? "max-w-2xl mx-auto" : ""
            }`}
          >
            {cards.length > 0 ? (
              cards.map((card) => <CardComponent key={card.id} card={card} />)
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 text-neutral-400 mx-auto" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果，使用下方AI助手开始分析
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 固定底部AI助手 */}
      <div
        className={`flex-shrink-0 backdrop-blur-md border-t ${
          variant === "preview"
            ? "linear-bg-1 border-border"
            : "linear-bg-1 border-border dark:border-neutral-800"
        }`}
        data-exclude-selection
      >
        <div className="px-6 py-3">
          {/* 历史记录展开面板 */}
          {showHistory && (
            <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="bg-neutral-50/80 dark:bg-neutral-900/80 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    历史对话
                  </h4>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                  {loadingHistory ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto text-neutral-400" />
                    </div>
                  ) : historyRecords.length === 0 ? (
                    <div className="text-center py-4 text-sm text-neutral-500 dark:text-neutral-400">
                      暂无历史对话
                    </div>
                  ) : (
                    historyRecords.map((record, index) => {
                      // 提取用户意图
                      const getUserIntentSummary = () => {
                        if (!record.messages || record.messages.length === 0) return "无用户输入";
                        
                        const userMessages = record.messages.filter((msg: any) => msg.role === "user");
                        if (userMessages.length === 0) return "无用户输入";
                        
                        const firstUserMessage = userMessages[0];
                        const metadata = (firstUserMessage.metadata as any) || {};
                        
                        // 优先显示prompt名称
                        if (metadata.isPromptBased && metadata.promptName) {
                          return `📝 ${metadata.promptName}`;
                        }
                        
                        // 显示原始用户输入
                        if (metadata.originalUserInput) {
                          const originalInput = String(metadata.originalUserInput);
                          return originalInput.length > 40
                            ? `${originalInput.substring(0, 40)}...`
                            : originalInput;
                        }
                        
                        // 默认显示消息内容
                        const content = String(firstUserMessage.content || "");
                        return content.length > 40
                          ? `${content.substring(0, 40)}...`
                          : content;
                      };

                      return (
                        <div
                          key={record.id}
                          className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-200 cursor-pointer group border border-neutral-200/50 dark:border-neutral-700/50"
                          onClick={() => handleHistoryClick(record)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 flex items-center justify-center border border-blue-200/30 dark:border-blue-700/30">
                                <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                {record.title || "未命名对话"}
                              </div>
                              
                              <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                {getUserIntentSummary()}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                {record.summary && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1 mr-2">
                                    {record.summary}
                                  </p>
                                )}
                                <span className="text-xs text-neutral-400 flex-shrink-0">
                                  {formatDistanceToNow(new Date(record.created_at), {
                                    addSuffix: true,
                                    locale: zhCN,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI指令标签行 - 从真实API获取 */}
          <div className="flex items-center gap-2 mb-1 overflow-x-auto scrollbar-hide pb-1">
            {isLoadingPrompts ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                <span className="text-sm text-neutral-500">加载中...</span>
              </div>
            ) : (
              enabledPrompts.slice(0, 7).map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 whitespace-nowrap flex-shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{prompt.name}</span>
                </button>
              ))
            )}
          </div>

          {/* 现代化聊天输入框 */}
          <div className="relative bg-white dark:bg-zinc-800 shadow-md rounded-3xl focus-within:ring-1 focus-within:ring-foreground transition-all duration-300">
            <div className="flex items-center gap-3 pl-6 pr-3 py-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAnalysis();
                    }
                  }}
                  placeholder="询问关于内容的任何问题..."
                  className="border-0 bg-transparent px-0 py-2 h-auto text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none w-full"
                  disabled={isAnalyzing}
                  autoComplete="off"
                />
              </div>

              {/* 现代化发送按钮 */}
              <Button
                size="icon"
                className="rounded-full h-6 w-6 shadow-md text-foreground hover:text-foreground bg-neutral-100 hover:bg-neutral-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 cursor-pointer"
                onClick={handleAnalysis}
                disabled={!inputValue.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ModernAnalysisInterface };