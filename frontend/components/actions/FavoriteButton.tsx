"use client";

import React, { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getCookie } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslationUtils } from "@/lib/i18n-utils";
import { useAuth } from "@/lib/client-auth";

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline" | "secondary";
  // 新增：块级收藏支持
  blockId?: string;
  blockType?: string;
  blockContent?: any;
  title?: string;
  description?: string;
  tags?: string[];
  // 新增：回调函数
  onFavoriteChange?: (isFavorited: boolean) => void;
  initialFavorited?: boolean;
  showLabel?: boolean;
}

export function FavoriteButton({
  itemId,
  className,
  size = "md",
  variant = "ghost",
  blockId,
  blockType,
  blockContent,
  title,
  description,
  tags,
  onFavoriteChange,
  initialFavorited = false,
  showLabel = false,
}: FavoriteButtonProps) {
  const { data: favoriteIds = [], mutate } = useFavorites();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslationUtils();
  const { user } = useAuth();

  // 对于块级收藏，需要检查特定的块是否被收藏
  // 这里简化处理，实际应该有专门的hook来检查块级收藏状态
  // const isFavorited = favoriteIds.includes(itemId); // This line is now redundant

  const makeRequest = async (
    url: string,
    method: string,
    token: string,
    body?: any,
    retryCount = 0,
  ): Promise<Response> => {
    try {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
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
        return makeRequest(url, method, token, body, retryCount + 1);
      }
      throw error;
    }
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation(); // 阻止事件冒泡到父元素
    if (isLoading) return; // 防止重复点击

    if (!user) {
      toast.error(t("auth.loginRequired"));
      return;
    }

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

      let url = `${baseUrl}/api/v1/content/${itemId}/favorite`;
      const method = isFavorited ? "DELETE" : "POST";
      let body = undefined;

      // 如果是块级收藏，需要添加查询参数或请求体
      if (blockId) {
        if (method === "DELETE") {
          // 删除时通过查询参数传递block_id
          url += `?block_id=${encodeURIComponent(blockId)}`;
        } else {
          // 添加时通过请求体传递块信息
          body = {
            block_id: blockId,
            block_type: blockType,
            block_content: blockContent,
            title,
            description,
            tags,
          };
        }
      }

      console.log(`Making ${method} request to:`, url);
      if (body) {
        console.log("Request body:", body);
      }

      const response = await makeRequest(url, method, token, body);

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
          if (blockId) {
            toast.error("该块不存在或已被删除");
          } else {
            toast.error("内容不存在");
          }
          return;
        } else if (response.status === 409) {
          if (blockId) {
            toast.error("该块已经在收藏中");
          } else {
            toast.error("该内容已经在收藏中");
          }
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
      const newFavoriteState = !isFavorited;
      if (blockId) {
        if (newFavoriteState) {
          toast.success("已收藏该块");
        } else {
          toast.success("已取消收藏该块");
        }
      } else {
        if (newFavoriteState) {
          toast.success("已添加到收藏");
        } else {
          toast.success("已取消收藏");
        }
      }

      // 触发回调函数
      onFavoriteChange?.(newFavoriteState);

      // 乐观更新缓存
      mutate();
    } catch (error) {
      console.error("收藏操作失败:", error);

      if (error instanceof Error) {
        if (error.message.includes("401")) {
          toast.error(t("auth.sessionExpired"));
        } else if (error.message.includes("404")) {
          if (blockId) {
            toast.error(t("favorites.blockNotFound"));
          } else {
            toast.error(t("favorites.contentNotFound"));
          }
        } else if (error.message.includes("409")) {
          if (blockId) {
            toast.error(t("favorites.blockAlreadyFavorited"));
          } else {
            toast.error(t("favorites.alreadyFavorited"));
          }
        } else if (error.message.includes("500")) {
          toast.error(t("messages.serverError"));
        } else {
          toast.error(`${t("messages.operationFailed")}: ${response.status}`);
        }
      } else {
        // 网络错误等其他类型错误
        if (error instanceof TypeError && error.message.includes("fetch")) {
          toast.error(t("messages.networkError"));
        } else {
          toast.error(t("messages.operationFailed"));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-7 w-7",
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
        "hover:scale-110 active:scale-95",
        "text-neutral-400 hover:text-amber-500",
        "hover:bg-transparent",
        "focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:ring-offset-1",
        isLoading && "opacity-50 cursor-not-allowed",
        sizeClasses[size],
        className,
      )}
      aria-label={
        blockId
          ? isFavorited
            ? t("favorites.unfavoriteBlock")
            : t("favorites.favoriteBlock")
          : isFavorited
            ? t("favorites.removeFromFavorites")
            : t("favorites.addToFavorites")
      }
      tabIndex={0}
    >
      {isLoading ? (
        <Loader2
          size={iconSizes[size]}
          className="animate-spin text-neutral-400"
        />
      ) : (
        <Heart
          size={iconSizes[size]}
          className={cn(
            "transition-all duration-200 ease-out",
            isFavorited
              ? "text-amber-500 fill-amber-500"
              : "text-neutral-400 hover:text-amber-500",
          )}
        />
      )}
    </Button>
  );
}
