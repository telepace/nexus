"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  /** 文本提示，默认为"加载中..." */
  message?: string;
  /** 额外的容器样式 */
  className?: string;
}

/**
 * 统一的加载指示器组件
 *
 * 用法：
 * <Loading />
 * <Loading message="正在上传..." />
 */
export const Loading: React.FC<LoadingProps> = ({
  message = "加载中...",
  className = "",
}) => {
  return (
    <div className={cn("flex justify-center items-center h-full", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};
