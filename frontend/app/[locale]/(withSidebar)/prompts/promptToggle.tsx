"use client";

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { togglePromptEnabled } from "@/components/actions/prompts-action";

interface PromptToggleProps {
  promptId: string;
  enabled: boolean;
  promptName: string;
}

export function PromptToggle({
  promptId,
  enabled,
  promptName,
}: PromptToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await togglePromptEnabled(promptId);

      if (result.error) {
        toast({
          title: "操作失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        // 获取实际的状态
        const actualStatus = result.data?.user_enabled ?? !isEnabled;
        setIsEnabled(actualStatus as boolean);
        toast({
          title: "状态已更新",
          description: `提示词"${promptName}"已${actualStatus ? "启用" : "禁用"}`,
        });
      }
    } catch (error) {
      console.error("切换启用状态出错:", error);
      toast({
        title: "操作失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      disabled={isLoading}
      className={`group relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 prompt-toggle ${
        isEnabled ? "bg-slate-900" : "bg-slate-300 hover:bg-slate-400"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
          isEnabled ? "translate-x-5" : "translate-x-1"
        } ${isLoading ? "animate-pulse" : ""}`}
      />
      <span className="sr-only">
        {isLoading ? "切换中..." : isEnabled ? "已启用" : "已禁用"}
      </span>
    </button>
  );
}
