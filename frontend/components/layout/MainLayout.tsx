"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";

import { Toaster } from "sonner";

export interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  fullscreen?: boolean;
}

export default function MainLayout({
  children,
  pageTitle,
  fullscreen = false,
}: MainLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);

  // 如果没有 pageTitle 或者是 fullscreen 模式，使用全屏布局
  const isFullscreen = fullscreen || !pageTitle;

  // 根据布局模式动态设置包装器和主区域的样式
  const wrapperClasses = [
    "flex max-w-none w-screen page-top-highlight",
    isFullscreen ? "h-screen overflow-hidden" : "min-h-screen",
  ].join(" ");

  const insetClasses = isFullscreen
    ? "h-screen overflow-hidden"
    : "min-h-screen";
  const mainClasses = [
    "flex-1",
    isFullscreen ? "h-full overflow-hidden" : "overflow-auto",
  ].join(" ");

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "4rem", // 64px，相当于原来的宽度 + pr-4 (16px)
        } as React.CSSProperties
      }
    >
      <div className={wrapperClasses}>
        {/* 侧边栏 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        <SidebarInset className={insetClasses}>
          {/* 主内容区域 */}
          <main className={mainClasses}>
            {isFullscreen ? (
              children
            ) : (
              <div className="container mx-auto p-4">
                <div className="p-4">{children}</div>
              </div>
            )}
          </main>
        </SidebarInset>

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

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
