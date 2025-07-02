"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // To get token from URL
import { contentApi } from "@/lib/api/content"; // Adjust as per your project
// import { ContentItemPublic } from "@/app/openapi-client/sdk.gen";

// 临时定义缺失的类型
interface ContentItemPublic {
  id: string;
  title: string;
  content?: string;
  content_text?: string; // 添加缺失的属性
  type?: string;
  processing_status?: string;
  source_uri?: string;
  created_at?: string;
  updated_at?: string;
  // 其他必要的属性
} // Adjust as per your project
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"; // Adjust as per your project
import { ShareMarkdownRenderer } from "@/components/ui/ShareMarkdownRenderer"; // 新的分享页面专用渲染器
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  LockIcon,
  EyeIcon,
  FileText,
  Calendar,
  ExternalLink,
  ArrowLeft,
  Share2,
} from "lucide-react";
import Link from "next/link"; // For a link back to homepage or login

const SharedContentPage = () => {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [contentItem, setContentItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchSharedContent = async (accessPassword?: string) => {
      if (!token) {
        setError("分享链接无效");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setPasswordRequired(false);

      try {
        const response = await contentApi.getSharedContent(token, accessPassword);
        setContentItem(response);
      } catch (error: unknown) {
        console.error("Failed to fetch shared content:", error);
        const handleError = (error: Error | unknown) => {
          const status = (error as { status?: number }).status;
          const responseObj = (error as { response?: { status?: number } })
            .response;
          const data = (error as { data?: { detail?: string } }).data;
          const message = (error as { message?: string }).message;
          return { status, responseObj, data, message };
        };
        const { status, responseObj: _, data, message } = handleError(error);
        const errorDetail =
          data?.detail || message || "无法加载分享内容";

        if (status === 401 && errorDetail === "Password required") {
          setPasswordRequired(true);
          setError(null);
        } else if (status === 403 && errorDetail === "Incorrect password") {
          setPasswordRequired(true);
          setError("密码错误，请重试");
        } else if (status === 404) {
          setError("分享链接不存在、已过期或访问次数已达上限");
        } else {
          setError(errorDetail);
        }
        setContentItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && !passwordRequired) {
      fetchSharedContent();
    } else if (!token) {
      setError("分享链接缺失");
      setIsLoading(false);
    }
  }, [token, passwordRequired]);

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password) {
      setError("请输入密码");
      return;
    }
    setPasswordRequired(false);
    setIsLoading(true);

    try {
      const response = await contentApi.getSharedContent(token, password);
      setContentItem(response);
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch shared content with password:", err);
      const errObj = err as any;
      const status = errObj.status || errObj.response?.status;
      const errorDetail =
        errObj.data?.detail ||
        errObj.message ||
        "无法加载分享内容";

      setPasswordRequired(true);
      if (status === 403 && errorDetail === "Incorrect password") {
        setError("密码错误，请重试");
      } else if (status === 404) {
        setError("分享链接不存在、已过期或访问次数已达上限");
      } else {
        setError(errorDetail);
      }
      setContentItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-neutral-100 dark:border-neutral-800 rounded-full animate-spin mx-auto relative">
                  <div className="absolute inset-0 border-2 border-transparent border-t-neutral-400 dark:border-t-neutral-600 rounded-full animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                  正在加载内容
                </p>
                <p className="text-neutral-500 dark:text-neutral-500 text-xs">
                  请稍候...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !passwordRequired) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    无法访问内容
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  返回首页
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900">
        <div className="max-w-md mx-auto px-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-full space-y-10">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <LockIcon className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                    需要访问密码
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
                    此内容受密码保护，请输入正确的密码以继续查看
                  </p>
                </div>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="password" className="text-sm font-medium text-neutral-900 dark:text-neutral-100 block">
                    访问密码
                  </label>
                  <div className="relative group">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12 h-12 rounded-xl border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 transition-all duration-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors duration-200"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      <EyeIcon className={`w-5 h-5 transition-colors duration-200 ${showPassword ? "text-neutral-700 dark:text-neutral-300" : ""}`} />
                    </button>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                      <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:bg-neutral-800 dark:focus:bg-neutral-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      解锁中
                    </div>
                  ) : (
                    "解锁内容"
                  )}
                </Button>
              </form>
              
              <div className="text-center pt-4">
                <Button variant="ghost" asChild className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg transition-colors duration-200">
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    返回首页
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contentItem) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    内容不可用
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    无法找到请求的内容
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  返回首页
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主要内容显示
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 antialiased">
      {/* 顶部导航条 */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-100/50 dark:border-neutral-800/50 shadow-sm animate-in fade-in duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回首页</span>
                <span className="sm:hidden">返回</span>
              </Link>
            </Button>
            
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-600 rounded-full animate-pulse" />
              <span className="hidden sm:inline">通过 Nexus 分享</span>
              <span className="sm:hidden">Nexus</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="py-12 sm:py-16 lg:py-20">
          {/* 文档头部 */}
          <div className="mb-16 sm:mb-20 animate-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-neutral-100 leading-[1.1] mb-6 sm:mb-8 tracking-tight max-w-4xl animate-in slide-in-from-bottom-2 duration-700 delay-100">
                {contentItem.title || "无标题文档"}
              </h1>
              
              {/* 元信息 */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 animate-in slide-in-from-bottom-2 duration-700 delay-200">
                {contentItem.type && (
                  <div className="flex items-center gap-2 sm:gap-2.5 group">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-neutral-100 dark:bg-neutral-800 rounded-md flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors duration-200">
                      <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                    <span className="capitalize font-medium">{contentItem.type}</span>
                  </div>
                )}
                
                {contentItem.created_at && (
                  <div className="flex items-center gap-2 sm:gap-2.5 group">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-neutral-100 dark:bg-neutral-800 rounded-md flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors duration-200">
                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                    <span className="font-medium">
                      {new Date(contentItem.created_at).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                
                {contentItem.source_uri && (
                  <div className="flex items-center gap-2 sm:gap-2.5 group">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-neutral-100 dark:bg-neutral-800 rounded-md flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors duration-200">
                      <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                    <a
                      href={contentItem.source_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-200 hover:underline underline-offset-2"
                    >
                      查看原文
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="mb-24 sm:mb-32 animate-in slide-in-from-bottom-4 duration-700 delay-500">
            {contentItem.content_text ? (
              <div className="bg-white dark:bg-neutral-900/50 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 sm:p-12 lg:p-16">
                <ShareMarkdownRenderer 
                  content={contentItem.content_text}
                  className="
                    selection:bg-blue-100 dark:selection:bg-blue-900/30
                    [&_*]:scroll-mt-20
                  "
                />
              </div>
            ) : (
              <div className="text-center py-24 sm:py-32">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-sm">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  暂无内容
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  此文档暂无可显示的内容
                </p>
              </div>
            )}
          </div>

          {/* 底部分割线和品牌信息 */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-16">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-8 h-8 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-lg flex items-center justify-center mx-auto">
                  <Share2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    此内容通过 Nexus 分享
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Nexus - 智能内容管理与分析平台
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-xl px-6 py-2.5 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200">
                <Link href="/" className="font-medium">
                  探索 Nexus
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedContentPage;
