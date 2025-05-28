"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavigation } from "@/components/layout/TopNavigation";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // 如果没有 pageTitle 或者是 fullscreen 模式，使用全屏布局
  const isFullscreen = fullscreen || !pageTitle;

  return (
    <div className="flex min-h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 顶部导航栏 */}
      <TopNavigation
        onSettingsClick={() => setSettingsOpen(true)}
        onAddContentClick={() => setAddContentOpen(true)}
      />

      {/* 主内容区域 */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-56"
        } ${isFullscreen ? "pt-16" : "pt-20"}`}
      >
        {isFullscreen ? (
          children
        ) : (
          <div className="container mx-auto p-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {pageTitle}
              </h1>
            </header>

            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              {children}
            </div>
          </div>
        )}
      </main>

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
  );
}
