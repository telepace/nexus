"use client";

import React, { useState, useCallback, createContext, useContext, useEffect } from "react";
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
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

// 创建上下文来传递内容更新函数和分析数据
const ReaderContext = createContext<{
  onContentChange?: (text: string) => void;
  onAnalysisUpdate?: (analysisResult: AIResult | null) => void;
  onConversationsUpdate?: (
    conversations: ConversationListResponse["conversations"],
  ) => void;
  analysisResult?: AIResult | null;
  conversations?: ConversationListResponse["conversations"];
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
  contentText: initialContentText = "",
}: ReaderLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [contentText, setContentText] = useState(initialContentText);
  const [analysisResult, setAnalysisResult] = useState<AIResult | null>(null);
  const [conversations, setConversations] = useState<
    ConversationListResponse["conversations"]
  >([]);
  const [leftReady, setLeftReady] = useState(false);
  const [rightReady, setRightReady] = useState(false);

  const overlayVisible = !(leftReady && rightReady);

  const markLeftReady = useCallback(() => setLeftReady(true), []);
  const markRightReady = useCallback(() => setRightReady(true), []);

  // 提供给 children 的上下文方法，让 ReaderContent 可以更新内容文本
  const handleContentChange = useCallback((text: string) => {
    setContentText(text);
  }, []);

  // 更新分析结果
  const handleAnalysisUpdate = useCallback(
    (newAnalysisResult: AIResult | null) => {
      setAnalysisResult(newAnalysisResult);
    },
    [],
  );

  // 更新对话历史
  const handleConversationsUpdate = useCallback(
    (newConversations: ConversationListResponse["conversations"]) => {
      setConversations(newConversations);
    },
    [],
  );

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
            {/* 主阅读区域 - 默认占60%，可调整 */}
            <ResizablePanel
              defaultSize={60}
              minSize={40}
              maxSize={80}
              className="flex flex-col"
            >
              <ReaderContext.Provider
                value={{
                  onContentChange: handleContentChange, markLeftReady,
                  onAnalysisUpdate: handleAnalysisUpdate,
                  onConversationsUpdate: handleConversationsUpdate,
                  analysisResult,
                  conversations,
                }}
              >
                <div className="flex-1 flex flex-col bg-background overflow-auto">
                  {children}
                </div>
              </ReaderContext.Provider>
            </ResizablePanel>

            {/* 可拖拽的分割线 */}
            <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* AI 分析区域 - 默认占40%，可调整 */}
            <ResizablePanel
              defaultSize={40}
              minSize={20}
              maxSize={70}
              className="flex flex-col bg-muted/30"
            >
              <ContentAnalysisSidebar
                contentId={contentId}
                contentText={contentText}
                analysisResult={analysisResult}
                conversations={conversations}
                onLoaded={markRightReady}
                className="border-l-0" // 移除左边框，因为已有分割线
              />
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

        {overlayVisible && <LoadingOverlay />}
      </div>
    </SidebarProvider>
  );
}
