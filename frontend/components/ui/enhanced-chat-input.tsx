"use client";

import React, { useState, useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Paperclip,
  Smile,
  Mic,
  Square,
  CornerDownLeft,
} from "lucide-react";

interface EnhancedChatInputProps {
  /** 输入值 */
  value: string;
  /** 输入变化回调 */
  onChange: (value: string) => void;
  /** 发送消息回调 */
  onSend: (message: string) => Promise<void> | void;
  /** 是否正在发送 */
  isLoading?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大字符数 */
  maxLength?: number;
  /** 是否显示字符计数 */
  showCharCount?: boolean;
  /** 是否支持多行输入 */
  multiline?: boolean;
  /** 额外的操作按钮 */
  actions?: React.ReactNode;
  /** 自定义样式 */
  className?: string;
  /** 发送快捷键提示 */
  sendHint?: string;
}

export function EnhancedChatInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "输入消息...",
  disabled = false,
  maxLength = 2000,
  showCharCount = true,
  multiline = true,
  actions,
  className,
  sendHint = "Enter 发送，Shift+Enter 换行",
}: EnhancedChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea && multiline) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // 最大高度
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [multiline]);

  // 处理输入变化
  const handleChange = (newValue: string) => {
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    onChange(newValue);
    // 延迟调整高度，确保DOM更新后执行
    setTimeout(adjustHeight, 0);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter 换行（允许默认行为）
        return;
      } else {
        // Enter 发送
        e.preventDefault();
        handleSend();
      }
    }
  };

  // 发送消息
  const handleSend = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading || disabled) return;

    try {
      await onSend(trimmedValue);
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  };

  // 字符计数显示
  const charCount = value.length;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  return (
    <Card
      className={cn(
        "relative border-2 transition-all duration-200",
        isFocused
          ? "border-primary shadow-md"
          : "border-muted-foreground/20 hover:border-muted-foreground/40",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <div className="p-3 space-y-3">
        {/* 主输入区域 */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              "min-h-[44px] resize-none border-0 bg-transparent",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground/60",
              !multiline && "overflow-hidden",
            )}
            style={{ height: multiline ? "auto" : "44px" }}
          />

          {/* 发送按钮 */}
          <div className="absolute bottom-2 right-2">
            <Button
              onClick={handleSend}
              disabled={!value.trim() || isLoading || disabled || isOverLimit}
              size="sm"
              className={cn(
                "h-8 w-8 p-0 rounded-full",
                "transition-all duration-200",
                "disabled:opacity-50",
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {/* 功能按钮 */}
            {actions}

            {/* 快捷键提示 */}
            {isFocused && (
              <Badge variant="outline" className="text-xs">
                <CornerDownLeft className="h-3 w-3 mr-1" />
                {sendHint}
              </Badge>
            )}
          </div>

          {/* 字符计数 */}
          {showCharCount && maxLength && (
            <div
              className={cn(
                "text-xs transition-colors",
                isOverLimit
                  ? "text-destructive font-medium"
                  : isNearLimit
                    ? "text-warning"
                    : "text-muted-foreground",
              )}
            >
              {charCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
