"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";

export interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  currentPath?: string;
}

export default function MainLayout({
  children,
  pageTitle = "Dashboard",
  currentPath = "/dashboard",
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
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
        className={`flex-1 pt-20 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-56"
        }`}
      >
        <div className="container mx-auto p-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
          </header>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {children}
          </div>
        </div>
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
