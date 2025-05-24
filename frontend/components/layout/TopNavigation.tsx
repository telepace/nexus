"use client";

import { FC, useState, useEffect } from "react";
import {
  PlusCircle,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/components/actions/logout-action";
import { cn } from "@/lib/utils";

interface TopNavigationProps {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}

export const TopNavigation: FC<TopNavigationProps> = ({
  onSettingsClick,
  onAddContentClick,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 监听 cmd+k 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // 实现搜索逻辑
      console.log("Searching for:", searchValue);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center">
        <div className="flex items-center mr-8">
          <img
            src="/images/vinta.png"
            alt="Nexus Logo"
            className="h-8 w-8 mr-2"
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Nexus
          </span>
        </div>

        <form onSubmit={handleSearch} className="relative w-[260px]">
          <div
            className={cn(
              "flex items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-500 dark:text-gray-400 transition-all",
              isSearchFocused && "ring-2 ring-primary/50 border-primary/50",
            )}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="8" cy="8" r="7" />
                <line x1="13" y1="13" x2="17" y2="17" />
              </svg>
            </span>
            <Input
              id="global-search"
              type="text"
              placeholder="搜索您的内容库…"
              className="pl-10 pr-3 py-2 w-full rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm placeholder:text-gray-400 transition"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              ⌘ K
            </span>
          </div>
        </form>
      </div>

      <div className="flex items-center space-x-4">
        <Button
          onClick={onAddContentClick}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          <span>添加内容</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              data-testid="user-menu"
            >
              <Avatar className="h-8 w-8" data-testid="user-avatar">
                <AvatarFallback className="bg-primary/10 text-primary">
                  U
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">用户名</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  user@example.com
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="w-full flex items-center cursor-pointer"
                onClick={onSettingsClick}
              >
                <User className="mr-2 h-4 w-4" />
                <span>账户设置</span>
              </button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="w-full flex items-center cursor-pointer text-red-500 dark:text-red-400"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
