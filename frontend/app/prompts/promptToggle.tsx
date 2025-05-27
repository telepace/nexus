"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
        const newStatus = !isEnabled;
        setIsEnabled(newStatus);
        toast({
          title: "状态已更新",
          description: `提示词"${promptName}"已${newStatus ? "启用" : "禁用"}`,
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
    <div
      className="flex items-center space-x-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Switch
        id={`enabled-${promptId}`}
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        className="data-[state=checked]:bg-green-600"
      />
      <Label
        htmlFor={`enabled-${promptId}`}
        className={`text-xs cursor-pointer ${isEnabled ? "text-green-600" : "text-gray-500"}`}
      >
        {isLoading ? "..." : isEnabled ? "已启用" : "已禁用"}
      </Label>
    </div>
  );
}
