"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  FileText,
  Type,
  Upload,
  File,
  Plus,
  Trash2,
  AlertCircle,
  BookOpen,
  Camera,
  Film,
  FileImage,
  Paperclip,
  Globe,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { contentCache } from "@/lib/services/content-cache";
import { eventBus } from "@/lib/event-bus";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { extractAndNormalizeUrls } from "@/lib/utils";

// 更精致的基础组件
const Dialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/5 backdrop-blur-[3px] transition-all duration-300"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 transition-all duration-300 ease-out">
        {children}
      </div>
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
    default:
      "bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md",
    research:
      "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md",
    upload:
      "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
    destructive: "text-red-500 hover:text-red-700 hover:bg-red-50",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  const sizes = {
    default: "h-8 px-4 text-sm",
    sm: "h-6 px-3 text-xs",
    lg: "h-10 px-5 text-sm",
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg font-medium 
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20
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

// 增强的文件类型检测
const getFileType = (file: File) => {
  const { type, name } = file;
  const extension = name.split(".").pop()?.toLowerCase();

  // 图片类型
  if (type.startsWith("image/")) {
    return {
      category: "image",
      icon: FileImage,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
    };
  }

  // 视频类型
  if (type.startsWith("video/")) {
    return {
      category: "video",
      icon: Film,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-100",
    };
  }

  // PDF
  if (type.includes("pdf")) {
    return {
      category: "pdf",
      icon: FileText,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
    };
  }

  // 文档
  if (type.includes("word") || extension === "docx" || extension === "doc") {
    return {
      category: "document",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    };
  }

  // 文本
  if (type.includes("text") || extension === "txt" || extension === "md") {
    return {
      category: "text",
      icon: Type,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
    };
  }

  // 默认文件
  return {
    category: "file",
    icon: Paperclip,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-100",
  };
};

// URL提取 - 使用新的智能URL提取函数
const extractUrls = (text: string) => {
  return extractAndNormalizeUrls(text);
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
        description: "即将分析图片内容",
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
        description: "即将提取视频内容",
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
        description: "即将解析文档内容",
      };
    }

    return {
      type: "files",
      icon: Paperclip,
      label: `${files.length} 个文件`,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
      description: "即将处理文件",
    };
  }

  const trimmedText = text.trim();

  // URL检测 - 使用新的智能URL提取函数
  const urls = extractAndNormalizeUrls(trimmedText);
  if (urls && urls.length > 0) {
    return {
      type: "link",
      icon: Globe,
      label: `${urls.length} 个链接`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      description: "即将获取网页内容",
    };
  }

  // 研究需求检测 - 更智能的算法
  const researchPatterns = [
    /^(如何|怎么|怎样)/,
    /^(什么是|什么叫)/,
    /^(为什么|为何)/,
    /(分析|研究|调查|报告)/,
    /(趋势|发展|影响|前景)/,
    /(比较|对比|评估|判断)/,
    /[？?]$/,
  ];

  const isQuestion = trimmedText.includes("?") || trimmedText.includes("？");
  const isShortRequest =
    trimmedText.length < 150 && trimmedText.split("\n").length <= 3;
  const hasResearchPattern = researchPatterns.some((pattern) =>
    pattern.test(trimmedText),
  );

  if ((isQuestion || hasResearchPattern) && isShortRequest) {
    return {
      type: "research",
      icon: Search,
      label: "AI 研究",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      description: "即将进行深度研究分析",
    };
  }

  // 长文章检测
  if (text.length > 800) {
    return {
      type: "article",
      icon: BookOpen,
      label: "长文章",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
      description: "即将分析文章内容",
    };
  }

  // 多段落文本
  if (
    text.includes("\n") &&
    text.split("\n").filter((line) => line.trim()).length > 3
  ) {
    return {
      type: "multiline",
      icon: Type,
      label: "多段落文本",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
      description: "即将处理文本内容",
    };
  }

  // 默认文本
  return {
    type: "text",
    icon: Type,
    label: "文本内容",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-100",
    description: "即将保存文本",
  };
};

