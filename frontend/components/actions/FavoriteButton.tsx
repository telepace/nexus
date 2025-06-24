"use client";

import React, { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getCookie } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function FavoriteButton({
  itemId,
  className,
  size = "md",
  variant = "ghost",
}: FavoriteButtonProps) {
  const { data: favoriteIds = [], mutate } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);
  const isFavorited = favoriteIds.includes(itemId);

  const makeRequest = async (
    url: string,
    method: string,
    token: string,
    retryCount = 0,
  ): Promise<Response> => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return response;
    } catch (error) {
      // 网络错误重试机制
      if (
        retryCount < 2 &&
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        console.log(`Network error, retrying... (${retryCount + 1}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒后重试
        return makeRequest(url, method, token, retryCount + 1);
      }
      throw error;
    }
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation(); // 阻止事件冒泡到父元素
    if (isLoading) return; // 防止重复点击

    try {
      setIsLoading(true);

      // 统一使用环境变量配置的API URL
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const token = getCookie("accessToken");

      if (!token) {
        console.error("No access token found");
        toast.error("请先登录");
        return;
      }

      const url = `${baseUrl}/api/v1/content/${itemId}/favorite`;
      const method = isFavorited ? "DELETE" : "POST";

      console.log(`Making ${method} request to:`, url);

      const response = await makeRequest(url, method, token);

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `API request failed with status ${response.status}:`,
          errorText,
        );

        if (response.status === 401) {
          toast.error("登录已过期，请重新登录");
          return;
        } else if (response.status === 404) {
          toast.error("内容不存在");
          return;
        } else if (response.status === 409) {
          toast.error("该内容已经在收藏中");
          return;
        } else if (response.status >= 500) {
          toast.error("服务器内部错误，请稍后重试");
          return;
        } else {
          toast.error(`操作失败: ${response.status}`);
          return;
        }
      }

      // 成功时显示提示
      if (isFavorited) {
        toast.success("已取消收藏");
      } else {
        toast.success("已添加到收藏");
      }

      // 乐观更新缓存
      mutate();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);

      // 根据错误类型提供更具体的提示
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("网络连接失败，请检查网络或稍后重试");
      } else {
        toast.error("操作失败，请稍后重试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={cn(
        "transition-all duration-200 ease-in-out",
        "hover:scale-105 active:scale-95",
        "text-amber-500 hover:text-amber-600",
        "hover:bg-amber-50 dark:hover:bg-amber-950/20",
        "focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
        isLoading && "opacity-50 cursor-not-allowed",
        sizeClasses[size],
        className,
      )}
      aria-label={isFavorited ? "Unfavorite" : "Favorite"}
      tabIndex={0}
    >
      {isLoading ? (
        <Loader2
          size={iconSizes[size]}
          className="animate-spin text-amber-500"
        />
      ) : (
        <Heart
          size={iconSizes[size]}
          className={cn(
            "transition-colors",
            isFavorited
              ? "text-amber-500 fill-amber-500 drop-shadow-sm"
              : "text-amber-500 hover:text-amber-600",
          )}
        />
      )}
    </Button>
  );
}
