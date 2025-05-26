"use client";

import { FC, useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
}

type ContentType = "url" | "text" | "file" | null;

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
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检测URL的正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/g;

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

  /**
   * 从文本中提取所有URL
   */
  const extractUrls = (text: string): string[] => {
    // 支持多种分割符：空格、分号、逗号、换行符
    const separators = /[\s;,\n\r]+/;
    const parts = text.split(separators).filter(part => part.trim());
    
    const urls: string[] = [];
    
    // 检查每个部分是否为有效URL
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed && isURL(trimmed)) {
        urls.push(trimmed);
      }
    });

    // 同时使用正则表达式提取URL（防止遗漏）
    const regexMatches = text.match(urlRegex) || [];
    regexMatches.forEach(url => {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    });

    return urls;
  };

  // 处理内容变化
  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value);
      
      if (!value.trim()) {
        setContentType(null);
        setDetectedUrls([]);
        return;
      }

      // 提取URL
      const urls = extractUrls(value);
      setDetectedUrls(urls);

      if (urls.length > 0) {
        setContentType("url");
      } else if (value.trim() && contentType !== "text") {
        setContentType("text");
      }
    },
    [contentType],
  );

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

  // 监听粘贴事件
  useEffect(() => {
    if (open) {
      document.addEventListener("paste", handlePaste);
      return () => {
        document.removeEventListener("paste", handlePaste);
      };
    }
  }, [open, handlePaste]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...filesArray]);
        setContentType("file");
      }
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setContentType("file");
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setContentType(null);
      }
      return newFiles;
    });
  }, []);

  // 移除URL
  const removeUrl = useCallback((index: number) => {
    setDetectedUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      if (newUrls.length === 0) {
        setContentType(null);
        setContent("");
      }
      return newUrls;
    });
  }, []);

  // 处理拖放区域点击
  /**
   * Sets content type to "text" if it is currently undefined or null.
   */
  const handleDropAreaClick = () => {
    if (!contentType) {
      setContentType("text");
    }
  };

  /**
   * Handles the addition of content through an asynchronous process.
   *
   * This function sets loading state, simulates an API request to add content,
   * and handles errors by setting an error message. It also resets the form and closes
   * a modal window upon successful completion or failure.
   */
  const handleAddContent = async () => {
    setIsLoading(true);
    setError("");

    try {
      // 此处实现添加内容的逻辑
      console.log("Adding content:", {
        type: contentType,
        content: contentType === "file" ? selectedFiles : contentType === "url" ? detectedUrls : content,
        urls: detectedUrls,
        files: selectedFiles,
      });

      // 模拟API请求
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 清空表单并关闭模态窗口
      resetForm();
      onClose();
    } catch {
      setError("添加内容时发生错误，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setContentType(null);
    setContent("");
    setTitle("");
    setSelectedFiles([]);
    setDetectedUrls([]);
    setError("");
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">添加新内容</AlertDialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleCancel}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>
        <AlertDialogDescription>
          粘贴链接、输入文本或上传文件来添加新内容。支持多个链接同时添加。
        </AlertDialogDescription>

        <div className="space-y-6 py-4">
          {/* 主拖放区域 */}
          <div
            data-testid="drop-area"
            onClick={handleDropAreaClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`
              flex flex-col items-center justify-center p-8 
              border-2 border-dashed rounded-lg
              transition-colors cursor-pointer
              ${
                selectedFiles.length || content || detectedUrls.length
                  ? "border-primary/50 bg-primary/5"
                  : "border-gray-300 hover:border-primary/50 hover:bg-gray-100/50 dark:border-gray-600 dark:hover:bg-gray-800/50"
              }
            `}
          >
            {!contentType && (
              <>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-2">
                  <LinkIcon className="h-5 w-5" />
                  <FileText className="h-5 w-5" />
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                  粘贴链接、输入文本，或拖拽文件至此
                </p>
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-4">
                  支持多个链接，可用空格、分号、逗号或换行分隔
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  点击选择本地文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}

            {contentType === "url" && (
              <div className="w-full space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-green-600 dark:text-green-400 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span>已识别 {detectedUrls.length} 个链接</span>
                </div>
                
                {/* 显示检测到的URL */}
                {detectedUrls.length > 0 && (
                  <div className="space-y-2">
                    <Label>检测到的链接</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {detectedUrls.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <LinkIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="truncate text-sm">{url}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUrl(index)}
                            className="ml-2 h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url-input">链接输入</Label>
                    <Textarea
                      id="url-input"
                      role="textbox"
                      placeholder="粘贴一个或多个链接，支持空格、分号、逗号或换行分隔"
                      className="min-h-[80px]"
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">标题 (可选)</Label>
                    <Input
                      id="title"
                      placeholder="为这些链接添加标题"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {contentType === "text" && (
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-content">文本内容</Label>
                  <Textarea
                    id="text-content"
                    role="textbox"
                    placeholder="输入您想要添加的文本内容"
                    className="min-h-[120px]"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-title">标题 (可选)</Label>
                  <Input
                    id="text-title"
                    placeholder="为文本内容添加标题"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
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
                            <span className="truncate text-sm block">{file.name}</span>
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

          {/* 支持的格式信息 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>支持格式:</strong> PDF, Markdown, TXT, DOCX, URL, 纯文本</p>
            <p><strong>链接分隔:</strong> 空格、分号(;)、逗号(,)、换行符</p>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAddContent}
            disabled={isLoading || (!content && selectedFiles.length === 0 && detectedUrls.length === 0)}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "处理中..." : `添加${contentType === "url" ? ` (${detectedUrls.length}个链接)` : contentType === "file" ? ` (${selectedFiles.length}个文件)` : ""}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
