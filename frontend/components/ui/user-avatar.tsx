"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";

// 动态导入 NiceAvatar 以避免SSR问题
const NiceAvatar = React.lazy(() => import("react-nice-avatar"));

interface UserAvatarProps {
  user: User | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-12 w-12",
  xl: "h-32 w-32",
};

const fallbackTextSizes = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm", 
  xl: "text-2xl",
};

export function UserAvatar({ 
  user, 
  size = "md", 
  className,
  showFallback = true 
}: UserAvatarProps) {
  // 获取用户名的首字母
  const getUserInitials = (user: User | null) => {
    if (!user?.full_name) return showFallback ? "?" : "U";
    return user.full_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // 如果用户有anime头像配置，渲染anime头像
  if (user?.anime_avatar_config) {
    const sizePixels = {
      sm: 24,
      md: 32,
      lg: 48, 
      xl: 128,
    };

    return (
      <div className={cn(
        sizeClasses[size],
        "rounded-full overflow-hidden bg-gray-100 flex items-center justify-center",
        className
      )}>
        <React.Suspense fallback={
          <Avatar className={sizeClasses[size]}>
            <AvatarFallback className={fallbackTextSizes[size]}>
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        }>
          <NiceAvatar
            style={{ 
              width: `${sizePixels[size]}px`, 
              height: `${sizePixels[size]}px` 
            }}
            {...user.anime_avatar_config}
          />
        </React.Suspense>
      </div>
    );
  }

  // 传统头像
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user?.avatar_url ? (
        <AvatarImage 
          src={user.avatar_url} 
          alt={user.full_name || "User"} 
        />
      ) : null}
      <AvatarFallback className={fallbackTextSizes[size]}>
        {getUserInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
} 