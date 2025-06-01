"use client";

import { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  List,
  MessageSquare,
  BookmarkIcon,
  Layers,
} from "lucide-react";

// 导入 ui/sidebar 组件
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export const AppSidebar: FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <List className="h-5 w-5" />,
    },
    {
      name: "Favorites",
      href: "/favorites",
      icon: <BookmarkIcon className="h-5 w-5" />,
    },
    {
      name: "Prompts",
      href: "/prompts",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      name: "Content Library",
      href: "/content-library",
      icon: <Layers className="h-5 w-5" />,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="text-xl font-bold text-foreground">
          Nexus
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                tooltip={item.name}
              >
                <Link href={item.href}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
