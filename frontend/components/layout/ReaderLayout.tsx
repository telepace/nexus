"use client";

import React, { useState, useCallback, createContext, useContext } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { EnhancedLLMAnalysisSidebar } from "@/components/ui/enhanced-llm-analysis-sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// 创建上下文来传递内容更新函数
const ReaderContext = createContext<{
  onContentChange?: (text: string) => void;
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

  // 提供给 children 的上下文方法，让 ReaderContent 可以更新内容文本
  const handleContentChange = useCallback((text: string) => {
    setContentText(text);
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
                value={{ onContentChange: handleContentChange }}
              >
                <div className="flex-1 flex flex-col bg-background overflow-auto">
                  {children}
                </div>
              </ReaderContext.Provider>
            </ResizablePanel>

            {/* 可拖拽的分割线 */}
            <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* AI 辅助区域 - 默认占50%，可调整 */}
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              maxSize={70}
              className="flex flex-col bg-muted/30"
            >
              <EnhancedLLMAnalysisSidebar
                contentId={contentId}
                contentText={contentText}
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
      </div>
    </SidebarProvider>
  );
}
