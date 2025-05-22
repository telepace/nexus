"use client";

import { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Home, Users2, List, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const pathname = usePathname();

  const navItems = [
    { 
      name: "Dashboard", 
      href: "/dashboard", 
      icon: <List className="h-5 w-5" /> 
    },
    { 
      name: "Customers", 
      href: "/customers", 
      icon: <Users2 className="h-5 w-5" /> 
    },
    { 
      name: "Prompts", 
      href: "/prompts", 
      icon: <MessageSquare className="h-5 w-5" /> 
    },
  ];

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-10 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <img 
              src="/images/vinta.png" 
              alt="Nexus Logo" 
              className="object-cover" 
            />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Nexus
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <TooltipProvider key={item.href} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive 
                        ? "bg-blue-50 text-primary dark:bg-blue-950" 
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    )}
                    aria-label={item.name}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* 底部设置按钮 */}
      <div className="mt-auto pt-4">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  pathname === "/settings"
                    ? "bg-blue-50 text-primary dark:bg-blue-950"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
                aria-label="设置"
              >
                <Settings className="h-5 w-5" />
                {!collapsed && <span>设置</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>设置</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}; 