"use client";

import React from "react";
import { AlertCircle, RefreshCcw, Home, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export interface ErrorInfo {
  type:
    | "session"
    | "network"
    | "auth"
    | "permission"
    | "not_found"
    | "server"
    | "timeout"
    | "unknown";
  message: string;
  originalError?: Error;
}

interface ErrorHandlerProps {
  error: ErrorInfo;
  onRetry?: () => void;
  showBackToHome?: boolean;
  className?: string;
}

export function parseError(error: unknown): ErrorInfo {
  if (!(error instanceof Error)) {
    return {
      type: "unknown",
      message: "发生了未知错误",
      originalError: undefined,
    };
  }

  const errorStr = error.message.toLowerCase();

  if (
    errorStr.includes("not bound to a session") ||
    errorStr.includes("数据库连接问题")
  ) {
    return {
      type: "session",
      message: "数据库连接异常，请刷新页面后重试",
      originalError: error,
    };
  }

  if (errorStr.includes("timeout") || errorStr.includes("超时")) {
    return {
      type: "timeout",
      message: "AI分析超时，内容较长需要更多处理时间",
      originalError: error,
    };
  }

  if (
    errorStr.includes("network") ||
    errorStr.includes("网络") ||
    errorStr.includes("fetch")
  ) {
    return {
      type: "network",
      message: "网络连接问题，请检查网络后重试",
      originalError: error,
    };
  }

  if (
    errorStr.includes("unauthorized") ||
    errorStr.includes("401") ||
    errorStr.includes("未找到登录凭据")
  ) {
    return {
      type: "auth",
      message: "登录状态已过期，请重新登录",
      originalError: error,
    };
  }

  if (errorStr.includes("forbidden") || errorStr.includes("403")) {
    return {
      type: "permission",
      message: "权限不足，您无法执行此操作",
      originalError: error,
    };
  }

  if (errorStr.includes("not found") || errorStr.includes("404")) {
    return {
      type: "not_found",
      message: "请求的内容不存在或已被删除",
      originalError: error,
    };
  }

  if (
    errorStr.includes("500") ||
    errorStr.includes("internal") ||
    errorStr.includes("服务器")
  ) {
    return {
      type: "server",
      message: "服务器内部错误，请稍后重试",
      originalError: error,
    };
  }

  return {
    type: "unknown",
    message: error.message || "发生了未知错误",
    originalError: error,
  };
}

export function ErrorHandler({
  error,
  onRetry,
  showBackToHome = true,
  className,
}: ErrorHandlerProps) {
  const router = useRouter();

  const getErrorIcon = () => {
    switch (error.type) {
      case "session":
      case "server":
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      case "network":
        return <AlertCircle className="h-8 w-8 text-orange-500" />;
      case "auth":
        return <AlertCircle className="h-8 w-8 text-blue-500" />;
      case "timeout":
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getSuggestions = () => {
    switch (error.type) {
      case "session":
        return [
          "刷新页面后重试",
          "如果问题持续存在，请联系技术支持",
          "检查网络连接是否稳定",
        ];
      case "network":
        return ["检查网络连接", "尝试刷新页面", "稍后再试"];
      case "auth":
        return ["重新登录", "清除浏览器缓存", "检查账户状态"];
      case "permission":
        return ["联系管理员获取权限", "确认您的账户状态", "使用有权限的账户"];
      case "not_found":
        return ["返回内容库查看", "确认内容是否已被删除", "检查URL是否正确"];
      case "server":
        return ["稍后重试", "联系技术支持", "查看服务状态页面"];
      case "timeout":
        return [
          "内容较长需要更多时间，请稍后重试",
          "考虑分段处理",
          "检查网络稳定性",
        ];
      default:
        return ["刷新页面重试", "联系技术支持", "提供错误详情"];
    }
  };

  const handleAuthError = () => {
    // 对于认证错误，直接跳转到登录页
    router.push("/login");
  };

  const handleBackToHome = () => {
    router.push("/content-library");
  };

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">{getErrorIcon()}</div>
        <CardTitle className="text-lg">出现了问题</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground">{error.message}</p>

        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            建议解决方案：
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 pt-4">
          {error.type === "auth" && (
            <Button onClick={handleAuthError} className="flex-1">
              重新登录
            </Button>
          )}

          {onRetry && error.type !== "auth" && error.type !== "permission" && (
            <Button onClick={onRetry} variant="outline" className="flex-1">
              <RefreshCcw className="h-4 w-4 mr-2" />
              重试
            </Button>
          )}

          {showBackToHome && (
            <Button
              onClick={handleBackToHome}
              variant="ghost"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          )}
        </div>

        {process.env.NODE_ENV === "development" && error.originalError && (
          <details className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <summary className="cursor-pointer text-gray-600">
              技术详情 (开发模式)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-gray-700">
              {error.originalError.stack || error.originalError.message}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
