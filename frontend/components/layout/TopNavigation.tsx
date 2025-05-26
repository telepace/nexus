"use client";

import { FC, useState, useEffect } from "react";
import { PlusCircle, Settings, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/components/actions/logout-action";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

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
  const { user } = useAuth();

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
          <Image
            src="/images/vinta.png"
            alt="Nexus Logo"
            width={32}
            height={32}
            className="h-8 w-8 mr-2"
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Nexus
          </span>
        </div>

        <form onSubmit={handleSearch} className="relative w-[320px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <Input
              id="global-search"
              type="text"
              placeholder="搜索您的内容库…"
              className={cn(
                "pl-10 pr-16 h-9 w-full bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                isSearchFocused && "bg-background shadow-sm",
              )}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <kbd className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </div>
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
                {user?.avatar_url ? (
                  <AvatarImage
                    src={`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${user.avatar_url}`}
                    alt={user.full_name || user.email}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.full_name
                    ? user.full_name[0].toUpperCase()
                    : user?.email
                      ? user.email[0].toUpperCase()
                      : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{user?.full_name || "用户"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email || "user@example.com"}
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
