"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  LinkIcon,
  FileText,
  Type,
  Upload,
  Image,
  Video,
  File,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { contentCache } from "@/lib/services/content-cache";
import { eventBus } from "@/lib/event-bus";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { toast } from "sonner";

// 极简基础组件 - 基于参考设计，加入 Fade & Scale 动效
const Dialog = ({ children, open, onOpenChange }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onTap={() => onOpenChange(false)}
          />
          {/* 内容容器 */}
          <motion.div
            style={{
              position: "relative",
              zIndex: 10,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    research:
      "bg-[oklch(var(--chart-1))] text-primary-foreground hover:bg-[oklch(var(--chart-1))]/90",
    upload:
      "bg-[oklch(var(--chart-2))] text-primary-foreground hover:bg-[oklch(var(--chart-2))]/90",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
    destructive:
      "text-destructive hover:text-destructive hover:bg-destructive/10",
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
        transition-all duration-150 focus:outline-none focus-ring
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

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
}

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

// 增强的内容分析 - 基于参考代码的分析逻辑
const analyzeContent = (text: string, files: File[] = []) => {
  if (!text.trim() && files.length === 0) return null;

  // 优先分析文件
  if (files.length > 0) {
    const fileTypes = files.map(getFileType);
    const uniqueTypes = [...new Set(fileTypes)];

    if (uniqueTypes.includes("image")) {
      return {
        type: "images",
        icon: Image,
        label: `${files.length} 张图片`,
        color: "text-[oklch(var(--chart-4))]",
        bgColor: "bg-accent",
        borderColor: "border-border",
      };
    }

    if (uniqueTypes.includes("video")) {
      return {
        type: "videos",
        icon: Video,
        label: `${files.length} 个视频`,
        color: "text-[oklch(var(--chart-5))]",
        bgColor: "bg-accent",
        borderColor: "border-border",
      };
    }

    if (uniqueTypes.includes("pdf") || uniqueTypes.includes("document")) {
      return {
        type: "documents",
        icon: FileText,
        label: `${files.length} 个文档`,
        color: "text-[oklch(var(--chart-1))]",
        bgColor: "bg-accent",
        borderColor: "border-border",
      };
    }

    return {
      type: "files",
      icon: File,
      label: `${files.length} 个文件`,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-border",
    };
  }

  const trimmedText = text.trim();

  // 检测链接
  const urlRegex = /https?:\/\/[^\s\n]+/g;
  const urls = text.match(urlRegex);
  if (urls && urls.length > 0) {
    return {
      type: "link",
      icon: LinkIcon,
      label: `${urls.length} 个链接`,
      color: "text-[oklch(var(--chart-2))]",
      bgColor: "bg-accent",
      borderColor: "border-border",
    };
  }

  // 检测研究需求 - 增强的关键词
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
      color: "text-[oklch(var(--chart-1))]",
      bgColor: "bg-accent",
      borderColor: "border-border",
    };
  }

  // 检测长文章
  if (text.length > 500) {
    return {
      type: "article",
      icon: FileText,
      label: "长文章",
      color: "text-[oklch(var(--chart-4))]",
      bgColor: "bg-accent",
      borderColor: "border-border",
    };
  }

  // 检测多行文本
  if (text.includes("\n") && text.split("\n").length > 3) {
    return {
      type: "multiline",
      icon: Type,
      label: "多行文本",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-border",
    };
  }

  return {
    type: "text",
    icon: Type,
    label: "文本",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  };
};

// URL检测和提取
const isURL = (text: string) => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

const extractUrls = (text: string) => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = text.match(urlRegex) || [];

  return urls
    .map((url: string) => {
      const cleanedUrl = url.replace(/[.,;:!?]+$/, "");
      return isURL(cleanedUrl) ? cleanedUrl : null;
    })
    .filter((url): url is string => url !== null);
};

/**
 * 优化重构的添加内容模态框组件
 *
 * 基于参考代码的设计风格和技巧进行重构：
 * - 固定尺寸容器，避免界面跳动
 * - 智能内容分析和类型检测
 * - 统一的视觉语言和交互体验
 * - 优化的文件拖拽和上传流程
 * - 增强的Deep Research支持
 */
