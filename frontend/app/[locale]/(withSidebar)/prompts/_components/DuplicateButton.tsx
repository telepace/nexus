"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { duplicatePromptAction } from "@/components/actions/prompts-action";
import { toast } from "@/components/ui/use-toast";

interface DuplicateButtonProps {
  promptId: string;
}

export function DuplicateButton({ promptId }: DuplicateButtonProps) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    try {
      setIsDuplicating(true);

      const result = await duplicatePromptAction(promptId);

      if (result.error) {
        toast({
          title: "复制失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "复制成功",
          description: "提示词已成功复制",
        });
        // 复制成功后的重定向由API处理
      }
    } catch (error) {
      toast({
        title: "复制出错",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDuplicate}
      disabled={isDuplicating}
    >
      <Copy className="h-4 w-4 mr-2" />
      {isDuplicating ? "复制中..." : "复制"}
    </Button>
  );
}
