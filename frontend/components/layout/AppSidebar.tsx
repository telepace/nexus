"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronUp, RefreshCw, Star, Upload, BarChart3, Heart, MessageSquare } from "lucide-react";
import {
  IconInnerShadowTop,
  IconUser,
  IconArchive,
} from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/lib/auth";
import { logout } from "@/components/actions/logout-action";
import { cn } from "@/lib/utils";

// 主要导航数据
const data = {
  navMain: [
    {
      title: "Content Library",
      url: "/content-library",
      icon: IconArchive,
    },
    {
      title: "Dashboard", 
      url: "/dashboard",
      icon: BarChart3,
    },
    {
      title: "Favorites",
      url: "/favorites", 
      icon: Heart,
    },
    {
      title: "Prompts",
      url: "/prompts",
      icon: MessageSquare,
    },
  ],
};

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}

export function AppSidebar({
  onSettingsClick,
  onAddContentClick,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, isLoading, fetchUser } = useAuth();
  const [isSyncing, setIsSyncing] = React.useState(false);

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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-0">
        <div className="flex h-header shrink-0 items-center justify-between gap-2 border-b px-4 group-data-[collapsible=icon]:justify-center">
          {/* 左侧：Logo和品牌名称 - 在折叠状态下隐藏 */}
          <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            <IconInnerShadowTop className="!size-5" />
            <span className="text-base font-semibold">Telepace</span>
          </div>
          {/* 右侧：Sidebar Trigger - 在折叠状态下居中 */}
          <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-accent-foreground/20" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        {/* Upload Content 区域 */}
        <div className="mb-8 group-data-[collapsible=icon]:mb-4">
          <Button
            onClick={onAddContentClick}
            className={cn(
              "w-full h-auto p-6 border-2 border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/50 transition-all duration-200 group-data-[collapsible=icon]:p-3 group-data-[collapsible=icon]:h-12",
              "flex flex-col items-center gap-3 group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:gap-2"
            )}
            variant="ghost"
          >
            <div className="p-3 rounded-full bg-primary/10 group-data-[collapsible=icon]:p-2">
              <Upload className="h-6 w-6 text-primary group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
            </div>
            <div className="text-center group-data-[collapsible=icon]:text-left group-data-[collapsible=icon]:hidden">
              <div className="font-semibold text-lg mb-1">Upload Content</div>
              <div className="text-sm text-muted-foreground">Add new materials</div>
            </div>
          </Button>
        </div>

        {/* 主要导航 */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "h-12 px-4 rounded-lg transition-all duration-200",
                      pathname === item.url 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-14 px-4 rounded-lg">
                    <div className="flex items-center gap-3 w-full">
                      <UserAvatar user={user} size="md" />
                      <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">
                          {user.full_name || "User"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email || "user@example.com"}
                        </span>
                      </div>
                      <ChevronUp className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={onSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSyncAuth}
                    disabled={isSyncing}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    <span>{isSyncing ? "同步中..." : "同步登录状态"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <IconUser className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size="md" showFallback={true} />
                  <div className="flex-1 text-sm group-data-[collapsible=icon]:hidden">
                    <div className="font-medium text-muted-foreground">
                      未登录
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAuth}
                  disabled={isSyncing || isLoading}
                  className="w-full group-data-[collapsible=icon]:hidden"
                >
                  <RefreshCw
                    className={`mr-2 h-3 w-3 ${isSyncing || isLoading ? "animate-spin" : ""}`}
                  />
                  {isSyncing || isLoading ? "同步中..." : "同步登录状态"}
                </Button>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
