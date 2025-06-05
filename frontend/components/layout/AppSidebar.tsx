"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronUp } from "lucide-react";
import {
  IconCirclePlusFilled,
  IconHome,
  IconDashboard,
  IconTags,
  IconMessageChatbot,
  IconInnerShadowTop,
  IconUser,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { logout } from "@/components/actions/logout-action";

// 主要导航数据
const data = {
  navMain: [
    {
      title: "Content Library",
      url: "/content-library",
      icon: IconHome,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Favorites",
      url: "/favorites",
      icon: IconTags,
    },
    {
      title: "Prompts",
      url: "/prompts",
      icon: IconMessageChatbot,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      icon: Settings,
    },
  ],
};

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}

export function AppSidebar({
  onSettingsClick: _onSettingsClick, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddContentClick,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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

      <SidebarContent>
        {/* 快速创建 - 采用参考示例样式 */}
        <SidebarGroup className="!px-4">
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton
                  onClick={onAddContentClick}
                  tooltip="Upload Content"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                >
                  <IconCirclePlusFilled />
                  <span>Upload Content</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 主要导航 */}
        <SidebarGroup className="!px-4 -mt-3">
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 次要导航 */}
        <SidebarGroup className="mt-auto !px-4">
          <SidebarGroupContent></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="!px-4 !pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <IconUser />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.full_name || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => logout()}>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
