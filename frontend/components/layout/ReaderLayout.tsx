"use client";

import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
} from "react";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { ContentAnalysisSidebar } from "@/components/ai/ContentAnalysisSidebar";
// 引入 ReferenceManagerProvider 以提供引用上下文
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ContentItemPublic } from "@/app/(withSidebar)/content-library/types";
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

  // 简化右侧面板控制 - 桌面端默认显示，移动端默认隐藏
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

  // 响应移动端变化
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

  return (
    <ReferenceManagerProvider contentId={contentId}>
      <div className="flex min-h-screen bg-background max-w-none w-full">
        {/* 主内容区域 - 恢复旧版本的简洁结构 */}
        <div className="flex-1 flex w-full min-w-0 h-screen">
          {isMobile ? (
            // 移动端：简化的单面板布局
            <div className="flex flex-col h-full w-full">
              {!showRightPanel ? (
                // 显示主阅读区域
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
              ) : (
                // 显示AI分析区域
                <div className="flex flex-col h-full bg-muted/30 insight-pane ai-analysis-panel" data-exclude-selection>
                  <div className="flex items-center justify-between px-6 border-b border-muted/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm h-header" data-exclude-selection>
                    <h2 className="font-semibold text-base">AI分析</h2>
                    <Button
                      onClick={toggleRightPanel}
                      size="sm"
                      variant="ghost"
                      className="hover:bg-muted/60 dark:hover:bg-muted/40 transition-all duration-200 ease-out"
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto" data-exclude-selection>
                    {contentItem ? (
                      <ContentAnalysisSidebar
                        content={contentItem}
                        analysisResult={analysisResult}
                        conversations={conversations}
                        isLoading={loading}
                        hideHeader={true}
                      />
                    ) : (
                      <div className="flex flex-col h-full bg-background p-6" data-exclude-selection>
                        <div className="text-center text-muted-foreground">
                          加载中...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 移动端切换按钮 */}
              <div className="fixed bottom-6 right-6 z-50">
                <Button
                  onClick={toggleRightPanel}
                  size="sm"
                  className="rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 ease-out hover:scale-105 w-12 h-12 p-0"
                >
                  {showRightPanel ? (
                    <PanelRightClose className="h-5 w-5" />
                  ) : (
                    <PanelRightOpen className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // 桌面端：恢复旧版本的简洁50%/50%布局
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* 主阅读区域 - 默认占50%，可调整 */}
              <ResizablePanel
                defaultSize={50}
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

              {/* AI 分析区域 - 默认占50%，可调整 */}
              {showRightPanel && (
                <ResizablePanel
                  defaultSize={50}
                  minSize={20}
                  maxSize={70}
                  className="flex flex-col bg-muted/30 insight-pane ai-analysis-panel"
                  data-exclude-selection
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
                      {/* Header Skeleton - 使用h-header统一高度 */}
                      <div className="flex items-center justify-between px-6 border-b border-muted/40 bg-muted/10 backdrop-blur supports-[backdrop-filter]:bg-muted/40 shadow-sm h-header">
                        <div className="w-20 h-5 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
                      </div>

                      {/* Tabs Skeleton - 改善间距和对比度 */}
                      <div className="flex-shrink-0 px-6 py-4">
                        <div className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/30 dark:bg-muted/20 rounded-lg">
                          <div className="h-7 bg-background/80 rounded animate-pulse"></div>
                          <div className="h-7 bg-muted/40 dark:bg-muted/30 rounded animate-pulse"></div>
                          <div className="h-7 bg-muted/40 dark:bg-muted/30 rounded animate-pulse"></div>
                        </div>
                      </div>

                      {/* Content Body Skeleton - 简化骨架屏 */}
                      <div className="flex-1 min-h-0 overflow-auto px-6 space-y-6">
                        <div className="space-y-4">
                          <div className="w-full h-24 bg-muted/30 dark:bg-muted/20 rounded-lg animate-pulse"></div>
                          <div className="w-full h-32 bg-muted/30 dark:bg-muted/20 rounded-lg animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </ResizablePanel>
              )}

              {/* 桌面端右侧面板切换按钮 */}
              {!showRightPanel && (
                <div className="absolute top-6 right-6 z-10">
                  <Button
                    onClick={toggleRightPanel}
                    size="sm"
                    variant="outline"
                    className="shadow-sm bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 hover:bg-muted/60 transition-all duration-200 ease-out border-muted/40"
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
    </ReferenceManagerProvider>
  );
}