interface EnhancedAddContentDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function EnhancedAddContentDialog({
  open,
  onClose,
}: EnhancedAddContentDialogProps) {
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
  const detectedUrls = extractUrls(content);

  // 自适应高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = Math.max(scrollHeight, 100) + "px";
    }
  }, [content]);

  // 文件处理
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...newFiles]);
        setError("");
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
      setError("");
    }
  }, []);

  // 粘贴处理
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // 防止默认粘贴行为，我们手动处理
    e.preventDefault();

    const pastedText = e.clipboardData?.getData("text") || "";
    console.log("[粘贴事件] 原始粘贴数据:", pastedText);

    if (pastedText.trim()) {
      const trimmedText = pastedText.trim();
      console.log("[粘贴事件] 处理后的文本:", trimmedText);

      // 直接设置到textarea
      if (textareaRef.current) {
        textareaRef.current.value = trimmedText;
        // 触发React的onChange事件
        const event = new Event("input", { bubbles: true });
        textareaRef.current.dispatchEvent(event);
      }

      setContent(trimmedText);
      setError("");
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
      // 聚焦到文本框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, handleKeyDown, handlePaste]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* 主容器 - 固定尺寸，现代化设计 */}
      <div className="w-[600px] h-[420px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">添加内容</h2>
              <p className="text-xs text-gray-500">输入文本、链接或上传文件</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col p-6">
          {/* 内容类型提示 - 固定高度区域 */}
          <div className="h-12 flex items-center mb-4">
            {contentAnalysis && (
              <div
                className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300
                ${contentAnalysis.bgColor} ${contentAnalysis.borderColor}
              `}
              >
                <contentAnalysis.icon
                  className={`w-4 h-4 ${contentAnalysis.color}`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium ${contentAnalysis.color}`}
                  >
                    {contentAnalysis.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {contentAnalysis.description}
                  </span>
                </div>
                {isResearch && (
                  <div className="ml-2 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="w-3 h-3 text-blue-600" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="flex-1 min-h-[100px] max-h-[200px] mb-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                console.log("[onChange事件] 新值:", e.target.value);
                setContent(e.target.value);
              }}
              placeholder="输入研究主题、粘贴链接或文本内容..."
              className="w-full h-full p-4 bg-gray-50 rounded-xl border-0 outline-none resize-none text-gray-900 placeholder:text-gray-400 text-sm leading-relaxed transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
              style={{ minHeight: "100px" }}
            />
          </div>

          {/* 文件上传区域 */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-4 transition-all duration-200
              ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }
              ${files.length > 0 ? "border-gray-300 bg-gray-50" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file, index) => {
                  const fileType = getFileType(file);
                  return (
                    <div
                      key={index}
                      className={`
                      flex items-center gap-3 p-2 rounded-lg border
                      ${fileType.bgColor} ${fileType.borderColor}
                    `}
                    >
                      <fileType.icon className={`w-4 h-4 ${fileType.color}`} />
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="w-6 h-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
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
              className="mt-3 w-full h-8"
            >
              <Plus className="w-3 h-3 mr-2" />
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

          {/* 状态信息 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 底部操作区 */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-gray-200 rounded border flex items-center justify-center">
                  <span className="text-[8px] font-bold">⌘</span>
                </span>
                + Enter 快速添加
              </span>
              {isResearch && (
                <span className="flex items-center gap-1 text-blue-500">
                  <span className="w-3 h-3 bg-blue-200 rounded border flex items-center justify-center">
                    <span className="text-[8px] font-bold">⇧</span>
                  </span>
                  + 深度研究
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isProcessing}
              >
                取消
              </Button>

              {isResearch && (
                <Button
                  variant="research"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={
                    (!content.trim() && files.length === 0) || isProcessing
                  }
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      研究中
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      深度研究
                    </>
                  )}
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  (!content.trim() && files.length === 0) || isProcessing
                }
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    处理中
                  </>
                ) : (
                  <>
                    添加内容
                    <ArrowRight className="w-3 h-3" />
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
