"use client";

import React, { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCookie } from "@/lib/utils";
import { toast } from "sonner";

interface BlockFavoriteButtonProps {
  contentId: string;
  blockId: string;
  blockType: string;
  blockContent: any;
  title?: string;
  description?: string;
  tags?: string[];
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline" | "secondary";
  onFavoriteChange?: (isFavorited: boolean) => void;
}

export function BlockFavoriteButton({
  contentId,
  blockId,
  blockType,
  blockContent,
  title,
  description,
  tags,
  className,
  size = "sm",
  variant = "ghost",
  onFavoriteChange,
}: BlockFavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // 检查块的收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const token = getCookie("accessToken");

        if (!token) {
          setIsCheckingStatus(false);
          return;
        }

        const url = `${baseUrl}/api/v1/content/${contentId}/favorite/status?block_id=${encodeURIComponent(blockId)}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsFavorited(data.is_favorite);
        }
      } catch (error) {
        console.error("Failed to check favorite status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [contentId, blockId]);

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
      if (
        retryCount < 2 &&
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        console.log(`Network error, retrying... (${retryCount + 1}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return makeRequest(url, method, token, body, retryCount + 1);
      }
      throw error;
    }
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    if (isLoading) return;

    try {
      setIsLoading(true);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const token = getCookie("accessToken");

      if (!token) {
        toast.error("请先登录");
        return;
      }

      let url = `${baseUrl}/api/v1/content/${contentId}/favorite`;
      const method = isFavorited ? "DELETE" : "POST";
      let body = undefined;

      if (method === "DELETE") {
        url += `?block_id=${encodeURIComponent(blockId)}`;
      } else {
        body = {
          block_id: blockId,
          block_type: blockType,
          block_content: blockContent,
          title,
          description,
          tags,
        };
      }

      const response = await makeRequest(url, method, token, body);

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
          toast.error("该块不存在或已被删除");
          return;
        } else if (response.status === 409) {
          toast.error("该块已经在收藏中");
          return;
        } else if (response.status >= 500) {
          toast.error("服务器内部错误，请稍后重试");
          return;
        } else {
          toast.error(`操作失败: ${response.status}`);
          return;
        }
      }

      const newFavoriteState = !isFavorited;
      setIsFavorited(newFavoriteState);

      if (newFavoriteState) {
        toast.success("已收藏该块");
      } else {
        toast.success("已取消收藏该块");
      }

      onFavoriteChange?.(newFavoriteState);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("操作失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  if (isCheckingStatus) {
    return (
      <Button
        variant={variant}
        size="icon"
        disabled
        className={cn(
          "transition-all duration-200 ease-in-out",
          "opacity-50 cursor-not-allowed",
          sizeClasses[size],
          className,
        )}
      >
        <Loader2
          size={iconSizes[size]}
          className="animate-spin text-neutral-400"
        />
      </Button>
    );
  }

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
      aria-label={isFavorited ? "取消收藏该块" : "收藏该块"}
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
