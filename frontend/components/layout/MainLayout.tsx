"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";

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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        {/* 侧边栏 */}
        <AppSidebar 
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        <SidebarInset>
          {/* 主内容区域 */}
          <main className="flex-1">
            {isFullscreen ? (
              children
            ) : (
              <div className="container mx-auto p-4">
                <div className="p-4">
                  {children}
                </div>
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
    </SidebarProvider>
  );
}
