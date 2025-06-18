"use client";

import { useEffect, useState, memo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import VirtualScrollRenderer from "@/components/ui/VirtualScrollRenderer";
import { ShareContentModal } from "@/components/share/ShareContentModal";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";

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
        {/* Tabs Skeleton */}
        <div className="flex space-x-1 mb-4">
          <div className="w-24 h-10 bg-muted rounded"></div>
          <div className="w-20 h-10 bg-muted rounded"></div>
        </div>

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

// 懒加载的原始内容组件
const LazyOriginalContent = memo(
  ({
    content,
    sourceUri,
  }: {
    content: ContentDetail;
    sourceUri?: string | null;
  }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // 模拟加载延迟，避免立即渲染重型内容
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading original content...</p>
          </div>
        </div>
      );
    }

    if (content.type === "pdf" && sourceUri) {
      return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded animate-in slide-in-from-top duration-200">
            <span className="text-small">PDF Document</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(sourceUri, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Original
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = sourceUri;
                  link.download = content.title || "document.pdf";
                  link.click();
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex-1 border rounded animate-in fade-in duration-300 delay-100">
            <iframe
              src={`${sourceUri}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              title="PDF Viewer"
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    if (content.type === "url" && sourceUri) {
      return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded animate-in slide-in-from-top duration-200">
            <span className="text-small">Web Page</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(sourceUri, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Original
            </Button>
          </div>
          <div className="flex-1 border rounded animate-in fade-in duration-300 delay-100">
            <iframe
              src={sourceUri}
              className="w-full h-full"
              title="Web Page"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    // 默认文本渲染
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert h-full overflow-auto animate-in fade-in duration-300">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content.content_text || "Original content not available"}
        </div>
      </div>
    );
  },
);

LazyOriginalContent.displayName = "LazyOriginalContent";

// 优化的内容渲染器
const ContentRenderer = memo(
  ({
    content,
    type,
    sourceUri,
    markdownContent,
    contentId,
  }: {
    content: ContentDetail;
    type: "original" | "processed";
    sourceUri?: string | null;
    markdownContent?: string | null;
    contentId?: string;
  }) => {
    if (type === "original") {
      return (
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Loading original content...</p>
              </div>
            </div>
          }
        >
          <LazyOriginalContent content={content} sourceUri={sourceUri} />
        </Suspense>
      );
    }

    // Processed content - 优先使用虚拟滚动渲染
    if (
      type === "processed" &&
      contentId &&
      content.processing_status === "completed"
    ) {
      return (
        <div className="relative h-full">
          {/* 渲染模式切换 */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between p-3">
              <span className="text-small">Processed Content</span>
              <span className="text-xs text-muted-foreground">
                Optimized rendering enabled
              </span>
            </div>
          </div>

          {/* 虚拟滚动渲染器 - 使用绝对定位 */}
          <div className="absolute top-[60px] left-0 right-0 bottom-0 animate-in fade-in duration-300 delay-100">
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

    // 回退到传统渲染（向后兼容）
    const contentToRender =
      markdownContent || content.processed_content || content.content_text;

    if (!contentToRender) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {content.processing_status === "completed"
                ? "Processed content not available"
                : `Content is being processed. Status: ${content.processing_status}`}
            </p>
          </div>
        </div>
      );
    }

    // 传统 markdown 渲染（作为回退）
    return (
      <div className="relative h-full animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between p-3">
            <span className="text-small">Processed Content</span>
            <span className="text-xs text-muted-foreground">
              Legacy rendering mode
            </span>
          </div>
        </div>

        <div className="absolute top-[60px] left-0 right-0 bottom-0 overflow-auto animate-in fade-in duration-300 delay-100">
          {markdownContent ||
          contentToRender.includes("#") ||
          contentToRender.includes("**") ? (
            <MarkdownRenderer
              content={contentToRender}
              className="prose prose-sm max-w-none dark:prose-invert p-4"
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert p-4">
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

ContentRenderer.displayName = "ContentRenderer";

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

  const [content, setContent] = useState<ContentDetail | null>(
    initialData || null,
  );
  const [markdownContent, setMarkdownContent] = useState<string | null>(
    initialMarkdown || null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("processed"); // 默认选择processed

  // 添加分享状态管理
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 记录访问
  useEffect(() => {
    navigationState.saveReaderVisit(contentId);
  }, [contentId]);

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
    <div className="h-full flex flex-col p-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/content-library")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {content.title || "Untitled"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{content.type.toUpperCase()}</Badge>
              <Badge variant="secondary">{content.processing_status}</Badge>
              {content.source_uri && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(content.source_uri!, "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Source
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 添加右侧操作区域 */}
        <div className="flex items-center gap-2">
          {content?.processing_status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              title="分享内容"
            >
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - 现在占据剩余空间 */}
      <div className="flex-1 p-6 min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full max-w-[12rem] grid-cols-2">
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="original">Original</TabsTrigger>
          </TabsList>

          <TabsContent value="processed" className="flex-1 mt-4 min-h-0">
            <ContentRenderer
              content={content}
              type="processed"
              markdownContent={markdownContent}
              contentId={contentId}
            />
          </TabsContent>

          <TabsContent value="original" className="flex-1 mt-4 min-h-0">
            <ContentRenderer
              content={content}
              type="original"
              sourceUri={content.source_uri}
              markdownContent={markdownContent}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 分享弹窗 */}
      {content && (
        <ShareContentModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          contentItem={{
            id: content.id,
            title: content.title || "Untitled",
            content_text: content.content_text,
            user_id: content.user_id,
            type: content.type,
            processing_status: content.processing_status,
            created_at: content.created_at,
            updated_at: content.updated_at,
          }}
        />
      )}
    </div>
  );
};
