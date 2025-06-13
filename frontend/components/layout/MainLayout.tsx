"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logout } from "@/components/actions/logout-action";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, isLoading, fetchUser } = useAuth();

  // 如果没有 pageTitle 或者是 fullscreen 模式，使用全屏布局
  const isFullscreen = fullscreen || !pageTitle;

  // 同步登录状态
  const handleSyncAuth = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // 检查是否有扩展token
      const checkExtensionToken = () => {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split("=");
          if (name === "accessToken_ext" && value) {
            return value;
          }
        }
        return null;
      };

      const extToken = checkExtensionToken();
      if (extToken && !user) {
        // 如果有扩展token但没有用户信息，尝试同步
        document.cookie = `accessToken=${extToken};path=/;max-age=${60 * 60 * 24 * 7}`;
        await fetchUser();
      } else {
        // 手动触发用户信息刷新
        await fetchUser();
      }
    } catch (error) {
      console.error("同步登录失败:", error);
    } finally {
      setIsSyncing(false);
    }
  };

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
      <div className="flex min-h-screen bg-background max-w-none w-screen">
        {/* 侧边栏 */}
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        <SidebarInset className="relative">
          {/* 右上角用户状态指示器 */}
          <div className="absolute top-4 right-4 z-10">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <UserAvatar user={user} size="sm" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="flex items-center gap-2 p-2">
                    <UserAvatar user={user} size="sm" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">
                        {user.full_name || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSyncAuth}
                    disabled={isSyncing}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    {isSyncing ? "同步中..." : "同步登录状态"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <UserAvatar user={null} size="sm" showFallback={true} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAuth}
                  disabled={isSyncing || isLoading}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw
                    className={`mr-1 h-3 w-3 ${isSyncing || isLoading ? "animate-spin" : ""}`}
                  />
                  {isSyncing || isLoading ? "同步中" : "同步登录"}
                </Button>
              </div>
            )}
          </div>

          {/* 主内容区域 */}
          <main className="flex-1">
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
