"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookmarkIcon,
  MessageSquare,
  Layers,
  Settings,
  Hexagon,
} from "lucide-react";

import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavQuickCreate } from "@/components/layout/sidebar/nav-quick-create";
import { NavSecondary } from "@/components/layout/sidebar/nav-secondary";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Favorites",
      url: "/favorites",
      icon: BookmarkIcon,
    },
    {
      title: "Prompts",
      url: "/prompts",
      icon: MessageSquare,
    },
    {
      title: "Content Library",
      url: "/content-library",
      icon: Layers,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ 
  onSettingsClick,
  onAddContentClick,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Hexagon className="!size-5" />
                <span className="text-base font-semibold">Nexus</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavQuickCreate onUploadClick={onAddContentClick} />
        <NavSecondary 
          items={data.navSecondary} 
          onItemClick={(item) => {
            if (item.title === "Settings") {
              onSettingsClick();
            }
          }}
          className="mt-auto" 
        />
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
