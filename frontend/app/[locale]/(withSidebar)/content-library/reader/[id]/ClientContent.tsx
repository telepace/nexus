"use client";

import { useEffect, useState, memo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";
import { useReaderContext } from "@/components/layout/ReaderLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// 骨架屏组件 - 优化对比度和动画
const ReaderSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton - 统一高度 h-header */}
      <div className="flex items-center justify-between px-4 h-header border-b border-muted/40 bg-muted/10 backdrop-blur supports-[backdrop-filter]:bg-muted/40 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
          <div className="w-48 h-5 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
        </div>
        <div className="w-8 h-8 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
      </div>

      {/* Main Content Skeleton - 简化为2-3组，使用8px网格间距 */}
      <div className="flex-1 px-4 sm:px-6 lg:px-10 xl:px-14 py-8 space-y-6 max-w-none lg:max-w-4xl xl:max-w-5xl mx-0 w-full">
        <div className="space-y-4">
          <div className="w-full h-4 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
          <div className="w-5/6 h-4 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
          <div className="w-full h-4 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="w-4/5 h-4 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
          <div className="w-full h-4 bg-muted/30 dark:bg-muted/20 rounded animate-pulse"></div>
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

    // 智能选择渲染器：根据内容大小决定使用简单渲染还是分块渲染
    const contentText =
      markdownContent || content.processed_content || content.content_text;

    // 设置阈值：内容超过 50KB 或预估超过 30 个chunks 时使用虚拟滚动
    const CONTENT_SIZE_THRESHOLD = 50 * 1024; // 50KB
    const shouldUseVirtualScroll =
      contentText &&
      (contentText.length > CONTENT_SIZE_THRESHOLD ||
        contentText.split("\n\n").length > 30); // 粗略估算段落数

    // 临时修复：强制使用markdown渲染器，避免chunks API问题
    console.log("🔍 ProcessedContentRenderer 调试信息:", {
      contentId,
      processing_status: content.processing_status,
      contentTextLength: contentText?.length || 0,
      shouldUseVirtualScroll,
      hasMarkdownContent: !!markdownContent,
      hasProcessedContent: !!content.processed_content,
      hasContentText: !!content.content_text,
    });

    // 完整内容可用且需要虚拟滚动时，使用 SeamlessContentRenderer
    // 临时注释掉，强制使用markdown渲染
    /*
    if (
      contentId &&
      content.processing_status === "completed" &&
      shouldUseVirtualScroll
    ) {
      return (
        <div className="flex justify-center w-full py-4">
          <SeamlessContentRenderer
            contentId={contentId}
            className="w-full max-w-[35rem]"
            initialChunkSize={15}
            enableTextSelection={true}
            onTextAction={onTextAction}
          />
        </div>
      );
    }
    */

    // 小文档或中等文档：使用增强阅读器，支持引用跳转
    if (contentText) {
      return (
        <div className="flex justify-center w-full py-4">
          <div className="w-full max-w-[35rem]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {/* 修复ReactMarkdown的className问题 */}
              <div className="markdown-content prose prose-base max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    // 自定义组件样式，而不是使用className
                    h1: ({ ...props }) => (
                      <h1 className="text-2xl font-bold mb-4" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h2 className="text-xl font-semibold mb-3" {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <h3 className="text-lg font-semibold mb-2" {...props} />
                    ),
                    p: ({ ...props }) => (
                      <p className="mb-3 leading-relaxed" {...props} />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground"
                        {...props}
                      />
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline =
                        !className || !className.includes("language-");
                      return isInline ? (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code
                          className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    ul: ({ ...props }) => (
                      <ul className="list-disc ml-6 mb-4" {...props} />
                    ),
                    ol: ({ ...props }) => (
                      <ol className="list-decimal ml-6 mb-4" {...props} />
                    ),
                    li: ({ ...props }) => (
                      <li className="mb-1" {...props} />
                    ),
                  }}
                >
                  {contentText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 内容不可用的处理
    if (!contentText) {
      return (
        <div className="flex justify-center items-center h-96 max-w-none lg:max-w-4xl xl:max-w-5xl mx-auto px-8">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground/60 mx-auto mb-6" />
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              {content.processing_status === "completed"
                ? "内容暂不可用"
                : content.processing_status === "failed"
                  ? "内容处理失败"
                  : "内容正在处理中"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
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
                  className="transition-all duration-200 ease-out hover:shadow-md"
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

                      // 智能错误处理
                      let errorMessage = "重新处理请求失败";
                      let suggestion = "请稍后再试";

                      if (err instanceof Error) {
                        const errorStr = err.message.toLowerCase();

                        if (
                          errorStr.includes("not bound to a session") ||
                          errorStr.includes("数据库连接问题")
                        ) {
                          errorMessage = "系统数据库连接异常";
                          suggestion =
                            "请刷新页面后重试，如果问题持续存在请联系技术支持";
                        } else if (
                          errorStr.includes("未找到登录凭据") ||
                          errorStr.includes("unauthorized")
                        ) {
                          errorMessage = "登录状态已过期";
                          suggestion = "请重新登录后重试";
                          // 可以选择自动跳转到登录页
                          setTimeout(() => router.push("/login"), 2000);
                        } else if (
                          errorStr.includes("403") ||
                          errorStr.includes("forbidden")
                        ) {
                          errorMessage = "权限不足";
                          suggestion = "您没有权限重新处理此内容";
                        } else if (
                          errorStr.includes("404") ||
                          errorStr.includes("not found")
                        ) {
                          errorMessage = "内容不存在";
                          suggestion = "此内容可能已被删除，请返回内容库查看";
                        } else if (
                          errorStr.includes("500") ||
                          errorStr.includes("internal")
                        ) {
                          errorMessage = "服务器内部错误";
                          suggestion =
                            "服务器正在处理问题，请稍后重试或联系技术支持";
                        } else if (
                          errorStr.includes("network") ||
                          errorStr.includes("fetch")
                        ) {
                          errorMessage = "网络连接问题";
                          suggestion = "请检查网络连接后重试";
                        }
                      }

                      // 使用更友好的提示方式
                      if (typeof window !== "undefined" && window.confirm) {
                        const retry = window.confirm(
                          `${errorMessage}。${suggestion}\n\n点击"确定"返回内容库，点击"取消"稍后重试。`,
                        );
                        if (retry) {
                          router.push("/content-library");
                        }
                      } else {
                        alert(`${errorMessage}。${suggestion}`);
                      }
                    }
                  }}
                >
                  再试一次
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-all duration-200 ease-out hover:shadow-md"
                  onClick={() => router.push("/content-library")}
                >
                  返回内容库
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="transition-all duration-200 ease-out text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    // 这里可以添加反馈功能
                    alert("反馈功能即将推出");
                  }}
                >
                  反馈问题
                </Button>
              </div>
            )}
            {content.processing_status !== "completed" &&
              content.processing_status !== "failed" && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">
                    AI 正在处理内容...
                  </span>
                </div>
              )}
          </div>
        </div>
      );
    }

    // 默认返回空内容（不应该到达这里）
    return null;
  },
);

