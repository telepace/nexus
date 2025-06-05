"use client";

import React, { useState, useCallback, createContext, useContext } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { LLMAnalysisSidebar } from "@/components/ui/llm-analysis-sidebar";

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
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "240px", // 展开时的宽度
          "--sidebar-width-icon": "4rem", // 折叠时的宽度
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen bg-background max-w-none w-screen">
        {/* 左侧边栏 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        {/* 主内容区域和右侧sidebar的容器 - 强制占满剩余宽度 */}
        <div className="flex-1 flex w-full min-w-0 h-screen">
          {/* 主内容区域 - 占一半，独立滚动 */}
          <ReaderContext.Provider
            value={{ onContentChange: handleContentChange }}
          >
            <div className="flex-1 flex flex-col bg-background overflow-auto">
              {children}
            </div>
          </ReaderContext.Provider>

          {/* 右侧 LLM 分析边栏 - 占一半，固定高度不滚动，内部自己管理滚动 */}
          <div className="flex-1">
            <LLMAnalysisSidebar
              contentId={contentId}
              contentText={contentText}
            />
          </div>
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
