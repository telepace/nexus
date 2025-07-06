"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConversationList } from "@/components/ai/ConversationList";
import { ConversationCard } from "@/components/ai/ConversationCard";
import { EnhancedLLMAnalysisSidebar } from "@/components/ui/enhanced-llm-analysis-sidebar";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import {
  CreateConversationRequest,
  ConversationDetail,
} from "@/lib/api/ai-conversations";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Plus, TestTube, Brain } from "lucide-react";

export default function TestAIConversationsPage() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetail | null>(null);
  const [newConversationData, setNewConversationData] =
    useState<CreateConversationRequest>({
      title: "",
      // 移除ai_model_name参数，由后端自动选择最适合的模型
      messages: [],
      summary: "",
    });

  // 模拟内容项ID
  const mockContentItemId = "test-content-123";

  const {
    conversations,
    conversationDetails,
    loading,
    error,
    refreshing,
    createConversation,
    refreshConversations,
    clearError,
  } = useAIConversations({
    contentItemId: mockContentItemId,
    autoLoad: true,
  });

  const handleCreateConversation = async () => {
    if (!newConversationData.title.trim()) {
      toast({
        title: "请输入标题",
        description: "对话标题不能为空",
        variant: "destructive",
      });
      return;
    }

    const conversationData: CreateConversationRequest = {
      ...newConversationData,
      content_item_id: mockContentItemId,
      messages: [
        { role: "user", content: "Hello, this is a test conversation." },
        {
          role: "assistant",
          content: "Hello! I'm ready to help you with analysis and questions.",
        },
      ],
    };

    const result = await createConversation(conversationData);
    if (result) {
      setNewConversationData({
        title: "",
        // 移除ai_model_name参数，由后端自动选择最适合的模型
        messages: [],
        summary: "",
      });
    }
  };

  const handleConversationSelect = (conversation: ConversationDetail) => {
    setSelectedConversation(conversation);
  };

  const mockContentText = `
# 测试文档

这是一个用于测试 AI 对话功能的示例文档。

## 主要内容

1. **人工智能的发展历程**
   - 从早期的专家系统到现代的深度学习
   - 机器学习算法的演进
   - 神经网络的突破性进展

2. **当前的技术挑战**
   - 数据质量和标注问题
   - 模型可解释性
   - 计算资源需求

3. **未来发展趋势**
   - 多模态AI的融合
   - 边缘计算的普及
   - 人机协作的新模式

## 结论

人工智能技术正在快速发展，为各行各业带来了前所未有的机遇和挑战。
  `.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-600" />
            AI 对话功能测试
          </h1>
          <p className="text-muted-foreground">
            测试新的 AI 对话管理功能，包括卡片渲染、列表展示和侧栏集成
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：功能测试区域 */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="conversations" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="conversations">对话列表</TabsTrigger>
                <TabsTrigger value="create">创建对话</TabsTrigger>
                <TabsTrigger value="detail">对话详情</TabsTrigger>
              </TabsList>

              {/* 对话列表测试 */}
              <TabsContent value="conversations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      对话列表测试
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          当前内容项ID:{" "}
                          <code className="bg-muted px-1 rounded">
                            {mockContentItemId}
                          </code>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshConversations}
                          disabled={refreshing}
                        >
                          刷新列表
                        </Button>
                      </div>

                      <Separator />

                      <ConversationList
                        contentItemId={mockContentItemId}
                        onConversationSelect={handleConversationSelect}
                        maxHeight="400px"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 创建对话测试 */}
              <TabsContent value="create">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      创建新对话
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">对话标题</label>
                        <Input
                          placeholder="输入对话标题..."
                          value={newConversationData.title}
                          onChange={(e) =>
                            setNewConversationData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">AI 模型</label>
                        <Input
                          value={newConversationData.ai_model_name}
                          onChange={(e) =>
                            setNewConversationData((prev) => ({
                              ...prev,
                              ai_model_name: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          摘要（可选）
                        </label>
                        <Textarea
                          placeholder="输入对话摘要..."
                          value={newConversationData.summary}
                          onChange={(e) =>
                            setNewConversationData((prev) => ({
                              ...prev,
                              summary: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <Button
                        onClick={handleCreateConversation}
                        className="w-full"
                      >
                        创建对话
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 对话详情测试 */}
              <TabsContent value="detail">
                <Card>
                  <CardHeader>
                    <CardTitle>对话详情展示</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedConversation ? (
                      <ConversationCard
                        conversation={selectedConversation}
                        type="chat_conversation"
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>请先从对话列表中选择一个对话</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 状态信息 */}
            <Card>
              <CardHeader>
                <CardTitle>状态信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">加载状态:</span>
                    <span
                      className={`ml-2 ${loading ? "text-blue-600" : "text-green-600"}`}
                    >
                      {loading ? "加载中..." : "已加载"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">对话数量:</span>
                    <span className="ml-2">{conversations.length}</span>
                  </div>
                  <div>
                    <span className="font-medium">缓存详情:</span>
                    <span className="ml-2">{conversationDetails.size}</span>
                  </div>
                  <div>
                    <span className="font-medium">错误状态:</span>
                    <span
                      className={`ml-2 ${error ? "text-red-600" : "text-green-600"}`}
                    >
                      {error || "正常"}
                    </span>
                  </div>
                </div>

                {error && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearError}
                    className="mt-2"
                  >
                    清除错误
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：增强版侧栏测试 */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  增强版侧栏
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ height: "600px" }}>
                  <EnhancedLLMAnalysisSidebar
                    contentId={mockContentItemId}
                    contentText={mockContentText}
                    className="border-0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
