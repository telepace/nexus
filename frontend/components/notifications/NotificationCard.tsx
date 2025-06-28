"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ProcessingNotification } from "@/lib/types/notifications";

interface NotificationCardProps {
  notification: ProcessingNotification;
  onClose?: (id: string) => void;
  onAction?: (notification: ProcessingNotification) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  const router = useRouter();

  // 根据通知类型获取图标和颜色
  const getNotificationStyle = () => {
    switch (notification.status) {
      case "processing":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-[oklch(var(--color-primary))]" />,
          borderColor: "border-[oklch(var(--color-border))]",
          bgColor: "bg-[oklch(var(--color-accent))]",
          titleColor: "text-[oklch(var(--color-accent-foreground))]",
        };
      case "completed":
        return {
          icon: <CheckCircle className="h-5 w-5 text-[oklch(var(--color-chart-1))]" />,
          borderColor: "border-[oklch(var(--color-border))]",
          bgColor: "bg-[oklch(var(--color-muted))]",
          titleColor: "text-[oklch(var(--color-foreground))]",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-5 w-5 text-[oklch(var(--color-destructive))]" />,
          borderColor: "border-[oklch(var(--color-border))]",
          bgColor: "bg-[oklch(var(--color-destructive)/0.1)]",
          titleColor: "text-[oklch(var(--color-destructive))]",
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-[oklch(var(--color-muted-foreground))]" />,
          borderColor: "border-[oklch(var(--color-border))]",
          bgColor: "bg-[oklch(var(--color-muted))]",
          titleColor: "text-[oklch(var(--color-foreground))]",
        };
    }
  };

  const style = getNotificationStyle();

  // 处理点击通知卡片
  const handleCardClick = () => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onAction?.(notification);
    }
  };

  // 处理重试操作
  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.retryAction) {
      notification.retryAction();
    }
  };

  // 处理关闭操作
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.(notification.id);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            "relative cursor-pointer transition-all duration-200 hover:shadow-md",
            style.borderColor,
            style.bgColor,
            notification.actionUrl && "hover:scale-[1.02]",
          )}
          onClick={handleCardClick}
        >
          <CardContent className="p-4">
            {/* 头部：图标、标题、关闭按钮 */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "font-medium text-sm leading-tight",
                      style.titleColor,
                    )}
                  >
                    {notification.title}
                  </h4>
                </div>
              </div>

              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2 flex-shrink-0 hover:bg-black/10"
                onClick={handleClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* 消息内容 */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {notification.message}
            </p>

            {/* 进度条（仅处理中状态显示） */}
            {notification.status === "processing" &&
              typeof notification.progress === "number" && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">
                      处理进度
                    </span>
                    <span className="text-xs font-medium">
                      {notification.progress}%
                    </span>
                  </div>
                  <Progress value={notification.progress} className="h-2" />
                </div>
              )}

            {/* 底部：时间和操作按钮 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatTime(notification.timestamp)}
              </span>

              <div className="flex items-center space-x-2">
                {/* 重试按钮（错误状态显示） */}
                {notification.status === "error" &&
                  notification.retryAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      重试
                    </Button>
                  )}

                {/* 查看按钮（完成状态显示） */}
                {notification.status === "completed" &&
                  notification.actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick();
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      查看
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NotificationCard;
