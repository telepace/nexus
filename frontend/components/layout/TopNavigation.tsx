"use client";

import { FC } from "react";
import { PlusCircle, Settings, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/components/actions/logout-action";
import { useAuth } from "@/lib/auth";

interface TopNavigationProps {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}

export const TopNavigation: FC<TopNavigationProps> = ({
  onSettingsClick,
  onAddContentClick,
}) => {
  const { user } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
      <div className="ml-auto flex items-center gap-2">
        <Button
          onClick={onAddContentClick}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          <span>添加内容</span>
        </Button>

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={onSettingsClick}
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                className="w-full flex items-center cursor-pointer text-neutral-500 dark:text-neutral-400"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
