"use client";

import { FC, useState, useRef, useCallback } from "react";
import { X, Upload, Link as LinkIcon, FileText, AlertCircle } from "lucide-react";
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

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
}

type ContentType = "url" | "text" | "file" | null;

export const AddContentModal: FC<AddContentModalProps> = ({ open, onClose }) => {
  const [contentType, setContentType] = useState<ContentType>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleTextChange = (value: string) => {
    setContent(value);
    
    // 自动检测是否为URL
    if (isUrl(value)) {
      setContentType("url");
    } else {
      setContentType("text");
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setContentType("file");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      setContentType("file");
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAddContent = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // 此处实现添加内容的逻辑
      console.log("Adding content:", {
        type: contentType,
        content: contentType === "file" ? selectedFiles : content
      });
      
      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 清空表单并关闭模态窗口
      resetForm();
      onClose();
    } catch (err) {
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
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">添加新内容</AlertDialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 主拖放区域 */}
          <div
            data-testid="drop-area"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`
              flex flex-col items-center justify-center p-8 
              border-2 border-dashed rounded-lg
              transition-colors cursor-pointer
              ${selectedFiles.length || content 
                ? "border-primary/50 bg-primary/5" 
                : "border-gray-300 hover:border-primary/50 hover:bg-gray-100/50 dark:border-gray-600 dark:hover:bg-gray-800/50"}
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
                  🔗 粘贴链接、✍️ 输入文本，或 📂 拖拽文件至此
                </p>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
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
                  <span>已识别链接</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">标题 (可选)</Label>
                    <Input
                      id="title"
                      placeholder="为此链接添加标题"
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
                    placeholder="输入您想要添加的文本"
                    className="min-h-[100px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
            )}

            {contentType === "file" && (
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label>已选择的文件</Label>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                          <span className="truncate max-w-xs">{file.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    添加更多文件
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 支持的格式信息 */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            支持格式: PDF, Markdown, TXT, DOCX, URL, 纯文本
          </p>

          {/* 错误信息 */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isLoading}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAddContent}
            disabled={isLoading || (!content && selectedFiles.length === 0)}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "处理中..." : "添加"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 