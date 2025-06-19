import React, { useEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationCard } from "./ConversationCard";
import { useToast } from "@/hooks/use-toast";
import AIConversationsAPI, {
  ConversationPublic,
  ConversationDetail,
} from "@/lib/api/ai-conversations";
import { RefreshCw, MessageCircle, AlertCircle } from "lucide-react";

interface ConversationListProps {
  contentItemId?: string;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  onConversationSelect?: (conversation: ConversationDetail) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  contentItemId,
  className = "",
  maxHeight = "600px",
  showHeader = true,
  onConversationSelect,
}) => {
  const [conversations, setConversations] = useState<ConversationPublic[]>([]);
  const [conversationDetails, setConversationDetails] = useState<
    Map<string, ConversationDetail>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // 加载对话列表
  const loadConversations = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        if (showRefreshIndicator) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const data = contentItemId
          ? await AIConversationsAPI.getByContentItem(contentItemId)
          : await AIConversationsAPI.list();

        setConversations(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "加载对话失败";
        setError(errorMessage);
        toast({
          title: "加载失败",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contentItemId, toast],
  );

  // 初始加载
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 展开对话详情
  const handleExpand = async (conversationId: string) => {
    if (conversationDetails.has(conversationId)) {
      // 如果已经加载过详情，直接切换展开状态
      const newExpandedIds = new Set(expandedIds);
      if (expandedIds.has(conversationId)) {
        newExpandedIds.delete(conversationId);
      } else {
        newExpandedIds.add(conversationId);
      }
      setExpandedIds(newExpandedIds);
      return;
    }

    // 加载对话详情
    try {
      const detail = await AIConversationsAPI.getDetail(conversationId);
      setConversationDetails((prev) =>
        new Map(prev).set(conversationId, detail),
      );
      setExpandedIds((prev) => new Set(prev).add(conversationId));

      if (onConversationSelect) {
        onConversationSelect(detail);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "加载对话详情失败";
      toast({
        title: "加载失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "内容已复制到剪贴板",
    });
  };

  // 刷新列表
  const handleRefresh = () => {
    loadConversations(true);
  };

  // 根据对话内容判断类型
  const getConversationType = (
    conversation: ConversationPublic,
  ): "processing_pipeline" | "summarizer" | "chat_conversation" | "default" => {
    const title = conversation.title?.toLowerCase() || "";
    const summary = conversation.summary?.toLowerCase() || "";

    if (
      title.includes("处理管道") ||
      title.includes("pipeline") ||
      summary.includes("处理管道")
    ) {
      return "processing_pipeline";
    }
    if (
      title.includes("摘要") ||
      title.includes("总结") ||
      title.includes("summarizer") ||
      summary.includes("摘要")
    ) {
      return "summarizer";
    }
    if (
      title.includes("对话") ||
      title.includes("chat") ||
      summary.includes("对话")
    ) {
      return "chat_conversation";
    }
    return "default";
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error && conversations.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  // 渲染空状态
  if (conversations.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {contentItemId ? "此内容暂无 AI 对话记录" : "暂无对话记录"}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 头部 */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI 对话历史</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-6 w-6 p-0"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* 对话列表 */}
      <ScrollArea style={{ maxHeight }} className="pr-2">
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const conversationType = getConversationType(conversation);
            const detail = conversationDetails.get(conversation.id);

            // 如果有详情数据，使用详情数据渲染，否则用基础数据
            const conversationToRender = detail || {
              ...conversation,
              messages: [],
              meta_info: null,
            };

            return (
              <ConversationCard
                key={conversation.id}
                conversation={conversationToRender}
                type={conversationType}
                onExpand={handleExpand}
                onCopy={handleCopy}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
