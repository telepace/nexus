import {
  fetchPrompts,
  fetchTags,
  type PromptData,
} from "@/components/actions/prompts-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Tag as TagIcon } from "lucide-react";
import { getAuthState } from "@/lib/server-auth-bridge";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// 导入组件
import { SearchForm } from "./searchForm";
import { PromptCards } from "./_components/PromptCards";

export const metadata = {
  title: "Prompt Library",
  description: "查看和管理提示词",
};

// 服务器组件：提示词卡片容器
async function PromptCardsContainer({ prompts }: { prompts: PromptData[] }) {
  const auth = await getAuthState();
  const currentUser = auth.user;

  return <PromptCards prompts={prompts} currentUser={currentUser} />;
}

// Prompts 顶级页面组件，增加错误边界和Suspense
export default async function PromptsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    tags?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  // 获取认证状态
  const authState = await getAuthState();

  // 如果未认证，将在 getAuthState 内部重定向到登录页
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-10">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>认证错误</AlertTitle>
            <AlertDescription>未登录或会话已过期，请登录</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
          <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-10">
            <h1 className="text-2xl font-bold mb-6">Prompt Library</h1>
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>页面加载错误</AlertTitle>
              <AlertDescription>
                加载数据时出现意外错误，请稍后再试或联系管理员
              </AlertDescription>
            </Alert>
            <Button asChild>
              <Link href="/prompts/create">创建提示词</Link>
            </Button>
          </div>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
            <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
              <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-8">
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 rounded-lg w-48 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-96 mb-8"></div>
                  <div className="h-12 bg-slate-200 rounded-full w-80"></div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <PromptsContent searchParams={searchParams} />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件，可能会挂起(Suspend)
async function PromptsContent({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    tags?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  try {
    // 使用安全的方式处理 searchParams - 异步等待
    const resolvedSearchParams = searchParams ? await searchParams : {};

    const query = resolvedSearchParams.query || "";
    const selectedTags = resolvedSearchParams.tags
      ? resolvedSearchParams.tags.split(",")
      : [];
    const sort = resolvedSearchParams.sort || "updated_at";
    const order = resolvedSearchParams.order || "desc";

    // 并行获取数据
    const [promptsResult, tagsResult] = await Promise.all([
      fetchPrompts({
        search: query,
        tag_ids: selectedTags,
        sort,
        order: order as "asc" | "desc",
      }),
      fetchTags(),
    ]);

    // Check if promptsResult is an error
    if (!Array.isArray(promptsResult)) {
      throw new Error(promptsResult.error || "获取提示词失败");
    }

    // Check if tagsResult is an error
    if (!Array.isArray(tagsResult)) {
      throw new Error(tagsResult.error || "获取标签失败");
    }

    const prompts = promptsResult;
    const tags = tagsResult;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        {/* Minimalist Header */}
        <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
          <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-light text-slate-900 tracking-tight">
                  Prompt Library
                </h1>
                <p className="text-slate-500 text-sm font-light mt-2">
                  创建、管理和分享你的AI提示词，提升工作效率
                </p>
              </div>
              <button className="px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all duration-300 font-medium text-sm tracking-wide">
                <Plus className="h-4 w-4 inline mr-2" />
                <Link href="/prompts/create" className="text-white">
                  New Prompt
                </Link>
              </button>
            </div>

            {/* Clean Controls */}
            <SearchForm tags={tags} />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-6">
          {/* Stats */}
          <div className="mb-6">
            <p className="text-slate-500 text-sm font-light">
              {prompts.length} prompts found
              {(query || selectedTags.length > 0) && (
                <span className="ml-2 text-slate-400">• 已应用筛选条件</span>
              )}
            </p>
          </div>

          {/* Content */}
          {prompts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <TagIcon className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-light text-slate-900 mb-3">
                {query || selectedTags.length > 0
                  ? "No prompts found"
                  : "暂无提示词"}
              </h3>
              <p className="text-slate-500 text-sm font-light mb-6 max-w-md mx-auto">
                {query || selectedTags.length > 0
                  ? "Try adjusting your search terms or tag filters to find what you're looking for"
                  : "创建你的第一个AI提示词，开始构建专属的提示词库"}
              </p>
              <Button
                asChild
                className="px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors duration-300 font-medium text-sm"
              >
                <Link href="/prompts/create">Create New Prompt</Link>
              </Button>
            </div>
          ) : (
            <PromptCardsContainer prompts={prompts} />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("PromptsContent error:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-full mx-auto px-6 lg:px-8 xl:px-12 py-10">
          <h1 className="text-3xl font-light text-slate-900 tracking-tight mb-6">
            Prompt Library
          </h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "未知错误"}
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts/create">创建提示词</Link>
          </Button>
        </div>
      </div>
    );
  }
}
