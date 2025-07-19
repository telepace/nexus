import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  MessageCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Bot,
  User,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ConversationDetail,
  ConversationMessage,
} from "@/lib/api/ai-conversations";

interface ConversationCardProps {
  conversation: ConversationDetail;
  type?: "processing_pipeline" | "summarizer" | "chat_conversation" | "default";
  className?: string;
  onExpand?: (conversationId: string) => void;
  onCopy?: (content: string) => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  type = "default",
  className = "",
  onExpand,
  onCopy,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand(conversation.id);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    if (onCopy) {
      onCopy(content);
    } else {
      toast({
        title: "已复制",
        description: "内容已复制到剪贴板",
      });
    }
  };

  const getCardIcon = () => {
    switch (type) {
      case "processing_pipeline":
        return <Settings className="h-4 w-4" />;
      case "summarizer":
        return <Sparkles className="h-4 w-4" />;
      case "chat_conversation":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getCardTitle = () => {
    if (conversation.title) {
      return conversation.title;
    }

    switch (type) {
      case "processing_pipeline":
        return "处理管道任务";
      case "summarizer":
        return "内容摘要";
      case "chat_conversation":
        return "AI 对话";
      default:
        return "AI 分析";
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "processing_pipeline":
        return "处理管道";
      case "summarizer":
        return "摘要生成";
      case "chat_conversation":
        return "智能对话";
      default:
        return "AI 分析";
    }
  };

  const getLastMessage = (): ConversationMessage | null => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return null;
    }
    return conversation.messages[conversation.messages.length - 1];
  };

  const lastMessage = getLastMessage();
  const messageCount = conversation.messages?.length || 0;
  const createdAt = new Date(conversation.created_at);

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${className}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getCardIcon()}
            <CardTitle className="text-sm font-medium">
              {getCardTitle()}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel()}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(createdAt, {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
          {messageCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{messageCount} 条消息</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 摘要或最后一条消息预览 */}
        {(conversation.summary || lastMessage) && (
          <div className="mb-3">
            <div className="text-sm text-muted-foreground line-clamp-3">
              {conversation.summary || lastMessage?.content || "暂无内容"}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="h-8 px-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  展开
                </>
              )}
            </Button>

            {lastMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(lastMessage.content)}
                className="h-8 px-2"
              >
                <Copy className="h-3 w-3 mr-1" />
                复制
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {conversation.ai_model_name}
          </div>
        </div>

        {/* 展开的对话内容 */}
        {isExpanded && messageCount > 0 && (
          <>
            <Separator className="my-3" />
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {conversation.messages.map((message, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {message.role === "user" ? (
                        <User className="h-4 w-4 text-muted-foreground" />
                      ) : message.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1 capitalize">
                        {message.role === "user"
                          ? "用户"
                          : message.role === "assistant"
                            ? "AI"
                            : "系统"}
                      </div>
                      <div className="text-sm">
                        <MarkdownRenderer content={message.content} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationCard;
