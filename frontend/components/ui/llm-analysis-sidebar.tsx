"use client";

import { FC, useEffect } from "react";
import { Brain, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LLMAnalysisCard } from "@/components/ui/llm-analysis-card";
import { PromptRecommendations } from "@/components/ui/prompt-recommendations";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import { useLLMAnalysisStore } from "@/lib/stores/llm-analysis-store";
import { useToast } from "@/hooks/use-toast";
import { Prompt } from "@/lib/api/services/prompts";

interface LLMAnalysisSidebarProps {
  contentId: string;
  className?: string;
  contentText?: string;
}

export const LLMAnalysisSidebar: FC<LLMAnalysisSidebarProps> = ({
  contentId,
  className = "",
  contentText = "",
}) => {
  const {
    analyses,
    isGenerating,
    error,
    enabledPrompts,
    disabledPrompts,
    isLoadingPrompts,
    toggleExpanded,
    removeAnalysis,
    clearAnalyses,
    generateAnalysis,
    executeAnalysisWithContent,
    loadPrompts,
    setError,
    getAvailablePrompts,
  } = useLLMAnalysisStore();

  const { toast } = useToast();

  // 加载prompts
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 过滤当前内容的分析
  const contentAnalyses = analyses.filter(
    (analysis) => analysis.contentId === contentId,
  );

  // 清理错误状态
  useEffect(() => {
    if (error) {
      toast({
        title: "操作失败",
        description: error,
        variant: "destructive",
      });
      setError(null);
    }
  }, [error, toast, setError]);

  const handleEnabledPromptClick = async (prompt: Prompt) => {
    console.log("[LLM Analysis] 开始生成分析:", {
      contentId,
      promptName: prompt.name,
      contentTextLength: contentText.length,
      hasContent: !!contentText,
    });

    try {
      // 使用传入的内容文本或获取当前页面内容
      const content = contentText || "当前页面的内容...";

      if (!content || content.trim().length === 0) {
        throw new Error("没有可分析的内容，请确保内容已加载完成");
      }

      await generateAnalysis(
        contentId,
        prompt.content, // system prompt
        content, // user prompt (文章正文)
        prompt.id,
        prompt.name,
      );

      console.log("[LLM Analysis] 分析生成请求已发送");
    } catch (error) {
      console.error("[LLM Analysis] 生成分析失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "无法生成分析，请稍后重试",
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
        contentText,
        analysis.promptId,
        analysis.title,
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

  const handlePromptSelect = (prompt: Prompt) => {
    // 当用户选择prompt时的回调，由PromptCommandDialog处理
    console.log("Selected prompt:", prompt);
  };

  const handleExecute = async (
    message: string,
    selectedPrompt: Prompt | null,
  ) => {
    try {
      await executeAnalysisWithContent(contentId, message, selectedPrompt);
    } catch (error) {
      console.error("执行分析失败:", error);
      toast({
        title: "执行失败",
        description: "无法执行分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  if (isLoadingPrompts) {
    return (
      <div
        className={`h-full bg-sidebar text-sidebar-foreground border-l flex flex-col ${className}`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI 分析</CardTitle>
            {contentAnalyses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({contentAnalyses.length})
              </span>
            )}
          </div>

          {/* 添加内容状态提示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground">
              内容ID: {contentId} | 内容长度: {contentText.length} 字符
            </div>
          )}

          {contentAnalyses.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({contentAnalyses.length})
            </span>
          )}
        </div>

        {/* 测试按钮 */}
        {process.env.NODE_ENV === 'development' && contentText && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEnabledPromptClick({
              id: 'test',
              name: '测试分析',
              content: '请对以下内容进行简要分析，提取主要观点：',
              description: '测试用的分析提示',
              visibility: 'public' as const,
              version: 1,
              enabled: true,
              type: 'template' as const,
              input_vars: [],
              meta_data: {},
              team_id: null,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              embedding: {},
              created_by: 'test',
            })}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? '分析中...' : '🧪 测试分析功能'}
          </Button>
        )}
      </CardHeader>

        {contentAnalyses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content - 占据剩余空间，可滚动 */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
        <div className="space-y-4">
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

          {/* 空状态提示 */}
          {contentAnalyses.length === 0 && !isGenerating && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-16 w-16 mx-auto mb-6 opacity-30" />
              <p className="text-lg font-medium mb-2">还没有 AI 分析</p>
              <p className="text-sm">选择下方的分析类型或使用对话框开始</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - 固定不缩放 */}
      <div className="shrink-0 px-4 pb-4">
        <div className="space-y-1">
          {/* 启用的 Prompt 推荐 */}
          {enabledPrompts.length > 0 && (
            <div className="bg-transparent">
              {/* 直接使用滚动容器，移除多余的padding */}
              <div className="max-h-[160px] overflow-y-auto">
                <PromptRecommendations
                  recommendations={getAvailablePrompts().map((prompt) => ({
                    id: prompt.id,
                    name: prompt.name,
                    description: prompt.description,
                    prompt: prompt.content,
                    type: "custom" as const,
                    icon: "🤖",
                  }))}
                  onPromptClick={(rec) => {
                    const prompt = enabledPrompts.find((p) => p.id === rec.id);
                    if (prompt) handleEnabledPromptClick(prompt);
                  }}
                  isGenerating={isGenerating}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}

          {/* 对话框 */}
          <div className="bg-transparent">
            <PromptCommandDialog
              availablePrompts={disabledPrompts}
              isExecuting={isGenerating}
              onPromptSelect={handlePromptSelect}
              onExecute={handleExecute}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
