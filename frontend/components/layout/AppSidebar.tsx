"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  ChevronUp,
  RefreshCw,
  Upload,
  Heart,
  BotMessageSquare,
  Inbox,
  GalleryHorizontalEnd,
  Plus,
} from "lucide-react";
import { IconUser } from "@tabler/icons-react";

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
import Image from "next/image";

// 主要导航数据
const data = {
  navMain: [
    {
      title: "Library",
      url: "/content-library",
      icon: Inbox,
    },
    {
      title: "Home",
      url: "/home",
      icon: GalleryHorizontalEnd,
    },
    {
      title: "Favorites",
      url: "/favorites",
      icon: Heart,
    },
    {
      title: "Prompts",
      url: "/prompts",
      icon: BotMessageSquare,
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
  const [isUploadHovered, setIsUploadHovered] = React.useState(false);

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

  // 处理导航项点击，确保不会意外触发侧边栏状态变化
  const handleNavItemClick = React.useCallback((event: React.MouseEvent) => {
    // 阻止事件冒泡，防止意外触发侧边栏切换
    event.stopPropagation();
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[state=collapsed]:border-none"
      {...props}
    >
      <SidebarHeader className="p-0">
        <div className="flex h-header shrink-0 items-center justify-center gap-2 border-b border-neutral-100/50 px-4 group-data-[collapsible=icon]:px-2 backdrop-blur-sm">
          {/* 展开状态：Logo + 品牌名称 + 独立展开按钮 */}
          <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:hidden">
            <Link
              href="/home"
              className="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity"
              onClick={handleNavItemClick}
            >
              <div className="p-1.5 rounded-lg">
                <Image
                  src="/img/favicon.png"
                  alt="Logo"
                  width={28}
                  height={28}
                />
              </div>
              <span className="text-base font-semibold hover:text-primary transition-all duration-300 tracking-tight">
                Telepace
              </span>
            </Link>
            <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-gradient-to-br hover:from-neutral-50/60 hover:to-neutral-100/40 hover:text-sidebar-accent-foreground transition-all duration-300 border border-transparent hover:border-neutral-200/40" />
          </div>

          {/* 折叠状态：优化设计，更精致的视觉效果 */}
          <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-white/80 to-neutral-50/60 shadow-lg hover:shadow-xl border border-neutral-200/30 hover:border-primary/30 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <Image
              src="/img/favicon.png"
              alt="Logo"
              width={28}
              height={28}
              className="drop-shadow-sm"
            />
          </SidebarTrigger>
        </div>

        {/* Upload Content 区域 - 折叠状态下更精致 */}
        <div className="mb-3 group-data-[collapsible=icon]:mb-2">
          <div className="px-4 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-3">
            <div
              className={cn(
                "relative overflow-hidden rounded-xl transition-all duration-500 ease-out group cursor-pointer",
                "bg-gradient-to-br from-primary/5 via-primary/3 to-primary/8",
                "border border-primary/10 hover:border-primary/20",
                "shadow-sm hover:shadow-lg hover:shadow-primary/5",
                "hover:scale-[1.02] active:scale-[0.98]",
                // 折叠状态样式 - 更圆润的正方形设计
                "group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:shadow-md group-data-[collapsible=icon]:bg-gradient-to-br group-data-[collapsible=icon]:from-primary/8 group-data-[collapsible=icon]:to-primary/12 group-data-[collapsible=icon]:hover:shadow-lg group-data-[collapsible=icon]:hover:from-primary/12 group-data-[collapsible=icon]:hover:to-primary/15",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAddContentClick();
              }}
              onMouseEnter={() => setIsUploadHovered(true)}
              onMouseLeave={() => setIsUploadHovered(false)}
            >
              {/* 背景动效 */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/8 to-primary/0 opacity-0 transition-opacity duration-700 rounded-inherit",
                  isUploadHovered && "opacity-100",
                )}
              />

              {/* 内容 */}
              <div className="relative flex items-center gap-3 p-4 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
                <div
                  className={cn(
                    "flex items-center justify-center transition-all duration-300",
                    "text-primary/70 group-hover:text-primary group-hover:scale-110",
                    "group-data-[collapsible=icon]:drop-shadow-sm",
                  )}
                >
                  <Upload className="w-4 h-4 group-data-[collapsible=icon]:w-4 group-data-[collapsible=icon]:h-4 drop-shadow-sm" />
                </div>
                <div className="flex-1 group-data-[collapsible=icon]:hidden">
                  <div className="text-sm font-medium text-neutral-700 mb-1 group-hover:text-neutral-900 transition-colors">
                    Upload
                  </div>
                  <div className="text-xs text-neutral-500 group-hover:text-neutral-600 transition-colors">
                    Drop files here
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0">

        {/* 主导航菜单 - 折叠状态下优化间距和视觉效果 */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent className="pr-3">
            <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-3">
              {data.navMain.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "group w-full flex items-center gap-3 px-4 py-2.5",
                        "rounded-md transition-all duration-300 ease-out mx-2",
                        "relative overflow-hidden",
                        // 移除默认的指示器样式
                        "before:hidden",
                        // 折叠状态调整 - 更精致的设计和完全居中
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:justify-center",
                        // 选中状态样式 - 使用背景色变化
                        isActive
                          ? [
                              "bg-neutral-200 text-neutral-900",
                              // 折叠状态选中样式
                              "group-data-[collapsible=icon]:bg-neutral-200",
                            ]
                          : [
                              "text-neutral-900 hover:bg-neutral-100",
                              // 折叠状态hover样式
                              "group-data-[collapsible=icon]:hover:bg-neutral-100",
                            ],
                      )}
                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center"
                        onClick={handleNavItemClick}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center shrink-0 transition-all duration-300",
                            "text-neutral-900",
                          )}
                        >
                          <item.icon className="w-4 h-4 group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:h-5" />
                        </div>
                        <span className="text-sm font-medium tracking-tight group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 底部优雅分割 - 折叠状态下隐藏 */}
        <div className="pt-6 border-t border-neutral-100/50 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-center">
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-neutral-200 to-transparent rounded-full" />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "w-full p-3 hover:bg-neutral-50/60 transition-all duration-300 rounded-xl mx-2",
                      // 折叠状态下的样式优化 - 更精致的设计
                      "group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-3 group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:justify-center",
                      "group-data-[collapsible=icon]:hover:scale-105 group-data-[collapsible=icon]:shadow-sm group-data-[collapsible=icon]:hover:shadow-md",
                    )}
                  >
                    <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                      <UserAvatar
                        user={user}
                        size="md"
                        showFallback={true}
                        className="group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 ring-2 ring-white/50 shadow-sm"
                      />
                      <div className="flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                        <div className="font-medium text-neutral-700 truncate">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {user.email}
                        </div>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4 text-neutral-400 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-neutral-200/60 bg-white/80 backdrop-blur-md shadow-xl shadow-neutral-100/40"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettingsClick();
                    }}
                    className="cursor-pointer rounded-lg transition-all duration-200 hover:bg-neutral-50/80"
                  >
                    <Settings className="mr-2 h-4 w-4 text-neutral-500" />
                    <span className="text-neutral-700">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncAuth();
                    }}
                    disabled={isSyncing}
                    className="cursor-pointer rounded-lg transition-all duration-200 hover:bg-neutral-50/80"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 text-neutral-500 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    <span className="text-neutral-700">
                      {isSyncing ? "同步中..." : "同步登录状态"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-neutral-100/60" />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    className="cursor-pointer text-rose-600 focus:text-rose-600 rounded-lg transition-all duration-200 hover:bg-rose-50/80"
                  >
                    <IconUser className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div
                className={cn(
                  "p-3 space-y-3 rounded-xl bg-gradient-to-br from-neutral-50/30 to-neutral-100/20 border border-neutral-100/60 mx-2",
                  // 折叠状态下只显示头像
                  "group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:space-y-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                )}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <UserAvatar
                    user={user}
                    size="md"
                    showFallback={true}
                    className="group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6"
                  />
                  <div className="flex-1 text-sm group-data-[collapsible=icon]:hidden">
                    <div className="font-medium text-neutral-500">未登录</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncAuth();
                  }}
                  disabled={isSyncing || isLoading}
                  className="w-full group-data-[collapsible=icon]:hidden border-neutral-200/60 bg-white/60 hover:bg-white hover:border-neutral-300/60 transition-all duration-300"
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

      {/* 添加侧边栏边缘，提供更好的交互区域 */}
      <SidebarRail />
    </Sidebar>
  );
}
