"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Sparkles,
  Brain,
} from "lucide-react";
import { ConversationPublic, ConversationMessage } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";

interface ConversationHistoryProps {
  conversations: ConversationPublic[];
  loading?: boolean;
  onRefresh?: () => void;
}

const ConversationTypeMap = {
  auto_analysis: {
    label: "自动分析",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    icon: Sparkles,
  },
  user_chat: {
    label: "用户对话",
    color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    icon: MessageSquare,
  },
  prompt_analysis: {
    label: "模板分析",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    icon: Brain,
  },
};

// 从对话消息中提取结构化内容
const extractStructuredContent = (messages: ConversationMessage[]) => {
  const aiMessages = messages.filter(msg => msg.role === "assistant");
  if (aiMessages.length === 0) return null;

  // 获取最后一条AI回复
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  
  // 检查是否为结构化JSON内容
  const content = lastAiMessage.content;
  if (!content) return null;

  // 简单检测是否包含结构化信息（JSONL格式）
  const isStructured = content.includes('{"type":') || content.includes('{"t":');
  
  return {
    isStructured,
    content: content.trim(),
    originalLength: content.length
  };
};

// 获取用户意图摘要
const getUserIntentSummary = (messages: ConversationMessage[]) => {
  const userMessages = messages.filter(msg => msg.role === "user");
  if (userMessages.length === 0) return "无用户输入";

  const firstUserMessage = userMessages[0];
  const metadata = firstUserMessage.metadata || {};
    
  // 优先显示prompt名称
    if (metadata.isPromptBased && metadata.promptName) {
      return `📝 ${metadata.promptName}`;
    }
    
  // 显示原始用户输入
    if (metadata.originalUserInput) {
    return metadata.originalUserInput.length > 60
      ? `${metadata.originalUserInput.substring(0, 60)}...`
        : metadata.originalUserInput;
    }
    
  // 默认显示消息内容
  const content = firstUserMessage.content;
  return content.length > 60
    ? `${content.substring(0, 60)}...`
    : content;
};

const ConversationCard = ({
  conversation,
}: { conversation: ConversationPublic }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const typeInfo = ConversationTypeMap[
    conversation.conversation_type as keyof typeof ConversationTypeMap
  ] || {
    label: conversation.conversation_type || "未知类型",
    color: "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
    icon: MessageSquare,
  };

  const IconComponent = typeInfo.icon;
  const userMessages = conversation.messages?.filter((msg) => msg.role !== "system") || [];
  const structuredContent = extractStructuredContent(userMessages);
  const userIntentSummary = getUserIntentSummary(userMessages);

  return (
    <Card className="mb-3 overflow-hidden hover:shadow-md transition-all duration-200">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-8 h-8 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                <div>
                    <CardTitle className="text-base leading-tight">
                      {conversation.title || "未命名对话"}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${typeInfo.color} text-xs`} variant="secondary">
                      {typeInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conversation.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                    </div>
                  </div>

                  {/* 用户意图摘要 */}
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">用户问题</div>
                    <div className="text-sm text-foreground leading-relaxed">
                      {userIntentSummary}
                    </div>
                  </div>

                  {/* 对话摘要 */}
                  {conversation.summary && (
                    <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {conversation.summary}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <Badge variant="outline" className="text-xs">
                  {userMessages.length} 条消息
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {structuredContent && structuredContent.isStructured ? (
              // 渲染结构化AI输出内容，类似内容摘要的简洁方式
              <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">AI 分析结果</span>
                  <Badge variant="outline" className="text-xs">
                    {conversation.ai_model_name}
                  </Badge>
                </div>
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <UniversalContentRenderer
                    content={structuredContent.content}
                    enableDelayedRendering={false}
                  />
                </div>
              </div>
            ) : structuredContent ? (
              // 普通文本内容的简洁展示
              <div className="bg-muted/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">对话内容</span>
                </div>
                
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {structuredContent.content.length > 500 
                    ? `${structuredContent.content.substring(0, 500)}...` 
                    : structuredContent.content
                  }
                </div>
                
                {structuredContent.originalLength > 500 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    显示了前500个字符，总共{structuredContent.originalLength}个字符
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">此对话暂无内容</p>
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
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
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
  onRefresh,
}: ConversationHistoryProps) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
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
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
            />
          ))}
        </div>
      )}
    </div>
  );
};

