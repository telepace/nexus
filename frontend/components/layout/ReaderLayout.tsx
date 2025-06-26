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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);

  const [contentItem, setContentItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [conversations, setConversations] = useState<
    ConversationListResponse["conversations"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIResult | null>(null);

  const markLeftReady = useCallback(() => {}, []);

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

  return (
    <SidebarProvider
      defaultOpen={false} // 默认折叠左侧边栏
      style={
        {
          "--sidebar-width": "240px", // 展开时的宽度
          "--sidebar-width-icon": "4rem", // 折叠时的宽度
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen bg-background max-w-none w-screen">
        {/* 左侧边栏 - 默认折叠 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        {/* 主内容区域 - 使用可调整大小的面板 */}
        <div className="flex-1 flex w-full min-w-0 h-screen">
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

            {/* 可拖拽的分割线 */}
            <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* AI 分析区域 - 默认占50%，可调整 */}
            <ResizablePanel
              defaultSize={50}
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
                    <div className="w-20 h-6 bg-muted rounded animate-pulse"></div>
                  </div>

                  {/* Tabs Skeleton */}
                  <div className="flex-shrink-0 px-4 py-3">
                    <div className="grid w-full grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
                      <div className="h-7 bg-background rounded animate-pulse"></div>
                      <div className="h-7 bg-muted rounded animate-pulse"></div>
                      <div className="h-7 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>

                  {/* Content Body Skeleton */}
                  <div className="flex-1 min-h-0 overflow-auto px-4 space-y-4">
                    <div className="space-y-4">
                      <div className="w-full h-32 bg-muted rounded-lg animate-pulse"></div>
                      <div className="w-full h-40 bg-muted rounded-lg animate-pulse"></div>
                      <div className="w-full h-28 bg-muted rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
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
