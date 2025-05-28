"use client";

import { useEffect, useState, memo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  AlertCircle,
  ExternalLink,
  Download,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { LLMAnalysisPanel } from "@/components/ui/llm-analysis-panel";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import VirtualScrollRenderer from "@/components/ui/VirtualScrollRenderer";

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
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded">
            <span className="text-sm font-medium">PDF Document</span>
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
          <div className="flex-1 border rounded">
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
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded">
            <span className="text-sm font-medium">Web Page</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(sourceUri, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Original
            </Button>
          </div>
          <div className="flex-1 border rounded">
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
      <div className="prose prose-sm max-w-none dark:prose-invert h-full overflow-auto">
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
          <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between p-3">
              <span className="text-sm font-medium">Processed Content</span>
              <span className="text-xs text-muted-foreground">
                Optimized rendering enabled
              </span>
            </div>
          </div>

          {/* 虚拟滚动渲染器 - 使用绝对定位 */}
          <div className="absolute top-[60px] left-0 right-0 bottom-0">
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
            <p className="text-sm text-gray-600">
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
      <div className="relative h-full">
        <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-medium">Processed Content</span>
            <span className="text-xs text-muted-foreground">
              Legacy rendering mode
            </span>
          </div>
        </div>

        <div className="absolute top-[60px] left-0 right-0 bottom-0 overflow-auto">
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

interface ReaderContentProps {
  params: Promise<{ id: string }>;
}

export const ReaderContent = ({ params }: ReaderContentProps) => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("processed"); // 默认选择processed
  const [contentId, setContentId] = useState<string | null>(null);

  // 解析参数
  useEffect(() => {
    params.then(({ id }) => {
      setContentId(id);
    });
  }, [params]);

  useEffect(() => {
    if (authLoading || !contentId) return;

    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchContentDetail() {
      try {
        setLoading(true);
        setError(null);

        const token = user?.token || getCookie("accessToken");
        if (!token) {
          setError("No authentication token found. Please log in again.");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Fetch content details
        const contentResponse = await fetch(
          `${apiUrl}/api/v1/content/${contentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!contentResponse.ok) {
          if (contentResponse.status === 404) {
            setError("Content not found.");
            return;
          }
          throw new Error(
            `HTTP ${contentResponse.status}: ${await contentResponse.text()}`,
          );
        }

        const contentData = await contentResponse.json();
        setContent(contentData);

        // 如果内容已处理完成，尝试获取 markdown 内容
        if (contentData.processing_status === "completed") {
          try {
            const markdownResponse = await fetch(
              `${apiUrl}/api/v1/content/${contentId}/markdown`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (markdownResponse.ok) {
              const markdownData = await markdownResponse.json();
              setMarkdownContent(markdownData.markdown_content);
            } else {
              console.warn(
                "Failed to fetch markdown content:",
                markdownResponse.status,
              );
            }
          } catch (markdownError) {
            console.warn("Error fetching markdown content:", markdownError);
            // 不设置错误，因为这不是致命错误
          }
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
  }, [contentId, user, authLoading, router]);

  if (authLoading || loading || !contentId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-lg">Loading content...</p>
        </div>
      </div>
    );
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
    <div className="space-y-6 h-screen overflow-hidden">
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
      </div>

      {/* Main Content */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] px-6"
        data-testid="reader-layout"
      >
        {/* Left Panel - Content Reading Area */}
        <div className="lg:col-span-2 space-y-4" data-testid="content-panel">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="h-full flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="processed">Processed</TabsTrigger>
                  <TabsTrigger value="original">Original</TabsTrigger>
                </TabsList>

                <TabsContent value="processed" className="flex-1 mt-4">
                  <ContentRenderer
                    content={content}
                    type="processed"
                    markdownContent={markdownContent}
                    contentId={contentId}
                  />
                </TabsContent>

                <TabsContent value="original" className="flex-1 mt-4">
                  <ContentRenderer
                    content={content}
                    type="original"
                    sourceUri={content.source_uri}
                    markdownContent={markdownContent}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - LLM Analysis */}
        <div className="lg:col-span-1" data-testid="llm-panel">
          <LLMAnalysisPanel
            contentId={contentId}
            contentText={
              content?.processed_content || content?.content_text || ""
            }
          />
        </div>
      </div>
    </div>
  );
};
