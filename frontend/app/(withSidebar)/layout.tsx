"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const isMobile = useIsMobile();

  // 计算默认打开状态：桌面端默认展开，移动端默认折叠
  // 实际状态会在 SidebarProvider 内部从 cookie 读取
  const defaultOpen = !isMobile;

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "3.5rem", // 56px，更紧凑的收缩宽度
        } as React.CSSProperties
      }
    >
      <div
        className="flex max-w-none w-full page-top-highlight min-h-screen"
        suppressHydrationWarning
      >
        {/* 侧边栏 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        <SidebarInset className="min-h-screen">
          {/* 主内容区域 */}
          <main className="flex-1 overflow-auto">{children}</main>
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