import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  fetchPrompts,
  fetchTags,
  type PromptData,
} from "@/components/actions/prompts-action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Tag as TagIcon, Clock, Plus } from "lucide-react";
import { getAuthState } from "@/lib/server-auth-bridge";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DateDisplay } from "@/components/ui/DateDisplay";

// 导入删除按钮组件
import { DeleteButton } from "./deleteButton";
import { SearchForm } from "./searchForm";
import { PromptToggle } from "./promptToggle";

export const metadata = {
  title: "Prompt Hub",
  description: "查看和管理提示词",
};

// 将作者信息回退到当前登录用户（如果匹配created_by）
async function PromptCards({ prompts }: { prompts: PromptData[] }) {
  const auth = await getAuthState();
  const currentUser = auth.user;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {prompts.map((prompt) => {
        const authorName =
          prompt.creator?.name ||
          (currentUser && prompt.created_by === currentUser.id
            ? currentUser.full_name || currentUser.email || "我"
            : "未知");

        return (
          <Card
            key={prompt.id}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold truncate flex-1 group-hover:text-primary transition-colors">
                  {prompt.name}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-lg">⋯</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="flex items-center"
                      >
                        <span className="mr-2">👁️</span>
                        查看详情
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/prompts/edit/${prompt.id}`}
                        className="flex items-center"
                      >
                        <span className="mr-2">✏️</span>
                        编辑
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <DeleteButton promptId={prompt.id} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed line-clamp-3">
                {prompt.description || "暂无描述"}
              </p>

              {/* 启用状态控件 */}
              <div className="mb-4 pb-4 border-b border-border/50">
                <PromptToggle
                  promptId={prompt.id}
                  enabled={prompt.enabled ?? false}
                  promptName={prompt.name}
                />
              </div>

              <div className="mt-auto space-y-3">
                {/* 标签 */}
                <div className="flex flex-wrap gap-1">
                  {prompt.tags && prompt.tags.length > 0 ? (
                    prompt.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-xs bg-primary/5 border-primary/20"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs opacity-50">
                      无标签
                    </Badge>
                  )}
                  {prompt.tags && prompt.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{prompt.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* 元信息 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <DateDisplay
                      date={prompt.updated_at}
                      format="distance"
                      className="text-xs"
                    />
                  </div>
                  <div className="truncate max-w-[100px]">
                    作者: {authorName}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
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
          <h1 className="text-2xl font-bold mb-6">Prompt Hub</h1>
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
      }
    >
      <Suspense
        fallback={
          <div className="container py-10">
            <h1 className="text-2xl font-bold mb-6">Prompt Hub</h1>
            <div className="animate-pulse">
              <div className="rounded-md bg-gray-200 h-8 w-24 mb-4"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-4 w-3/4 mb-2"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                AI 提示词库
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                创建、管理和分享你的AI提示词，提升工作效率
              </p>
            </div>

            {/* Search and Actions */}
            <div className="space-y-4">
              {/* 搜索区域 */}
              <SearchForm tags={tags} />
              
              {/* 操作按钮和统计信息 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{prompts.length}</span>
                    个提示词
                  </span>
                  {(query || selectedTags.length > 0) && (
                    <span className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      已应用筛选条件
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
                  >
                    <Link href="/prompts/create">
                      <Plus className="mr-2 h-4 w-4" />
                      创建提示词
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/prompts/tags">
                      <TagIcon className="mr-2 h-4 w-4" />
                      管理标签
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            {prompts.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <TagIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {query || selectedTags.length > 0
                      ? "未找到匹配的提示词"
                      : "暂无提示词"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {query || selectedTags.length > 0
                      ? "尝试调整搜索条件或清除筛选器"
                      : "创建你的第一个AI提示词，开始构建专属的提示词库"}
                  </p>
                  <Button asChild>
                    <Link href="/prompts/create">创建提示词</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <PromptCards prompts={prompts} />
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("PromptsContent error:", error);
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Prompt Hub</h1>
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
    );
  }
}
