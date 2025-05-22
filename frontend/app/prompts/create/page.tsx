import { fetchTags } from "@/components/actions/prompts-action";
import { getAuthState } from "@/lib/server-auth-bridge";
import { PromptForm } from "../_components/PromptForm";
import { Suspense } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata = {
  title: "创建提示词",
  description: "创建新的提示词",
};

// 主页面组件
export default async function CreatePromptPage() {
  // 获取认证状态
  const authState = await getAuthState();

  // 如果未认证，重定向到登录页
  if (!authState.isAuthenticated) {
    return (
      <div className="container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>认证错误</AlertTitle>
          <AlertDescription>未登录或会话已过期，请登录</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/login">去登录</Link>
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">创建提示词</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>页面加载错误</AlertTitle>
            <AlertDescription>
              加载数据时出现意外错误，请稍后再试或联系管理员
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts">返回提示词列表</Link>
          </Button>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="container py-10">
            <h1 className="text-2xl font-bold mb-6">创建提示词</h1>
            <div className="animate-pulse">
              <div className="rounded-md bg-gray-200 h-8 w-full mb-4"></div>
              <div className="rounded-md bg-gray-200 h-32 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-8 w-32 mb-2"></div>
            </div>
          </div>
        }
      >
        <CreatePromptContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件
async function CreatePromptContent() {
  try {
    // 获取所有标签
    const tagsResponse = await fetchTags();

    // 检查是否有错误
    if (!Array.isArray(tagsResponse)) {
      const errorMsg = tagsResponse.error || "获取标签失败";
      throw new Error(errorMsg);
    }

    return (
      <div className="container py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">创建提示词</h1>
            <Button variant="outline" asChild>
              <Link href="/prompts">返回列表</Link>
            </Button>
          </div>

          <PromptForm tags={tagsResponse} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("创建提示词页面加载出错:", error);
    throw error; // 让错误边界处理
  }
}
