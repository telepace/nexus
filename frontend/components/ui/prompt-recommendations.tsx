"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { PromptRecommendation } from "@/lib/stores/llm-analysis-store";

interface PromptRecommendationsProps {
  recommendations: PromptRecommendation[];
  onPromptClick: (recommendation: PromptRecommendation) => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

export const PromptRecommendations: FC<PromptRecommendationsProps> = ({
  recommendations,
  onPromptClick,
  isGenerating = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {recommendations.map((recommendation) => {
          return (
            <Button
              key={recommendation.id}
              variant="ghost"
              size="sm"
              onClick={() => onPromptClick(recommendation)}
              disabled={disabled || isGenerating}
              className="justify-start h-auto p-2.5 text-left bg-transparent border border-border shadow-md rounded-sm hover:bg-muted/30 transition-all duration-200 "
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-shrink-0 w-4 h-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">{recommendation.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-foreground">
                      {recommendation.name}
                    </span>
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
