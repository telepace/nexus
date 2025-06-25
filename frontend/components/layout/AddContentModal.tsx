"use client";

import { FC, useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, getCookie } from "@/lib/auth";
import { contentCache } from "@/lib/services/content-cache";
import { eventBus } from "@/lib/event-bus";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
}

type ContentType = "url" | "text" | "file" | null;

// 与内容库页面保持一致的公共内容项类型定义
interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title?: string | null;
  summary?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
  ai_analysis?: unknown | null;
}

/**
 * Add Content Modal component.
 *
 * This component provides a modal interface for users to add content in various forms such as URLs, text, or files.
 * It manages state for content type, input values, file selections, loading status, and error messages.
 * The component handles events like content changes, pasting, dragging, and form submission.
 * It also includes validation logic to determine the content type based on user input.
 *
 * @param open - A boolean indicating whether the modal is open or closed.
 * @param onClose - A callback function to handle closing the modal.
 */
export const AddContentModal: FC<AddContentModalProps> = ({
  open,
  onClose,
}) => {
  const [contentType, setContentType] = useState<ContentType>(null);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // 控制左侧视图："input"(默认) 或 "file" 上传视图
  const [view, setView] = useState<"input" | "file">("input");

  // Move useAuth to component top level
  const { user } = useAuth();

  // 全局通知Store
  const { createContentProcessingNotification } = useGlobalNotificationStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Checks if the provided text is a valid URL.
   */
  const isURL = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  // 处理内容变化
  const handleContentChange = useCallback((text: string) => {
    setContent(text);

    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    // Auto-detect URLs in the content
    const urls = text.match(urlRegex) || [];

    const validUrls = urls
      .map((url: string) => {
        // Remove trailing punctuation that might be captured by regex
        const cleanedUrl = url.replace(/[.,;:!?]+$/, "");
        return isURL(cleanedUrl) ? cleanedUrl : null;
      })
      .filter((url): url is string => url !== null);

    // 计算去除 URL 和空白后的剩余字符长度
    const nonUrlPartLength = text
      .replace(urlRegex, "")
      .replace(/\s+/g, "").length;

    if (validUrls.length > 0 && nonUrlPartLength <= 50) {
      // 输入几乎只包含链接（剩余文本不超过 50 个字符），按 URL 类型处理
      setDetectedUrls((prev) => {
        const allUrls = [...prev, ...validUrls];
        return Array.from(new Set(allUrls)); // 去重
      });
      setContentType("url");
      return;
    }

    // 其它情况按文本处理，不额外上传链接
    if (text.trim().length > 0) {
      setDetectedUrls([]); // 清空链接，作为纯文本处理
      setContentType("text");
    } else {
      setDetectedUrls([]);
      setContentType(null);
    }
  }, []);

  // 处理粘贴事件
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData?.getData("text") || "";
      if (pastedText.trim()) {
        handleContentChange(pastedText.trim());
      }
    },
    [handleContentChange],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        setSelectedFiles((prev) => [...prev, ...filesArray]);
        setContentType("file");
      }
    },
    [],
  );

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setContentType(null);
      }
      return newFiles;
    });
  }, []);

  // 移除URL
  const removeUrl = useCallback((index: number) => {
    setDetectedUrls((prev) => {
      const newUrls = prev.filter((_, i) => i !== index);
      if (newUrls.length === 0) {
        setContentType(null);
        setContent("");
      }
      return newUrls;
    });
  }, []);

  /**
   * Handles the submission of content addition with optimistic UI updates.
   * Creates content items and immediately closes modal for seamless experience.
   * Background processing and status updates are handled via SSE.
   */
  const handleAddContent = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      // Get token from user object or cookie (user is now available from component level)
      const token = user?.token || getCookie("accessToken");

      if (!token) {
        setError("请先登录后再添加内容。");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      // 用于收集已创建的内容项，便于后续一次性广播事件
      const newlyCreatedItems: ContentItemPublic[] = [];

      if (contentType === "url" && detectedUrls.length > 0) {
        // 处理URL类型内容
        for (const url of detectedUrls) {
          const contentData = {
            type: "url",
            source_uri: url,
            // title will be auto-extracted on backend
            summary: `从 ${url} 获取的网页内容`,
          };

          const response = await fetch(`${apiUrl}/api/v1/content/create`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(contentData),
            credentials: "include",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `创建内容失败: ${response.status}`,
            );
          }

          const createdItem: ContentItemPublic = await response.json();
          console.log("URL内容创建成功:", createdItem);
          newlyCreatedItems.push(createdItem);

          // 创建全局通知 - URL内容需要处理
          if (createdItem.processing_status === "processing") {
            createContentProcessingNotification(
              createdItem.id,
              createdItem.title || "处理网页内容",
              `正在分析来自 ${url} 的内容...`,
            );
          }
        }
      } else if (contentType === "text" && content.trim()) {
        // 处理文本类型内容
        const contentData = {
          type: "text",
          content_text: content,
          // title will be auto-extracted on backend
          summary:
            content.length > 100 ? content.substring(0, 100) + "..." : content,
        };

        const response = await fetch(`${apiUrl}/api/v1/content/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contentData),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `创建内容失败: ${response.status}`,
          );
        }

        const createdItem: ContentItemPublic = await response.json();
        console.log("文本内容创建成功:", createdItem);
        newlyCreatedItems.push(createdItem);

        // 创建全局通知 - 文本内容如果需要处理
        if (createdItem.processing_status === "processing") {
          createContentProcessingNotification(
            createdItem.id,
            createdItem.title || "处理文本内容",
            "正在分析文本内容...",
          );
        }
      } else if (contentType === "file" && selectedFiles.length > 0) {
        // 处理文件类型内容（暂时显示提示信息）
        setError("文件上传功能正在开发中，敬请期待。");
        return;
      } else {
        setError("请输入有效的内容。");
        return;
      }

      // 立即清空表单并关闭模态窗口 - 乐观UI更新
      resetForm();
      onClose();

      // 清除内容缓存，确保content-library页面能获取到最新数据
      contentCache.clearContentList();

      // 通过事件总线通知内容库页面及时更新
      newlyCreatedItems.forEach((item) => {
        eventBus.emit("contentCreated", item);
      });

      // Note: Content status updates will also be handled via SSE in the content library
      // 这里主动广播可以让用户立即看到新内容，无需等待SSE
    } catch (error) {
      console.error("添加内容时发生错误:", error);
      setError(
        error instanceof Error ? error.message : "添加内容时发生错误，请重试。",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    contentType,
    detectedUrls,
    content,
    selectedFiles,
    user,
    onClose,
    createContentProcessingNotification,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isLoading) {
        if (content || selectedFiles.length > 0 || detectedUrls.length > 0) {
          handleAddContent();
        }
      }
    },
    [content, selectedFiles, detectedUrls, isLoading, handleAddContent],
  );

  const resetForm = () => {
    setContentType(null);
    setContent("");
    setSelectedFiles([]);
    setDetectedUrls([]);
    setError("");
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // 监听快捷键
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, handleKeyDown]);

  // 监听粘贴事件
  useEffect(() => {
    if (open) {
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, handlePaste]);

  if (!open) {
    return null;
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300 ease-in-out">
        <AlertDialogHeader className="flex-shrink-0">
          <AlertDialogTitle className="text-xl">添加新内容</AlertDialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={handleCancel}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-4 md:px-6">
          {view === "input" && (
            <>
              {/* 文本/链接输入区域 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content-input">文本内容 / 链接</Label>
                  <Textarea
                    id="content-input"
                    role="textbox"
                    placeholder="粘贴链接或输入文本内容，支持多个链接同时添加。"
                    className="min-h-[120px] max-h-[120px] resize-none"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                  />
                </div>

                {/* 已检测到的链接显示 */}
                {contentType === "url" && detectedUrls.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>检测到的链接</Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {detectedUrls.map((url, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-muted p-2 rounded border border-muted"
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              <LinkIcon className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-sm">{url}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUrl(index)}
                              className="ml-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {contentType === "text" && (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">文本内容</Label>
                <Textarea
                  id="text-content"
                  role="textbox"
                  placeholder="输入您想要添加的文本内容"
                  className="min-h-[120px] max-h-[300px] resize-none"
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {content.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span>字符数: {content.length}</span>
                      {content.length > 5000 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          ⚠️ 内容较长，建议分段添加
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Title input removed; backend auto-extracts */}
            </div>
          )}

          {contentType === "file" && (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label>已选择的文件 ({selectedFiles.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="truncate text-sm block">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="ml-2 h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                        title="移除文件"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加更多文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="text-destructive text-sm bg-destructive/10 dark:bg-destructive/20 p-2 rounded-md">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            {error}
          </div>
        )}

        <AlertDialogFooter className="flex-shrink-0 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView(view === "input" ? "file" : "input")}
            disabled={isLoading}
          >
            {view === "input" ? "上传本地文件" : "输入链接 / 文本"}
          </Button>
          <AlertDialogAction
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-w-[4rem] bg-primary hover:bg-primary/90",
            )}
            onClick={handleAddContent}
            disabled={
              isLoading ||
              (!content &&
                selectedFiles.length === 0 &&
                detectedUrls.length === 0)
            }
          >
            {isLoading
              ? "处理中..."
              : `添加${contentType === "url" ? ` (${detectedUrls.length}个链接)` : contentType === "file" ? ` (${selectedFiles.length}个文件)` : ""}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
