"use client";

import { useEffect, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import VirtualScrollRenderer from "@/components/ui/VirtualScrollRenderer";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";
import { useReaderContext } from "@/components/layout/ReaderLayout";
import {
  contentApi,
  AIResult,
  ConversationListResponse,
} from "@/lib/api/content";
import { ContentItemPublic } from "@/app/content-library/types";

// 骨架屏组件
const ReaderSkeleton = () => {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white/50">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-8 bg-muted rounded"></div>
          <div>
            <div className="w-64 h-8 bg-muted rounded mb-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-5 bg-muted rounded"></div>
              <div className="w-16 h-5 bg-muted rounded"></div>
              <div className="w-20 h-5 bg-muted rounded"></div>
            </div>
          </div>
        </div>
        <div className="w-20 h-8 bg-muted rounded"></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-8">
        {/* Content Area Skeleton */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* 模拟文章内容的骨架 */}
          <div className="space-y-4">
            <div className="w-full h-6 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-4/5 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-4">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/4 h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-2/3 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-4">
            <div className="w-4/5 h-4 bg-muted rounded"></div>
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/5 h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContentDetail {
  id: string;
  type: string;
  title?: string | null;
  summary?: string | null;
  content_text?: string | null;
  processed_content?: string | null;
  source_uri?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

// 内容渲染器 - 专注于阅读体验
const ProcessedContentRenderer = memo(
  ({
    content,
    markdownContent,
    contentId,
  }: {
    content: ContentDetail;
    markdownContent?: string | null;
    contentId: string;
  }) => {
    const router = useRouter();

    // 优先使用虚拟滚动渲染
    if (contentId && content.processing_status === "completed") {
      return (
        <div className="relative h-full">
          {/* 内容类型指示器（隐藏） */}
          <div className="hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  AI 处理版本
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <FileText className="h-3 w-3" />
                <span>智能分段显示</span>
              </div>
            </div>
          </div>

          {/* 虚拟滚动渲染器 */}
          <div className="absolute inset-0 animate-in fade-in duration-300 delay-100">
            <VirtualScrollRenderer
              contentId={contentId}
              className="w-full h-full px-6 py-4"
              chunkSize={15}
              maxVisibleChunks={50}
            />
          </div>
        </div>
      );
    }

    // 回退到传统渲染
    const contentToRender =
      markdownContent || content.processed_content || content.content_text;

    if (!contentToRender) {
      return (
        <div className="flex justify-center items-center h-96 max-w-4xl mx-auto">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {content.processing_status === "completed"
                ? "内容暂不可用"
                : content.processing_status === "failed"
                  ? "内容处理失败"
                  : "内容正在处理中"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {content.processing_status === "completed"
                ? "处理后的内容暂不可用，请稍后再试"
                : content.processing_status === "failed"
                  ? "内容处理失败，可尝试重新处理"
                  : `当前状态：${content.processing_status}`}
            </p>
            {content.processing_status === "failed" && (
              <div className="flex justify-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      const apiUrl =
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://127.0.0.1:8000";
                      const token = getCookie("accessToken");
                      if (!token) {
                        throw new Error("未找到登录凭据");
                      }

                      const res = await fetch(
                        `${apiUrl}/api/v1/content/reprocess/${contentId}`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                        },
                      );

                      if (!res.ok) {
                        throw new Error("重新处理请求失败");
                      }

                      router.refresh();
                    } catch (err) {
                      console.error(err);
                      alert("重新处理请求失败，请稍后再试");
                    }
                  }}
                >
                  重新处理
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/content-library")}
                >
                  返回内容库
                </Button>
              </div>
            )}
            {content.processing_status !== "completed" &&
              content.processing_status !== "failed" && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-primary">
                    AI 正在处理内容...
                  </span>
                </div>
              )}
          </div>
        </div>
      );
    }

    // 优化的传统 markdown 渲染
    return (
      <div className="relative h-full animate-in fade-in duration-300">
        <div className="hidden">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                AI 处理版本
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <FileText className="h-3 w-3" />
              <span>标准渲染模式</span>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-auto animate-in fade-in duration-300 delay-100">
          {markdownContent ||
          contentToRender.includes("#") ||
          contentToRender.includes("**") ? (
            <MarkdownRenderer
              content={contentToRender}
              className="prose prose-sm max-w-[35rem] dark:prose-invert px-8 pyx-8 py-4 [&>*:first-child]:mt-0"
            />
          ) : (
            <div className="prose prose-sm max-w-[35rem] dark:prose-invert px-8 pyx-8 py-4 [&>*:first-child]:mt-0">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {contentToRender}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

ProcessedContentRenderer.displayName = "ProcessedContentRenderer";

interface ClientContentProps {
  contentId: string;
  initialData?: ContentDetail | null;
  initialMarkdown?: string | null;
}

export const ClientContent = ({
  contentId,
  initialData,
  initialMarkdown,
}: ClientContentProps) => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { onContentChange, onContentItemUpdate } = useReaderContext();

  const [content, setContent] = useState<ContentDetail | null>(
    initialData || null,
  );
  const [markdownContent, setMarkdownContent] = useState<string | null>(
    initialMarkdown || null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // 记录访问
  useEffect(() => {
    navigationState.saveReaderVisit(contentId);
  }, [contentId]);

  // 当内容加载完成后，通知 ReaderLayout 更新内容文本
  useEffect(() => {
    if (content && onContentChange) {
      const contentText =
        markdownContent ||
        content.processed_content ||
        content.content_text ||
        content.title ||
        "";
      onContentChange(contentText);
    }
  }, [content, markdownContent, onContentChange]);

  // 当内容加载完成后，通知 ReaderLayout 更新完整的内容项数据
  useEffect(() => {
    if (content && onContentItemUpdate) {
      // 将 ContentDetail 转换为 ContentItemPublic 格式
      const contentItem: Partial<ContentItemPublic> = {
        id: content.id,
        type: content.type,
        title: content.title,
        source_uri: content.source_uri,
        processing_status: content.processing_status,
        // 这些字段在新版本的 ReaderLayout 中会通过 contentApi.getContentItem 重新获取
        // 以确保包含 ai_result 和 ai_analysis 数据
      };
      onContentItemUpdate(contentItem as ContentItemPublic);
    }
  }, [content, onContentItemUpdate]);

  // 获取内容详情和markdown
  useEffect(() => {
    if (authLoading) return;

    if (!user?.token && !getCookie("accessToken")) {
      setError("未登录或登录已过期");
      return;
    }

    async function fetchContentDetail() {
      try {
        setLoading(true);
        setError(null);

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const token = user?.token || getCookie("accessToken");
        if (!token) {
          throw new Error("未找到登录凭据");
        }

        // 检查缓存
        contentCache.getContentDetail(contentId);
        contentCache.getMarkdownContent(contentId);

        const requests = [];

        if (!content) {
          requests.push(
            fetch(`${apiUrl}/api/v1/content/${contentId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            }),
          );
        }

        if (!markdownContent) {
          requests.push(
            fetch(`${apiUrl}/api/v1/content/${contentId}/markdown`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            }),
          );
        }

        if (requests.length === 0) return;

        const responses = await Promise.allSettled(requests);
        let contentResponse, markdownResponse;

        if (!content) {
          contentResponse = responses[0];
          markdownResponse = responses[1];
        } else {
          markdownResponse = responses[0];
        }

        // 处理内容详情请求结果
        if (
          contentResponse &&
          contentResponse.status === "fulfilled" &&
          contentResponse.value.ok
        ) {
          const contentData = await contentResponse.value.json();
          setContent(contentData);
          // 缓存内容详情
          contentCache.setContentDetail(contentId, contentData);
        } else if (contentResponse) {
          if (
            contentResponse.status === "fulfilled" &&
            contentResponse.value.status === 404
          ) {
            setError("内容未找到");
            return;
          }
          throw new Error(
            contentResponse.status === "fulfilled"
              ? `HTTP ${contentResponse.value.status}: ${await contentResponse.value.text()}`
              : "获取内容失败",
          );
        }

        // 处理markdown请求结果
        if (
          markdownResponse &&
          markdownResponse.status === "fulfilled" &&
          markdownResponse.value.ok
        ) {
          const markdownData = await markdownResponse.value.json();
          setMarkdownContent(markdownData.markdown_content);
          // 缓存markdown内容
          contentCache.setMarkdownContent(
            contentId,
            markdownData.markdown_content,
          );
        }
      } catch (error) {
        console.error("获取内容详情失败:", error);
        setError(error instanceof Error ? error.message : "获取内容详情失败");
      } finally {
        setLoading(false);
      }
    }

    fetchContentDetail();
  }, [contentId, user?.token, authLoading, content, markdownContent]);

  if (authLoading || loading) {
    return <ReaderSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>加载错误</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!content) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>内容未找到</AlertTitle>
        <AlertDescription>
          无法找到请求的内容，请检查链接是否正确。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b h-header">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/content-library")}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-medium truncate">
            {content.title || "Untitled"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {content.source_uri && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(content.source_uri!, "_blank")}
              title="查看原始内容"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - 专注显示AI处理后的内容 */}
      <div className="flex-1 min-h-0">
        <div className="h-full py-2">
          <ProcessedContentRenderer
            content={content}
            markdownContent={markdownContent}
            contentId={contentId}
          />
        </div>
      </div>
    </div>
  );
};