ProcessedContentRenderer.displayName = "ProcessedContentRenderer";

interface ClientContentProps {
  contentId: string;
  initialData?: ContentDetail | null;
  initialMarkdown?: string | null;
}

// 阅读进度条组件
const ReadingProgress = ({
  targetRef,
}: { targetRef: React.RefObject<HTMLDivElement> }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      if (!targetRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = targetRef.current;
      const totalScrollable = scrollHeight - clientHeight;

      if (totalScrollable <= 0) {
        setProgress(0);
        return;
      }

      const currentProgress = (scrollTop / totalScrollable) * 100;
      setProgress(Math.min(100, Math.max(0, currentProgress)));
    };

    const target = targetRef.current;
    if (!target) return;

    target.addEventListener("scroll", updateProgress);
    updateProgress(); // 初始计算

    return () => target.removeEventListener("scroll", updateProgress);
  }, [targetRef]);

  return (
    <div
      className="absolute bottom-0 left-0 h-0.5 bg-primary/60 transition-[width] duration-200 ease-out"
      style={{ width: `${progress}%` }}
    />
  );
};

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

  // 添加滚动容器引用用于进度条
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 处理文本选择操作
  const handleTextAction = useCallback(
    (
      action: { id: string; label: string; prompt: string },
      selectedText: string,
    ) => {
      console.log(`文本操作: ${action.label}`, { action, selectedText });

      // 这里可以将选择的文本和操作发送给右侧的AI分析系统
      // 通过事件总线或上下文传递给 ReaderLayout
      const event = new CustomEvent("textSelectionAction", {
        detail: {
          action,
          selectedText,
          contentId,
        },
      });
      window.dispatchEvent(event);

      // 可以考虑添加 toast 提示
      // toast({
      //   title: `${action.label}操作`,
      //   description: `已选择文本: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`,
      // });
    },
    [contentId],
  );

  // 记录访问
  useEffect(() => {
    navigationState.saveReaderVisit(contentId);
  }, [contentId]);

  // 当内容加载完成后，通知parent组件内容已变化
  useEffect(() => {
    if (content && onContentChange) {
      onContentChange();
    }
  }, [content, markdownContent, onContentChange]);

  // 当内容加载完成后，通知 ReaderLayout 更新完整的内容项数据
  // 🎯 修复：移除onContentItemUpdate依赖，避免重复触发
  useEffect(() => {
    if (content && onContentItemUpdate) {
      // 将 ContentDetail 转换为 ContentItemPublic 格式
      const contentItem = {
        id: content.id,
        type: content.type,
        title: content.title || "Untitled", // 确保title不为null
        source_uri: content.source_uri,
        processing_status: content.processing_status,
        user_id: content.user_id,
        created_at: content.created_at,
        updated_at: content.updated_at,
        content_text: content.content_text,
        // 这些字段在新版本的 ReaderLayout 中会通过 contentApi.getContentItem 重新获取
        // 以确保包含 ai_result 和 ai_analysis 数据
      };
      onContentItemUpdate(contentItem);
    }
  }, [content?.id, content?.title, content?.processing_status]); // 🎯 只依赖关键字段，避免函数依赖

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
      {/* Header - 优化高度、背景和间距 */}
      <div className="flex items-center justify-between px-6 border-b border-border backdrop-blur supports-[backdrop-filter]:linear-bg-1/95 shadow-sm h-header relative">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/content-library")}
            className="hover:bg-muted/60 dark:hover:bg-muted/40 transition-all duration-200 ease-out hover:translate-x-0.5"
            title="返回内容库"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            breadcrumbs={[
              { label: "Library", href: "/content-library" },
              { label: content.title || "Untitled" },
            ]}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-2">
          {content.source_uri && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(content.source_uri!, "_blank")}
              className="hover:bg-muted/60 dark:hover:bg-muted/40 transition-all duration-200 ease-out hover:scale-105"
              title="在新标签打开原文"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 阅读进度条 */}
        <ReadingProgress targetRef={scrollContainerRef} />
      </div>

      {/* Main Content - 专注显示AI处理后的内容 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-background"
      >
        {content && (
          <ProcessedContentRenderer
            content={content}
            markdownContent={markdownContent}
            contentId={contentId}
            onTextAction={handleTextAction}
          />
        )}
      </div>
    </div>
  );
};
