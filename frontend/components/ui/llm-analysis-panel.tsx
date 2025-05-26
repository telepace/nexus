"use client";

import { FC, useEffect } from "react";
import { Brain, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LLMAnalysisCard } from "@/components/ui/llm-analysis-card";
import { PromptRecommendations } from "@/components/ui/prompt-recommendations";
import {
  useLLMAnalysisStore,
  defaultPromptRecommendations,
  PromptRecommendation,
} from "@/lib/stores/llm-analysis-store";
import { useToast } from "@/hooks/use-toast";

interface LLMAnalysisPanelProps {
  contentId: string;
  className?: string;
}

export const LLMAnalysisPanel: FC<LLMAnalysisPanelProps> = ({
  contentId,
  className = "",
}) => {
  const {
    analyses,
    isGenerating,
    error,
    toggleExpanded,
    removeAnalysis,
    clearAnalyses,
    generateAnalysis,
    setError,
  } = useLLMAnalysisStore();

  const { toast } = useToast();

  // 过滤当前内容的分析
  const contentAnalyses = analyses.filter(
    (analysis) => analysis.contentId === contentId
  );

  // 清理错误状态
  useEffect(() => {
    if (error) {
      toast({
        title: "分析失败",
        description: error,
        variant: "destructive",
      });
      setError(null);
    }
  }, [error, toast, setError]);

  const handlePromptClick = async (recommendation: PromptRecommendation) => {
    try {
      await generateAnalysis(
        contentId,
        recommendation.prompt,
        recommendation.type,
        recommendation.name
      );
    } catch (error) {
      console.error("生成分析失败:", error);
      toast({
        title: "生成失败",
        description: "无法生成分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "分析内容已复制到剪贴板",
    });
  };

  const handleRegenerate = async (analysisId: string) => {
    const analysis = contentAnalyses.find((a) => a.id === analysisId);
    if (!analysis || !analysis.prompt) return;

    // 移除旧的分析
    removeAnalysis(analysisId);

    // 生成新的分析
    try {
      await generateAnalysis(
        contentId,
        analysis.prompt,
        analysis.type,
        analysis.title
      );
    } catch (error) {
      console.error("重新生成分析失败:", error);
      toast({
        title: "重新生成失败",
        description: "无法重新生成分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = () => {
    clearAnalyses();
    toast({
      title: "已清空",
      description: "所有分析已清空",
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI 分析</h2>
          {contentAnalyses.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({contentAnalyses.length})
            </span>
          )}
        </div>

        {contentAnalyses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空全部
          </Button>
        )}
      </div>

      {/* 分析结果列表 */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          {contentAnalyses.map((analysis) => (
            <LLMAnalysisCard
              key={analysis.id}
              analysis={analysis}
              onToggleExpanded={toggleExpanded}
              onRemove={removeAnalysis}
              onRegenerate={handleRegenerate}
              onCopy={handleCopy}
            />
          ))}

          {/* Prompt 推荐 */}
          <PromptRecommendations
            recommendations={defaultPromptRecommendations}
            onPromptClick={handlePromptClick}
            isGenerating={isGenerating}
            disabled={isGenerating}
          />

          {/* 空状态提示 */}
          {contentAnalyses.length === 0 && !isGenerating && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">还没有 AI 分析</p>
              <p className="text-xs mt-1">选择下方的分析类型开始</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}; 