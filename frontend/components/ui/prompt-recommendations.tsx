"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { PromptRecommendation } from "@/lib/stores/llm-analysis-store";

interface PromptRecommendationsProps {
  recommendations: PromptRecommendation[];
  onPromptClick: (recommendation: PromptRecommendation) => void;
  isGenerating?: boolean;
  disabled?: boolean;
  usedPromptIds?: Set<string>;
  showAllPrompts?: boolean;
}

export const PromptRecommendations: FC<PromptRecommendationsProps> = ({
  recommendations,
  onPromptClick,
  isGenerating = false,
  disabled = false,
  usedPromptIds = new Set(),
  showAllPrompts = false,
}) => {
  const hasUsedPrompts = usedPromptIds.size > 0;
  const availableCount = recommendations.filter(
    (rec) => !usedPromptIds.has(rec.id),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {hasUsedPrompts && !showAllPrompts && (
          <span className="text-xs bg-muted px-2 py-1 rounded-full">
            {availableCount} 可用
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {recommendations.map((recommendation) => {
          const isUsed = usedPromptIds.has(recommendation.id);
          return (
            <Button
              key={recommendation.id}
              variant={isUsed ? "secondary" : "outline"}
              size="sm"
              onClick={() => onPromptClick(recommendation)}
              disabled={disabled || isGenerating}
              className={`justify-start h-auto p-2.5 text-left hover:bg-muted/50 transition-all duration-200 ${
                isUsed ? "opacity-70 border-dashed" : "hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0 w-4 h-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">{recommendation.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-foreground">
                      {recommendation.name}
                    </span>
                    {isUsed && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        ✓ 已使用
                      </span>
                    )}
                    {isGenerating && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {recommendations.length === 0 && hasUsedPrompts && !showAllPrompts && (
        <div className="text-center py-6 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium mb-1">所有推荐已使用</p>
          <p className="text-xs">点击上方&ldquo;显示全部&rdquo;查看所有选项</p>
        </div>
      )}

      {isGenerating && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">正在生成 AI 分析...</span>
          </div>
        </div>
      )}
    </div>
  );
};
