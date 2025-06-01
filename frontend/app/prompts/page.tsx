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
  type TagData,
} from "@/components/actions/prompts-action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Tag as TagIcon,
  Clock,
  SortDesc,
  SortAsc,
} from "lucide-react";
import { getAuthState } from "@/lib/server-auth-bridge";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

// 展示卡片视图的提示词列表
function PromptCards({ prompts }: { prompts: PromptData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {prompts.map((prompt) => (
        <Card key={prompt.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold truncate">{prompt.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/prompts/${prompt.id}`}>查看详情</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/prompts/edit/${prompt.id}`}>编辑</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DeleteButton promptId={prompt.id} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm text-muted-foreground mb-3 flex-grow">
              {prompt.description || "无描述"}
            </p>

            {/* 启用状态控件 */}
            <div className="mb-3 pb-2 border-b">
              <PromptToggle
                promptId={prompt.id}
                enabled={prompt.enabled ?? false}
                promptName={prompt.name}
              />
            </div>

            <div className="mt-auto">
              <div className="flex flex-wrap gap-1 mb-2">
                {prompt.tags && prompt.tags.length > 0 ? (
                  prompt.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">无标签</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <DateDisplay
                    date={prompt.updated_at}
                    format="distance"
                    className="text-xs"
                  />
                </div>
                <div>作者: {prompt.creator?.name || "未知"}</div>
              </div>
            </div>
          </div>
        </Card>
      ))}
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
  // 使用唯一ID标识这次渲染，帮助调试
  const renderID = Math.random().toString(36).substring(7);
  console.log(`[prompts-${renderID}] 开始渲染 Prompts 内容`);

  try {
    // 使用安全的方式处理 searchParams - 异步等待
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const params = resolvedSearchParams || {};

    // 准备查询参数
    const search = params.query || undefined;
    const tagIds = params.tags ? params.tags.split(",") : undefined;
    const sort = params.sort || undefined;
    const order = (params.order || "desc") as "asc" | "desc";

    // 获取提示词和标签数据
    const [promptsResponse, tagsResponse] = await Promise.all([
      fetchPrompts({ search, tag_ids: tagIds, sort, order }),
      fetchTags(),
    ]);

    // 处理标签数据
    let tagsList: TagData[] = [];
    let tagsErrorMessage: string | null = null;

    if (Array.isArray(tagsResponse)) {
      tagsList = tagsResponse;
    } else if (
      tagsResponse &&
      typeof tagsResponse === "object" &&
      "error" in tagsResponse
    ) {
      tagsErrorMessage = String(tagsResponse.error);
    }

    // 处理提示词数据
    let promptsList: PromptData[] = [];
    let errorMessage: string | null = null;
    let errorStatus: number | null = null;

    if (Array.isArray(promptsResponse)) {
      promptsList = promptsResponse;
      console.log(
        `[prompts-${renderID}] 成功获取 ${promptsList.length} 个提示词`,
      );
    } else if (
      promptsResponse &&
      typeof promptsResponse === "object" &&
      "error" in promptsResponse
    ) {
      // 处理可能的错误响应
      errorMessage = String(promptsResponse.error);
      errorStatus = promptsResponse.status || 500;
      console.error(
        `[prompts-${renderID}] 获取提示词出错:`,
        errorMessage,
        "状态:",
        errorStatus,
      );
    }

    // 当有错误时显示错误信息
    if (errorMessage) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Prompt Hub</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误 {errorStatus}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts/create">创建提示词</Link>
          </Button>
        </div>
      );
    }

    // 渲染页面内容
    return (
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Prompt Hub</h1>
          <Button asChild>
            <Link href="/prompts/create">创建提示词</Link>
          </Button>
        </div>

        {/* 搜索和过滤区域 */}
        <div className="mb-6 bg-muted/50 p-4 rounded-lg">
          <SearchForm tags={tagsList} />
        </div>

        {/* 显示标签列表 */}
        {tagsErrorMessage ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>获取标签出错</AlertTitle>
            <AlertDescription>{tagsErrorMessage}</AlertDescription>
          </Alert>
        ) : tagsList.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-2 flex items-center">
              <TagIcon className="h-4 w-4 mr-1" />
              标签过滤
            </h2>
            <div className="flex flex-wrap gap-2">
              {tagsList.map((tag) => (
                <Link key={tag.id} href={`/prompts?tags=${tag.id}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    style={{
                      borderColor: tag.color || "#888",
                      color: tag.color || "#888",
                    }}
                  >
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <Separator className="my-6" />

        {/* 排序控制区域 */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-muted-foreground">
            共 {promptsList.length} 个提示词
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/prompts?sort=${params.sort || "updated_at"}&order=${params.order === "asc" ? "desc" : "asc"}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              {order === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              {params.sort === "created_at" ? "创建时间" : "更新时间"}
            </Link>
          </div>
        </div>

        {/* 没有错误但也没有数据 */}
        {promptsList.length === 0 ? (
          <div className="bg-muted p-8 text-center rounded-lg mb-6">
            <h2 className="text-xl mb-2">暂无提示词</h2>
            <p className="text-muted-foreground mb-4">
              您当前没有任何提示词，请创建一个新提示词开始使用。
            </p>
            <Button asChild>
              <Link href="/prompts/create">创建提示词</Link>
            </Button>
          </div>
        ) : (
          // 卡片视图显示提示词
          <PromptCards prompts={promptsList} />
        )}
      </div>
    );
  } catch (error) {
    console.error(`[prompts-${renderID}] 渲染过程出错:`, error);
    throw error; // 让错误边界处理
  }
}