export const AddContentModal: React.FC<AddContentModalProps> = ({
  open,
  onClose,
}) => {
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [researchConfig, setResearchConfig] = useState({
    depth: 3,
    breadth: 2,
  });
  const [showResearchConfig, setShowResearchConfig] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { user } = useAuth();
  const { createContentProcessingNotification } = useGlobalNotificationStore();

  // 内容分析
  const contentAnalysis = analyzeContent(content, selectedFiles);
  const isResearch = contentAnalysis?.type === "research";
  const detectedUrls = extractUrls(content);

  // 自适应高度 - 固定高度，避免跳动
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const scrollHeight = textarea.scrollHeight;
      const currentHeight = parseInt(textarea.style.height) || 120;

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
        const filesArray = Array.from(e.target.files);
        setSelectedFiles((prev) => [...prev, ...filesArray]);
      }
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDropFiles = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  // 粘贴处理
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // 阻止浏览器默认插入行为，避免出现重复粘贴内容
    e.preventDefault();

    const pastedText = e.clipboardData?.getData("text") || "";
    if (pastedText.trim()) {
      // 直接设置内容，替代浏览器默认行为
      setContent(pastedText.trim());
    }
  }, []);

  // Deep Research API调用
  const createDeepResearchJob = useCallback(
    async (query: string, token: string) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const researchData = {
        query: query.trim(),
        depth: researchConfig.depth,
        breadth: researchConfig.breadth,
      };

      console.log("🔍 创建Deep Research任务:", researchData);

      const response = await fetch(`${apiUrl}/api/v1/deep-research/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(researchData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Deep Research API错误:", errorData);

        let errorMessage = `深度研究任务创建失败 (${response.status})`;
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Deep Research任务创建成功:", result);
      return result;
    },
    [researchConfig],
  );

  // 提交处理（立刻关闭窗口，后台异步执行）
  const handleSubmit = useCallback(() => {
    if (!content.trim() && selectedFiles.length === 0) return;

    // 显示"正在上传"提示，立即反馈给用户
    const previewText =
      content.length > 30
        ? content.slice(0, 30) + "…"
        : content || (detectedUrls[0] ?? "内容");
    const loadingToastId = toast.loading(`正在上传: ${previewText}`);

    // 立即关闭 Modal，实现"秒关窗"体验
    onClose();

    // 捕获当前输入，避免后续状态变化
    const contentSnapshot = content;
    const filesSnapshot = [...selectedFiles];
    const urlsSnapshot = [...detectedUrls];
    const isResearchSnapshot = isResearch;

    // fire-and-forget：后台执行原本的上传逻辑，但不再操作本组件状态
    (async () => {
      try {
        const token = user?.token || getCookie("accessToken");
        if (!token) {
          toast.error("请先登录后再添加内容");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const newlyCreatedItems: ContentItemPublic[] = [];

        // 处理Deep Research类型
        if (
          isResearchSnapshot &&
          contentSnapshot.trim() &&
          urlsSnapshot.length === 0
        ) {
          try {
            const researchResult = await createDeepResearchJob(
              contentSnapshot.trim(),
              token,
            );

            // 显示成功消息
            createContentProcessingNotification(
              researchResult.job_id,
              "深度研究任务",
              `正在深度研究:"${contentSnapshot.trim().substring(0, 50)}${contentSnapshot.trim().length > 50 ? "..." : ""}"`,
            );

            return; // 对于深度研究，直接返回，不继续处理其他内容
          } catch (researchError) {
            console.error(
              "Deep Research失败，回退到普通文本处理:",
              researchError,
            );
            toast.error(
              `深度研究失败: ${researchError instanceof Error ? researchError.message : "未知错误"}。将作为普通文本处理。`,
            );
            // 继续作为普通文本处理，不return
          }
        }

        // 处理URLs
        if (urlsSnapshot.length > 0) {
          for (const url of urlsSnapshot) {
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

        // 处理文本内容 - 更智能的判断逻辑
        if (
          contentSnapshot.trim() &&
          (urlsSnapshot.length === 0 ||
            contentSnapshot.replace(/https?:\/\/[^\s\n]+/g, "").trim().length >
              50)
        ) {
          const contentData = {
            type: "text",
            content_text: contentSnapshot,
            summary:
              contentSnapshot.length > 100
                ? contentSnapshot.substring(0, 100) + "..."
                : contentSnapshot,
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
        if (filesSnapshot.length > 0) {
          toast.error("文件上传功能正在开发中，敬请期待");
          return;
        }

        // 成功处理 - 乐观UI更新
        if (newlyCreatedItems.length > 0) {
          contentCache.clearContentList();
          newlyCreatedItems.forEach((item) => {
            eventBus.emit("contentCreated", item);
          });
        }
      } catch (error) {
        console.error("添加内容时发生错误:", error);
        toast.error(
          error instanceof Error ? error.message : "添加内容时发生错误，请重试",
        );
      } finally {
        // 无论成功还是失败，关闭"正在上传"提示
        toast.dismiss(loadingToastId);
      }
    })();
  }, [
    content,
    selectedFiles,
    detectedUrls,
    isResearch,
    user?.token,
    createContentProcessingNotification,
    createDeepResearchJob,
    onClose,
  ]);

  // 快捷键处理 - 基于参考代码的快捷键逻辑
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

  // 重置状态当模态框关闭时
  useEffect(() => {
    if (!open) {
      setContent("");
      setSelectedFiles([]);
      setError("");
      setIsLoading(false);
      setShowResearchConfig(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* 固定尺寸容器，避免跳动 */}
      <div className="bg-card rounded-2xl shadow-xl border border-border w-[580px] max-w-[90vw] min-h-[380px] flex flex-col overflow-hidden">
        {/* 固定头部 */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          {/* 左侧：图标 + 标题 + 类型徽章 */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-card-foreground">添加内容</span>
            {contentAnalysis && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${contentAnalysis.bgColor} ${contentAnalysis.borderColor}`}
              >
                <contentAnalysis.icon
                  className={`w-3 h-3 ${contentAnalysis.color}`}
                />
                <span className={`${contentAnalysis.color}`}>
                  {contentAnalysis.label}
                </span>
                {isResearch && (
                  <Zap className="w-3 h-3 text-[oklch(var(--chart-1))]" />
                )}
              </div>
            )}
          </div>

          {/* 右侧：配置按钮 + 关闭按钮 */}
          <div className="flex items-center gap-2">
            {isResearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResearchConfig(!showResearchConfig)}
                className="text-[oklch(var(--chart-1))] hover:text-[oklch(var(--chart-1))]/80 text-xs px-1.5 h-6"
                disabled={false}
              >
                配置 {showResearchConfig ? "▼" : "▶"}
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 研究配置面板 */}
        {isResearch && showResearchConfig && (
          <div className="p-2 bg-accent rounded border border-border text-xs">
            <div className="font-medium text-foreground mb-1">研究配置</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">
                  深度 (1-5)
                </label>
                <select
                  value={researchConfig.depth}
                  onChange={(e) =>
                    setResearchConfig((prev) => ({
                      ...prev,
                      depth: parseInt(e.target.value),
                    }))
                  }
                  className="w-full p-1 text-xs border border-input rounded bg-background text-foreground focus-ring"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">
                  广度 (1-5)
                </label>
                <select
                  value={researchConfig.breadth}
                  onChange={(e) =>
                    setResearchConfig((prev) => ({
                      ...prev,
                      breadth: parseInt(e.target.value),
                    }))
                  }
                  className="w-full p-1 text-xs border border-input rounded bg-background text-foreground focus-ring"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 主体区域 - 固定布局 */}
        <div className="flex-1 flex flex-col p-5">
          {/* 上传内容输入区 */}
          <div className="mb-2">
            <span className="text-sm font-semibold text-card-foreground">
              上传内容
            </span>
          </div>
          <div className="mb-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isResearch
                  ? "输入您想要深度研究的问题或主题..."
                  : "输入研究主题、粘贴链接或文本内容..."
              }
              className="w-full h-[10rem] p-3 bg-transparent rounded-lg border border-input outline-none resize-none text-foreground placeholder:text-muted-foreground text-sm leading-relaxed transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* 上传文件标题 */}
          <div className="mb-2">
            <span className="text-sm font-semibold text-card-foreground">
              上传文件
            </span>
          </div>

          {/* 文件上传区域（点击区域触发 file input） */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 transition-all duration-200 mb-4 h-[10rem]
              ${isDragOver ? "border-[oklch(var(--chart-1))] bg-accent" : "border-border hover:border-ring"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFiles.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-background p-2 rounded border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getFileType(file) === "image" && (
                        <Image
                          className="w-4 h-4 text-[oklch(var(--chart-4))] flex-shrink-0"
                          aria-label="图片文件"
                        />
                      )}
                      {getFileType(file) === "video" && (
                        <Video className="w-4 h-4 text-[oklch(var(--chart-5))] flex-shrink-0" />
                      )}
                      {(getFileType(file) === "pdf" ||
                        getFileType(file) === "document") && (
                        <FileText className="w-4 h-4 text-[oklch(var(--chart-1))] flex-shrink-0" />
                      )}
                      {getFileType(file) === "file" && (
                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="ml-2"
                      disabled={false}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 pointer-events-none">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 PDF、Word、图片、视频等格式
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              title="上传内容"
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 固定底部操作区 */}
          <div className="flex items-center justify-between pt-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {isResearch ? "🔍 将启动AI深度研究" : "⌘+Enter 快速添加"}
            </span>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                取消
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={
                  (!content.trim() && selectedFiles.length === 0) || isLoading
                }
                className="gap-1"
                variant={isResearch ? "research" : "default"}
              >
                {isLoading ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    {isResearch ? "启动研究..." : "处理中"}
                  </>
                ) : (
                  <>
                    {isResearch ? (
                      <>
                        <Search className="w-3 h-3" />
                        开始研究
                      </>
                    ) : (
                      <>
                        添加
                        <ArrowRight className="w-2.5 h-2.5" />
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
