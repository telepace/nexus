"use client";

import {
  FileText,
  Star,
  Clock,
  TrendingUp,
  Tag,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AIAnalysisCard } from "./AIAnalysisCard";
import type { ContentItemPublic } from "../types";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

// 星级评分组件
const StarRating = ({ score }: { score: number }) => {
  const stars = Math.round(score * 5);
  const fullStars = Math.floor(stars);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < fullStars ? "fill-amber-400 text-amber-400" : "text-neutral-300"
          }`}
        />
      ))}
      <span className="text-sm text-neutral-600 ml-2">
        {score.toFixed(1)} / 5.0
      </span>
    </div>
  );
};

// 难度等级组件
const DifficultyLevel = ({ level }: { level: string }) => {
  const config = {
    beginner: {
      label: "入门",
    },
    intermediate: {
      label: "中级",
    },
    advanced: { label: "高级" },
  };

  const { label } =
    config[level as keyof typeof config] || config.intermediate;

  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-foreground bg-transparent shadow"
    >
      <TrendingUp className="h-3 w-3 mr-1" />
      {label}
    </span>
  );
};

interface Panel {
  id: number;
  item: ContentItemPublic;
}

let panelIdCounter = 0;

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  const [panels, setPanels] = useState<Panel[]>([]);

  useEffect(() => {
    if (item) {
      // 使用函数式更新来避免依赖 panels
      setPanels((prevPanels) => {
        // 只有当传入的 item 与栈顶的 item 内容不同时才添加新面板
        if (item.id !== prevPanels[prevPanels.length - 1]?.item.id) {
          panelIdCounter++;
          const newPanels = [
            ...prevPanels,
            { id: panelIdCounter, item: item },
          ].slice(-2);
          return newPanels;
        }
        return prevPanels;
      });
    }
  }, [item]); // 只依赖 item

  if (!panels.length && !item) {
    return (
      <div className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-hidden">
        <div className="flex items-center h-header px-4">
          <div className="flex items-center gap-2 text-base font-medium">
            <FileText className="h-5 w-5" />
            内容预览
          </div>
        </div>
        <div className="pb-4 flex-1 overflow-auto mt-12">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground">
              点击内容卡片查看预览
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {panels.map((panel, index) => (
          <motion.div
            key={panel.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            style={{
              position: "absolute",
              inset: "0",
              zIndex: 10 + index,
            }}
          >
            <PanelContent item={panel.item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// 内容摘要卡片组件
const SummaryCard = ({ summary }: { summary: unknown | null }) => {
  if (!summary) return null;

  let summaryText = "";

  // 处理不同格式的摘要
  if (typeof summary === "string") {
    summaryText = summary;
  } else if (summary && typeof summary === "object") {
    const summaryObj = summary as Record<string, unknown>;
    if (summaryObj.text && typeof summaryObj.text === "string") {
      summaryText = summaryObj.text;
    } else if (summaryObj.content && typeof summaryObj.content === "string") {
      summaryText = summaryObj.content;
    } else if (summaryObj.summary && typeof summaryObj.summary === "string") {
      summaryText = summaryObj.summary;
    } else if (summaryObj.raw_text && typeof summaryObj.raw_text === "string") {
      summaryText = summaryObj.raw_text;
    } else {
      // 尝试找到最长的字符串值
      const values = Object.values(summaryObj).filter(
        (val) => typeof val === "string" && val.length > 50,
      );
      summaryText = (values[0] as string) || JSON.stringify(summary);
    }
  }

  if (!summaryText) return null;

  return (
    <Card className="h-full analysis-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-blue-600" />
          内容摘要
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="text-sm text-muted-foreground leading-relaxed reading-content">
          <MarkdownRenderer
            content={summaryText}
            className="prose prose-sm max-w-none dark:prose-invert
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0
              prose-strong:text-foreground prose-em:text-foreground
              prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:mb-1
              prose-headings:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />
        </div>
      </CardContent>
    </Card>
  );
};

// 关键要点卡片组件
const KeyPointsCard = ({ keyPoints }: { keyPoints: unknown | null }) => {
  if (!keyPoints) return null;

  let points: string[] = [];
  let keyPointsContent = "";

  // 尝试提取要点数组
  if (keyPoints && typeof keyPoints === "object") {
    const keyPointsObj = keyPoints as Record<string, unknown>;

    if (Array.isArray(keyPointsObj.points)) {
      points = keyPointsObj.points.map((p) =>
        typeof p === "string" ? p : JSON.stringify(p),
      );
    } else if (Array.isArray(keyPointsObj.items)) {
      points = keyPointsObj.items.map((p) =>
        typeof p === "string" ? p : JSON.stringify(p),
      );
    } else if (Array.isArray(keyPointsObj.key_points)) {
      points = keyPointsObj.key_points.map((p) =>
        typeof p === "string" ? p : JSON.stringify(p),
      );
    } else if (Array.isArray(keyPoints)) {
      points = (keyPoints as unknown[]).map((p) =>
        typeof p === "string" ? p : JSON.stringify(p),
      );
    } else {
      // 尝试获取原始文本内容（可能是markdown格式）
      keyPointsContent =
        (keyPointsObj.text as string) ||
        (keyPointsObj.content as string) ||
        (keyPointsObj.markdown as string) ||
        (keyPointsObj.raw_text as string) ||
        (Object.values(keyPointsObj || {}).find(
          (val) => typeof val === "string" && val.length > 50,
        ) as string) ||
        "";

      if (!keyPointsContent) {
        points = Object.values(keyPointsObj || {})
          .filter((val) => typeof val === "string" && val.length > 10)
          .map((val) => val as string);
      }
    }
  }

  if (!keyPointsContent && points.length === 0) return null;

  return (
    <Card className="h-full analysis-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          关键要点
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {/* 如果有markdown内容，直接渲染 */}
        {keyPointsContent ? (
          <div className="text-sm text-muted-foreground leading-relaxed reading-content">
            <MarkdownRenderer
              content={keyPointsContent}
              className="prose prose-sm max-w-none dark:prose-invert
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0
                prose-strong:text-foreground prose-em:text-foreground
                prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:mb-1
                prose-ul:mb-2 prose-ol:mb-2 prose-ul:mt-0 prose-ol:mt-0
                prose-headings:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
                [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            />
          </div>
        ) : (
          /* 如果是要点数组，使用自定义样式 */
          <div className="space-y-2">
            {points.length > 0 ? (
              points.slice(0, 5).map((point, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed reading-content">
                    <MarkdownRenderer
                      content={point}
                      className="prose prose-sm max-w-none dark:prose-invert
                        prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-1 prose-p:mt-0
                        prose-strong:text-foreground prose-em:text-foreground
                        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground reading-content">
                <MarkdownRenderer
                  content={JSON.stringify(keyPoints)}
                  className="prose prose-sm max-w-none dark:prose-invert"
                />
              </div>
            )}
            {points.length > 5 && (
              <div className="text-xs text-muted-foreground ml-6">
                +{points.length - 5} 个更多要点
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 子组件渲染实际内容，避免重复
const PanelContent = ({ item }: { item: ContentItemPublic }) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aiResult = item.ai_result;
  const aiAnalysis = item.ai_analysis;

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="h-full shadow-macos-window linear-bg-2 rounded-sm flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-5 w-5" />
          内容预览
        </div>
      </div>

      {/* Body */}
      <div className="pb-4 flex-1 overflow-auto mt-12">
        <div className="space-y-6 max-w-[28rem] mx-auto">
          {/* 标题和评分 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{item.title || "无标题"}</h3>

            {/* 查看全文按钮 */}
            <div className="mb-4">
              <div
                role="button"
                tabIndex={0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition"
                onClick={() =>
                  router.push(`/content-library/reader/${item.id}`)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/content-library/reader/${item.id}`);
                  }
                }}
              >
                <span className="text-xs font-medium">查看全文</span>
              </div>
            </div>

            {/* 质量评分 */}
            {aiResult?.content_quality_score != null && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  内容质量
                </label>
                <StarRating score={aiResult.content_quality_score} />
              </div>
            )}
          </div>

          {/* AI 摘要和关键要点 */}
          <div className="space-y-4">
            {/* 内容摘要 - 优先显示 AI 分析结果中的摘要 */}
            {(aiAnalysis?.summarizer?.summary ||
              aiAnalysis?.summarizer?.raw_text ||
              aiResult?.summary ||
              item.summary) && (
              <SummaryCard
                summary={
                  aiAnalysis?.summarizer?.summary ||
                  aiAnalysis?.summarizer?.raw_text ||
                  aiResult?.summary ||
                  item.summary
                }
              />
            )}

            {/* 关键要点 - 优先显示 AI 分析结果中的关键要点 */}
            {(aiAnalysis?.key_points_extractor?.key_points ||
              aiAnalysis?.key_points_extractor?.raw_text ||
              aiResult?.key_points) && (
              <KeyPointsCard
                keyPoints={
                  aiAnalysis?.key_points_extractor?.key_points ||
                  aiAnalysis?.key_points_extractor?.raw_text ||
                  aiResult?.key_points
                }
              />
            )}
          </div>

          {/* 标签 */}
          {aiResult?.labels && aiResult.labels.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-3">
                标签
              </label>
              <div className="flex flex-wrap gap-2">
                {aiResult.labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-base bg-muted text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 简短描述 */}
          <div className="space-y-4">
            {aiResult?.brief_description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  简短描述
                </label>
                <p className="text-sm leading-relaxed p-3 rounded-lg">
                  {aiResult.brief_description}
                </p>
              </div>
            )}
          </div>

          {/* AI 分析 - 其他分析内容 */}
          <AIAnalysisCard analysis={item.ai_analysis} />
        </div>
      </div>
    </div>
  );
};
