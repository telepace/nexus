"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
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
    <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI 分析推荐
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            选择一个分析类型来开始 AI 分析
          </p>

          <div className="grid grid-cols-1 gap-2">
            {recommendations.map((recommendation) => (
              <Button
                key={recommendation.id}
                variant="outline"
                size="sm"
                onClick={() => onPromptClick(recommendation)}
                disabled={disabled || isGenerating}
                className="justify-start h-auto p-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg flex-shrink-0">
                    {recommendation.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {recommendation.name}
                      </span>
                      {isGenerating && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {recommendation.description}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {isGenerating && (
            <div className="mt-4 p-3 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在生成 AI 分析...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
