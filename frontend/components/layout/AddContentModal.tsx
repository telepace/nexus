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
  Settings,
  Link,
  Loader2,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/auth";
import { contentCache } from "@/lib/services/content-cache";
import { eventBus } from "@/lib/event-bus";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import { extractAndNormalizeUrls } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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

// URL检测和提取 - 使用新的智能URL提取函数
const isURL = (text: string) => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

const extractUrls = (text: string) => {
  return extractAndNormalizeUrls(text);
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
  const isMobile = useIsMobile();

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
      {/* 响应式容器 - 根据屏幕尺寸调整 */}
      <div className={`bg-card rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden transition-all duration-300 ${
        isMobile 
          ? 'w-full h-full max-w-none max-h-none m-0 rounded-none' // 移动端全屏
          : 'w-[580px] max-w-[90vw] min-h-[380px] max-h-[90vh]' // 桌面端固定尺寸
      }`}>
        {/* 固定头部 */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-border">
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
            {/* Deep Research 配置按钮 */}
            {isResearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResearchConfig(!showResearchConfig)}
                className="text-xs h-7 px-2"
              >
                <Settings className="w-3 h-3 mr-1" />
                配置
              </Button>
            )}

            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Deep Research 配置面板 */}
        {isResearch && showResearchConfig && (
          <div className="px-5 py-3 bg-muted/30 border-b flex-shrink-0">
            <div className="text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">研究深度</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">浅</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={researchConfig.depth}
                    onChange={(e) =>
                      setResearchConfig((prev) => ({
                        ...prev,
                        depth: parseInt(e.target.value),
                      }))
                    }
                    className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">深</span>
                  <span className="text-xs font-medium min-w-[1rem] text-center">
                    {researchConfig.depth}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">研究广度</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">窄</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={researchConfig.breadth}
                    onChange={(e) =>
                      setResearchConfig((prev) => ({
                        ...prev,
                        breadth: parseInt(e.target.value),
                      }))
                    }
                    className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">宽</span>
                  <span className="text-xs font-medium min-w-[1rem] text-center">
                    {researchConfig.breadth}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 主体区域 - 可滚动 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <div className="flex-1 flex flex-col p-5 space-y-4">
            {/* 输入区域 */}
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  console.log('[onChange事件] 新值:', e.target.value);
                  setContent(e.target.value);
                }}
                placeholder="输入研究主题、粘贴链接或文本内容..."
                className={`w-full p-3 bg-muted/50 rounded-lg border-0 outline-none resize-none text-card-foreground placeholder:text-muted-foreground text-sm leading-relaxed transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 ${
                  isMobile ? 'min-h-[120px] max-h-[200px]' : 'min-h-[120px] max-h-[180px]'
                }`}
              />
              
              {/* 字符计数 */}
              {content.length > 0 && (
                <div className="text-xs text-muted-foreground text-right">
                  {content.length} 个字符
                  {content.length > 2000 && (
                    <span className="text-destructive ml-2">
                      内容较长，建议分段处理
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 文件上传区域 */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDropFiles}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-card-foreground">
                    已选择 {selectedFiles.length} 个文件
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                      >
                        <span className="truncate flex-1 text-left">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    添加更多文件
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    拖拽文件到此处或
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline ml-1"
                    >
                      选择文件
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    支持 PDF、Word、图片等格式
                  </div>
                </div>
              )}
            </div>

            {/* URL 检测提示 */}
            {detectedUrls.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Link className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      检测到链接
                    </div>
                    <div className="space-y-1">
                      {detectedUrls.map((url, index) => (
                        <div
                          key={index}
                          className="text-blue-700 dark:text-blue-300 text-xs font-mono break-all"
                        >
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* 固定底部操作栏 */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card">
            <div className="flex flex-col gap-3">
              {/* 快捷键提示 */}
              <div className="text-xs text-muted-foreground text-center">
                {isMobile ? '点击添加按钮提交' : '⌘ + Enter 快速添加 • ⌘ + Shift + Enter 深度研究'}
              </div>

              {/* 操作按钮 */}
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row-reverse'}`}>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || (!content.trim() && selectedFiles.length === 0)}
                  className={`${isMobile ? 'w-full' : 'flex-shrink-0'}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : isResearch ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      开始深度研究
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      添加内容
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className={isMobile ? 'w-full' : ''}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
