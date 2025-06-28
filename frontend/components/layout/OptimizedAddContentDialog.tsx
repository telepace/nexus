"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  Link,
  FileText,
  Type,
  Upload,
  Image,
  Video,
  File,
  Plus,
  Trash2,
  Camera,
  Film,
  BookOpen,
  Paperclip,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { contentCache } from "@/lib/services/content-cache";
import { eventBus } from "@/lib/event-bus";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { extractAndNormalizeUrls } from "@/lib/utils";

// 极简基础组件
const Dialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/3 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const Button = ({
  children,
  variant = "default",
  className = "",
  onClick,
  disabled,
  size = "default",
}) => {
  const variants = {
    default: "bg-gray-900 text-white hover:bg-gray-800",
    research: "bg-blue-600 text-white hover:bg-blue-700",
    upload: "bg-green-600 text-white hover:bg-green-700",
    ghost: "text-gray-400 hover:text-gray-600",
    destructive: "text-red-500 hover:text-red-700 hover:bg-red-50",
  };

  const sizes = {
    default: "h-7 px-3 text-xs",
    sm: "h-6 px-2 text-xs",
    lg: "h-9 px-4 text-sm",
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg font-medium 
        transition-all duration-150 focus:outline-none
        disabled:opacity-50 disabled:pointer-events-none
        ${sizes[size]}
        ${variants[variant]} ${className}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// 内容项类型定义
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

// 文件类型检测
const getFileType = (file: File) => {
  const { type, name } = file;
  const extension = name.split(".").pop()?.toLowerCase();

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("word") || extension === "docx" || extension === "doc")
    return "document";
  if (type.includes("text") || extension === "txt" || extension === "md")
    return "text";
  return "file";
};

// 增强的内容分析系统
const analyzeContent = (text: string, files: File[] = []) => {
  if (!text.trim() && files.length === 0) return null;

  // 文件分析优先
  if (files.length > 0) {
    const fileTypes = files.map(getFileType);
    const categories = [...new Set(fileTypes.map((ft) => ft.category))];

    if (categories.includes("image")) {
      return {
        type: "images",
        icon: Camera,
        label: `${files.length} 张图片`,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-100",
      };
    }

    if (categories.includes("video")) {
      return {
        type: "videos",
        icon: Film,
        label: `${files.length} 个视频`,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-100",
      };
    }

    if (categories.includes("pdf") || categories.includes("document")) {
      return {
        type: "documents",
        icon: BookOpen,
        label: `${files.length} 个文档`,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-100",
      };
    }

    return {
      type: "files",
      icon: Paperclip,
      label: `${files.length} 个文件`,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
    };
  }

  const trimmedText = text.trim();

  // 检测链接 - 使用新的智能URL提取函数
  const urls = extractAndNormalizeUrls(trimmedText, true);
  if (urls && urls.length > 0) {
    return {
      type: "link",
      icon: Link,
      label: `${urls.length} 个链接`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
    };
  }

  // 检测研究需求
  const researchKeywords = [
    "如何",
    "什么",
    "为什么",
    "分析",
    "研究",
    "趋势",
    "发展",
    "影响",
    "比较",
    "评估",
    "调查",
    "报告",
  ];
  const isQuestion = trimmedText.includes("?") || trimmedText.includes("？");
  const isShortRequest =
    trimmedText.length < 100 && trimmedText.split("\n").length <= 2;
  const hasResearchKeywords = researchKeywords.some((keyword) =>
    trimmedText.includes(keyword),
  );

  if ((isQuestion || hasResearchKeywords) && isShortRequest) {
    return {
      type: "research",
      icon: Search,
      label: "Deep Research",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    };
  }

  // 检测长文章
  if (text.length > 500) {
    return {
      type: "article",
      icon: FileText,
      label: "长文章",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
    };
  }

  // 检测多行文本
  if (text.includes("\n") && text.split("\n").length > 3) {
    return {
      type: "multiline",
      icon: Type,
      label: "多行文本",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
    };
  }

  return {
    type: "text",
    icon: Type,
    label: "文本",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-100",
  };
};

interface OptimizedAddContentDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function OptimizedAddContentDialog({
  open,
  onClose,
}: OptimizedAddContentDialogProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { user } = useAuth();
  const { createContentProcessingNotification } = useGlobalNotificationStore();

  // 内容分析
  const contentAnalysis = analyzeContent(content, files);
  const isResearch = contentAnalysis?.type === "research";
  const detectedUrls = extractAndNormalizeUrls(content, true);

  // 自适应高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const scrollHeight = textarea.scrollHeight;
      const currentHeight = parseInt(textarea.style.height) || 100;

      if (scrollHeight > currentHeight) {
        const newHeight = Math.min(scrollHeight, 180);
        textarea.style.height = newHeight + "px";
      }
    }
  }, [content]);

  // 文件处理
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  // 粘贴处理
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // 防止默认粘贴行为，我们手动处理
    e.preventDefault();
    
    const pastedText = e.clipboardData?.getData("text") || "";
    console.log('[粘贴事件] 原始粘贴数据:', pastedText);
    
    if (pastedText.trim()) {
      const trimmedText = pastedText.trim();
      console.log('[粘贴事件] 处理后的文本:', trimmedText);
      
      // 直接设置到textarea
      if (textareaRef.current) {
        textareaRef.current.value = trimmedText;
        // 触发React的onChange事件
        const event = new Event('input', { bubbles: true });
        textareaRef.current.dispatchEvent(event);
      }
      
      setContent(trimmedText);
    }
  }, []);

  // 提交处理
  const handleSubmit = useCallback(async () => {
    if (!content.trim() && files.length === 0) return;

    setIsProcessing(true);
    setError("");

    try {
      const token = user?.token || getCookie("accessToken");
      if (!token) {
        setError("请先登录后再添加内容");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const newlyCreatedItems: ContentItemPublic[] = [];

      // 处理URLs
      if (detectedUrls.length > 0) {
        for (const url of detectedUrls) {
          const contentData = {
            type: "url",
            source_uri: url,
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
          newlyCreatedItems.push(createdItem);

          if (createdItem.processing_status === "processing") {
            createContentProcessingNotification(
              createdItem.id,
              createdItem.title || "处理网页内容",
              `正在分析来自 ${url} 的内容...`,
            );
          }
        }
      }

      // 处理文本内容
      if (
        content.trim() &&
        (detectedUrls.length === 0 ||
          content.replace(/https?:\/\/[^\s\n]+/g, "").trim().length > 50)
      ) {
        const contentData = {
          type: "text",
          content_text: content,
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
        newlyCreatedItems.push(createdItem);

        if (createdItem.processing_status === "processing") {
          createContentProcessingNotification(
            createdItem.id,
            createdItem.title || "处理文本内容",
            "正在分析文本内容...",
          );
        }
      }

      // 处理文件 (暂时提示)
      if (files.length > 0) {
        setError("文件上传功能正在开发中，敬请期待");
        return;
      }

      // 成功处理
      if (newlyCreatedItems.length > 0) {
        // 重置表单
        setContent("");
        setFiles([]);
        setError("");
        onClose();

        // 更新缓存和通知
        contentCache.clearContentList();
        newlyCreatedItems.forEach((item) => {
          eventBus.emit("contentCreated", item);
        });
      }
    } catch (error) {
      console.error("添加内容时发生错误:", error);
      setError(
        error instanceof Error ? error.message : "添加内容时发生错误，请重试",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    content,
    files,
    detectedUrls,
    user?.token,
    createContentProcessingNotification,
    onClose,
  ]);

  // 快捷键处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // 事件监听
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, handleKeyDown, handlePaste]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* 固定尺寸容器，避免跳动 */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-[580px] max-w-[90vw] min-h-[320px] flex flex-col overflow-hidden">
        {/* 固定头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-gray-900">添加内容</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主体区域 */}
        <div className="flex-1 flex flex-col p-5">
          {/* 内容类型提示 - 固定高度区域 */}
          <div className="h-10 flex items-center mb-3">
            {contentAnalysis && (
              <div
                className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200
                ${contentAnalysis.bgColor} ${contentAnalysis.borderColor}
              `}
              >
                <contentAnalysis.icon
                  className={`w-4 h-4 ${contentAnalysis.color}`}
                />
                <span
                  className={`text-sm font-medium ${contentAnalysis.color}`}
                >
                  {contentAnalysis.label}
                </span>
                {isResearch && (
                  <Zap className="w-3.5 h-3.5 text-blue-500 ml-1" />
                )}
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="flex-1 min-h-[120px] max-h-[200px] mb-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                console.log('[onChange事件] 新值:', e.target.value);
                setContent(e.target.value);
              }}
              placeholder="输入研究主题、粘贴链接或文本内容..."
              className="w-full h-full p-3 bg-gray-50 rounded-lg border-0 outline-none resize-none text-gray-900 placeholder:text-gray-400 text-sm leading-relaxed transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              style={{ minHeight: "120px" }}
            />
          </div>

          {/* 文件上传区域 */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 transition-all duration-200 mb-4
              ${isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {files.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getFileType(file) === "image" && (
                        <Image
                          className="w-4 h-4 text-purple-500 flex-shrink-0"
                          aria-label="图片文件"
                        />
                      )}
                      {getFileType(file) === "video" && (
                        <Video className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                      {(getFileType(file) === "pdf" ||
                        getFileType(file) === "document") && (
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      {getFileType(file) === "file" && (
                        <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs text-gray-400">
                  支持 PDF、Word、图片、视频等格式
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              {files.length > 0 ? "添加更多文件" : "选择文件"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 固定底部操作区 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {isResearch ? "⌘+⇧+Enter 深度研究" : "⌘+Enter 快速添加"}
            </span>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>

              {isResearch && (
                <Button
                  variant="research"
                  onClick={handleSubmit}
                  disabled={
                    (!content.trim() && files.length === 0) || isProcessing
                  }
                  className="gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
                      研究中
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      研究
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  (!content.trim() && files.length === 0) || isProcessing
                }
                className="gap-1"
              >
                {isProcessing ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
                    处理中
                  </>
                ) : (
                  <>
                    添加
                    <ArrowRight className="w-2.5 h-2.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
