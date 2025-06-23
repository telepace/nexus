"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  Bot, 
  User, 
  Clock,
  RefreshCw 
} from "lucide-react";
import { ConversationPublic } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ConversationHistoryProps {
  conversations: ConversationPublic[];
  loading?: boolean;
  onRefresh?: () => void;
}

const ConversationTypeMap = {
  auto_analysis: { label: "自动分析", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  user_chat: { label: "用户对话", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  prompt_analysis: { label: "模板分析", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

const MessageBubble = ({ message, index }: { message: any; index: number }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) return null; // 不显示系统消息

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        </div>
      )}
      
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      }`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content.length > 500 
            ? `${message.content.substring(0, 500)}...` 
            : message.content
          }
        </div>
        {message.timestamp && (
          <div className="text-xs opacity-70 mt-1">
            {formatDistanceToNow(new Date(message.timestamp), { 
              addSuffix: true, 
              locale: zhCN 
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <User className="h-4 w-4 text-green-600 dark:text-green-300" />
        </div>
      )}
    </div>
  );
};

const ConversationItem = ({ conversation }: { conversation: ConversationPublic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const typeInfo = ConversationTypeMap[conversation.conversation_type as keyof typeof ConversationTypeMap] || 
    { label: conversation.conversation_type, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };

  const userMessages = conversation.messages?.filter(msg => msg.role !== "system") || [];
  const hasMessages = userMessages.length > 0;

  return (
    <Card className="mb-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">
                    {conversation.title || "无标题对话"}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={typeInfo.color} variant="secondary">
                      {typeInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conversation.created_at), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {conversation.ai_model_name}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {userMessages.length} 条消息
                </Badge>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            {conversation.summary && (
              <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {conversation.summary}
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {hasMessages ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {userMessages.map((message, index) => (
                  <MessageBubble key={index} message={message} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">此对话暂无消息</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    ))}
  </div>
);

export const ConversationHistory = ({ 
  conversations, 
  loading, 
  onRefresh 
}: ConversationHistoryProps) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI 对话历史 ({conversations.length})
        </h3>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        )}
      </div>

      {conversations.length === 0 ? (
        <Card className="h-32 flex items-center justify-center">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无对话记录</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
}; 