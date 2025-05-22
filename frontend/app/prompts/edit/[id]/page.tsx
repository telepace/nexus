import { fetchPrompt, fetchTags } from "@/components/actions/prompts-action";
import { getAuthState } from "@/lib/server-auth-bridge";
import { PromptForm } from "../../_components/PromptForm";
import { Suspense } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const promptData = await fetchPrompt(params.id);

    if ("error" in promptData) {
      return {
        title: "编辑提示词 - 错误",
        description: "无法加载提示词详情",
      };
    }

    return {
      title: `编辑提示词 - ${promptData.name}`,
      description: `编辑提示词 ${promptData.name}`,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      title: "编辑提示词",
      description: "编辑提示词",
    };
  }
}

// 主页面组件
export default async function EditPromptPage({
  params
}: { 
  params: { id: string } 
}) {
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
          <h1 className="text-2xl font-bold mb-6">编辑提示词</h1>
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
            <h1 className="text-2xl font-bold mb-6">编辑提示词</h1>
            <div className="animate-pulse">
              <div className="rounded-md bg-gray-200 h-8 w-full mb-4"></div>
              <div className="rounded-md bg-gray-200 h-32 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-8 w-32 mb-2"></div>
            </div>
          </div>
        }
      >
        <EditPromptContent id={params.id} />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件
async function EditPromptContent({ id }: { id: string }) {
  try {
    // 获取提示词详情和标签列表
    const [promptData, tagsResponse] = await Promise.all([
      fetchPrompt(id),
      fetchTags(),
    ]);

    // 检查提示词数据是否有错误
    if ("error" in promptData) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">编辑提示词</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载错误</AlertTitle>
            <AlertDescription>{promptData.error}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts">返回提示词列表</Link>
          </Button>
        </div>
      );
    }

    // 检查标签数据是否有错误
    if (!Array.isArray(tagsResponse)) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">编辑提示词</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载错误</AlertTitle>
            <AlertDescription>
              {tagsResponse.error || "获取标签失败"}
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts">返回提示词列表</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="container py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">编辑提示词</h1>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/prompts/${id}`}>取消</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/prompts">返回列表</Link>
              </Button>
            </div>
          </div>

          <PromptForm tags={tagsResponse} prompt={promptData as any} />
        </div>
      </div>
    );
  } catch (_error) {
    console.error("编辑提示词页面加载出错:", _error);
    throw _error; // 让错误边界处理
  }
}
