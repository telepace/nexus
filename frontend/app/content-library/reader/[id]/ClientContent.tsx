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
import { useAuth, getCookie } from "@/lib/auth";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import VirtualScrollRenderer from "@/components/ui/VirtualScrollRenderer";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";
import { useReaderContext } from "@/components/layout/ReaderLayout";

// 骨架屏组件
const ReaderSkeleton = () => {
  return (
    <div className="h-full flex flex-col p-2 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
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
      <div className="flex-1 p-6">
        {/* Content Area Skeleton */}
        <div className="space-y-4">
          {/* 模拟文章内容的骨架 */}
          <div className="space-y-3">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-4/5 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-3">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/4 h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-2/3 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-3">
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

// 优化的内容渲染器 - 专注于处理后的内容
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
    // 优先使用虚拟滚动渲染
    if (contentId && content.processing_status === "completed") {
      return (
        <div className="relative h-full">
          {/* 内容类型指示器 */}
          <div className="hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  AI 处理版本
                </span>
                {/* Removed '优化渲染已启用' for cleaner UI */}
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
              className="w-full h-full"
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
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {content.processing_status === "completed"
                ? "处理后的内容暂不可用"
                : `内容正在处理中，状态：${content.processing_status}`}
            </p>
            {content.processing_status !== "completed" && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-primary">AI 正在处理内容...</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 传统 markdown 渲染
    return (
      <div className="relative h-full animate-in fade-in duration-300">
        <div className="hidden">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                AI 处理版本
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                标准渲染模式
              </span>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-auto animate-in fade-in duration-300 delay-100">
          {markdownContent ||
          contentToRender.includes("#") ||
          contentToRender.includes("**") ? (
            <MarkdownRenderer
              content={contentToRender}
              className="prose prose-sm max-w-none dark:prose-invert px-8 py-4 [&>*:first-child]:mt-0"
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert px-8 py-4 [&>*:first-child]:mt-0">
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
  const { onContentChange } = useReaderContext();

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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // 如果已有初始数据，不需要重新获取
    if (initialData && initialMarkdown) {
      console.log(`⚡ 使用服务器端预加载数据: ${initialData.title}`);
      return;
    }

    async function fetchContentDetail() {
      try {
        // 先尝试从缓存获取数据
        const cachedContent = contentCache.getContentDetail(contentId);
        const cachedMarkdown = contentCache.getMarkdownContent(contentId);

        if (cachedContent && !initialData) {
          console.log(`⚡ 从缓存快速加载内容: ${cachedContent.title}`);
          setContent(cachedContent);
          if (cachedMarkdown) {
            setMarkdownContent(cachedMarkdown);
            console.log(`⚡ 从缓存快速加载Markdown内容`);
          }
          setLoading(false);
          // 检查内容是否需要更新（简单的时间戳检查）
          const cacheTime = Date.now() - 2 * 60 * 1000; // 2分钟
          const contentUpdated = new Date(cachedContent.updated_at).getTime();
          if (contentUpdated > cacheTime) {
            console.log(`✅ 缓存内容较新，无需重新获取`);
            return;
          }
        } else if (!initialData) {
          console.log(`🔄 缓存未命中，从服务器获取内容: ${contentId}`);
          setLoading(true);
        }

        setError(null);

        const token = user?.token || getCookie("accessToken");
        if (!token) {
          setError("No authentication token found. Please log in again.");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // 并行请求内容详情和markdown内容
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
            setError("Content not found.");
            return;
          }
          throw new Error(
            contentResponse.status === "fulfilled"
              ? `HTTP ${contentResponse.value.status}: ${await contentResponse.value.text()}`
              : "Failed to fetch content",
          );
        }

        // 处理markdown内容请求结果
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
        } else if (markdownResponse) {
          console.warn(
            "Failed to fetch markdown content:",
            markdownResponse.status === "fulfilled"
              ? markdownResponse.value.status
              : "Request failed",
          );
        }
      } catch (e: unknown) {
        console.error("Error fetching content:", e);
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred while fetching content.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchContentDetail();
  }, [
    contentId,
    user,
    authLoading,
    router,
    initialData,
    initialMarkdown,
    content,
    markdownContent,
  ]);

  if (authLoading || loading) {
    return <ReaderSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Content</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!content) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Content Not Found</AlertTitle>
        <AlertDescription>
          The requested content could not be found.
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
