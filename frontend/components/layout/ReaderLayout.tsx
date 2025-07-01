"use client";

import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
} from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { ContentAnalysisSidebar } from "@/components/ai/ContentAnalysisSidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ContentItemPublic } from "@/app/content-library/types";
import {
  contentApi,
  ConversationListResponse,
  AIResult,
} from "@/lib/api/content";
import { useAuth } from "@/lib/client-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

// 创建上下文来传递内容更新函数和分析数据
const ReaderContext = createContext<{
  onContentChange?: () => void;
  onContentItemUpdate?: (item: ContentItemPublic) => void;
  contentItem?: ContentItemPublic | null;
  markLeftReady?: () => void;
}>({});

export const useReaderContext = () => useContext(ReaderContext);

export interface ReaderLayoutProps {
  children: React.ReactNode;
  contentId: string;
  contentText?: string;
}

export default function ReaderLayout({
  children,
  contentId,
}: ReaderLayoutProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);

  // 移动端右侧面板控制
  const [showRightPanel, setShowRightPanel] = useState(!isMobile);

  const [contentItem, setContentItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [conversations, setConversations] = useState<
    ConversationListResponse["conversations"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIResult | null>(null);

  const markLeftReady = useCallback(() => {}, []);

  // 响应移动端变化，自动调整右侧面板显示
  useEffect(() => {
    if (isMobile) {
      setShowRightPanel(false);
    } else {
      setShowRightPanel(true);
    }
  }, [isMobile]);

  // 获取完整的内容项数据和对话历史
  useEffect(() => {
    async function fetchContentData() {
      if (!contentId || !user?.token) return;

      try {
        setLoading(true);

        // 并行获取内容项和对话历史
        const [item, conversationsResponse] = await Promise.allSettled([
          contentApi.getContentItem(contentId),
          contentApi.getContentConversations(contentId, false),
        ]);

        // 处理内容项
        if (item.status === "fulfilled") {
          setContentItem(item.value);
          // 提取 ai_result 字段
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAnalysisResult((item.value as any).ai_result ?? null);
        } else {
          console.error("Failed to fetch content item:", item.reason);
        }

        // 处理对话历史
        if (conversationsResponse.status === "fulfilled") {
          setConversations(conversationsResponse.value.conversations);
        } else {
          console.error(
            "Failed to fetch conversations:",
            conversationsResponse.reason,
          );
        }
      } catch (error) {
        console.error("Failed to fetch content data:", error);
        // 可以选择在此处设置错误状态
      } finally {
        setLoading(false);
      }
    }

    fetchContentData();
  }, [contentId, user?.token]);

  // 提供给 children 的上下文方法，让 ReaderContent 可以更新内容文本
  const handleContentChange = useCallback(() => {
    // 目前没有使用文本更新功能
  }, []);

  // 更新内容项
  const handleContentItemUpdate = useCallback((item: ContentItemPublic) => {
    setContentItem(item);
  }, []);

  // 切换右侧面板显示
  const toggleRightPanel = useCallback(() => {
    setShowRightPanel((prev) => !prev);
  }, []);

  // 动态计算面板尺寸
  const getLeftPanelSize = () => {
    if (isMobile) return 100; // 移动端主面板占满
    return showRightPanel ? 55 : 100; // 桌面端根据右侧面板状态调整
  };

  const getRightPanelSize = () => {
    if (isMobile) return 0;
    return showRightPanel ? 45 : 0;
  };

  return (
    <SidebarProvider
      defaultOpen={false} // 默认折叠左侧边栏
      style={
        {
          "--sidebar-width": "240px", // 展开时的宽度
          "--sidebar-width-icon": "3.5rem", // 折叠时的宽度，更紧凑
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen bg-background max-w-none w-full">
        {/* 左侧边栏 - 默认折叠 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        {/* 主内容区域 - 使用响应式布局 */}
        <div className="flex-1 flex w-full min-w-0 h-screen">
          {isMobile ? (
            // 移动端：垂直布局或单面板
            <div className="flex flex-col h-full w-full">
              {/* 主阅读区域 */}
              <div
                className={`flex-1 flex flex-col bg-background overflow-auto ${showRightPanel ? "hidden" : ""}`}
              >
                <ReaderContext.Provider
                  value={{
                    onContentChange: handleContentChange,
                    onContentItemUpdate: handleContentItemUpdate,
                    contentItem,
                    markLeftReady,
                  }}
                >
                  {children}
                </ReaderContext.Provider>

                {/* 移动端切换按钮 */}
                <div className="fixed bottom-4 right-4 z-50">
                  <Button
                    onClick={toggleRightPanel}
                    size="sm"
                    className="rounded-full shadow-lg bg-primary hover:bg-primary/90"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* AI 分析区域 - 移动端全屏显示 */}
              {showRightPanel && (
                <div className="flex flex-col h-full bg-muted/30">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
                    <h2 className="font-medium">AI分析</h2>
                    <Button
                      onClick={toggleRightPanel}
                      size="sm"
                      variant="ghost"
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {contentItem ? (
                      <ContentAnalysisSidebar
                        content={contentItem}
                        analysisResult={analysisResult}
                        conversations={conversations}
                        isLoading={loading}
                      />
                    ) : (
                      <div className="flex flex-col h-full bg-background p-4">
                        <div className="text-center text-muted-foreground">
                          加载中...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 桌面端：水平可调整布局
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* 主阅读区域 */}
              <ResizablePanel
                defaultSize={getLeftPanelSize()}
                minSize={30}
                maxSize={80}
                className="flex flex-col"
              >
                <ReaderContext.Provider
                  value={{
                    onContentChange: handleContentChange,
                    onContentItemUpdate: handleContentItemUpdate,
                    contentItem,
                    markLeftReady,
                  }}
                >
                  <div className="flex-1 flex flex-col bg-background overflow-auto">
                    {children}
                  </div>
                </ReaderContext.Provider>
              </ResizablePanel>

              {/* 分割线 - 仅在显示右侧面板时显示 */}
              {showRightPanel && (
                <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />
              )}

              {/* AI 分析区域 */}
              {showRightPanel && (
                <ResizablePanel
                  defaultSize={getRightPanelSize()}
                  minSize={20}
                  maxSize={70}
                  className="flex flex-col bg-muted/30"
                >
                  {contentItem ? (
                    <ContentAnalysisSidebar
                      content={contentItem}
                      analysisResult={analysisResult}
                      conversations={conversations}
                      isLoading={loading}
                    />
                  ) : (
                    <div className="flex flex-col h-full bg-background">
                      {/* Header Skeleton */}
                      <div className="flex items-center justify-between px-4 border-b h-header">
                        <div className="w-20 h-6 bg-muted rounded animate-shimmer"></div>
                      </div>

                      {/* Tabs Skeleton */}
                      <div className="flex-shrink-0 px-4 py-3">
                        <div className="grid w-full grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
                          <div className="h-7 bg-background rounded animate-shimmer"></div>
                          <div className="h-7 bg-muted rounded animate-shimmer"></div>
                          <div className="h-7 bg-muted rounded animate-shimmer"></div>
                        </div>
                      </div>

                      {/* Content Body Skeleton */}
                      <div className="flex-1 min-h-0 overflow-auto px-4 space-y-4">
                        <div className="space-y-4">
                          <div className="w-full h-32 bg-muted rounded-lg animate-shimmer"></div>
                          <div className="w-full h-40 bg-muted rounded-lg animate-shimmer"></div>
                          <div className="w-full h-28 bg-muted rounded-lg animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </ResizablePanel>
              )}

              {/* 桌面端右侧面板切换按钮 */}
              {!showRightPanel && (
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    onClick={toggleRightPanel}
                    size="sm"
                    variant="outline"
                    className="shadow-sm"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </ResizablePanelGroup>
          )}
        </div>

        {/* 设置面板 */}
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* 添加内容模态窗口 */}
        <AddContentModal
          open={addContentOpen}
          onClose={() => setAddContentOpen(false)}
        />
      </div>
    </SidebarProvider>
  );
}
