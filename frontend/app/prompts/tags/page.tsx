import { fetchTags, type TagData } from "@/components/actions/prompts-action";
import { getAuthState } from "@/lib/server-auth-bridge";
import { Suspense } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Tag as TagIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card } from "@/components/ui/card";
import { formatDistance } from "date-fns";
import { zhCN } from "date-fns/locale";

// 导入客户端组件
import { TagForm } from "./_components/TagForm";
import { DeleteTagButton } from "./_components/DeleteTagButton";

export const metadata = {
  title: "标签管理",
  description: "管理提示词标签",
};

// 主页面组件
export default async function TagsPage() {
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
          <h1 className="text-2xl font-bold mb-6">标签管理</h1>
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
            <h1 className="text-2xl font-bold mb-6">标签管理</h1>
            <div className="animate-pulse">
              <div className="rounded-md bg-gray-200 h-8 w-24 mb-4"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
            </div>
          </div>
        }
      >
        <TagsContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件
async function TagsContent() {
  try {
    // 获取标签数据
    const tagsResponse = await fetchTags();

    // 处理标签数据
    let tagsList: TagData[] = [];
    let errorMessage: string | null = null;

    if (Array.isArray(tagsResponse)) {
      tagsList = tagsResponse;
    } else if (
      tagsResponse &&
      typeof tagsResponse === "object" &&
      "error" in tagsResponse
    ) {
      errorMessage = String(tagsResponse.error);
    }

    // 当有错误时显示错误信息
    if (errorMessage) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">标签管理</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/prompts">返回提示词列表</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">标签管理</h1>
            <Button variant="outline" asChild>
              <Link href="/prompts">返回提示词列表</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 标签创建表单 */}
            <div className="col-span-1">
              <div className="sticky top-6">
                <Card className="p-4">
                  <h2 className="text-lg font-medium mb-4 flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    创建新标签
                  </h2>
                  <TagForm />
                </Card>
              </div>
            </div>

            {/* 标签列表 */}
            <div className="col-span-1 md:col-span-2">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <TagIcon className="h-4 w-4 mr-2" />
                现有标签 ({tagsList.length})
              </h2>

              {tagsList.length === 0 ? (
                <div className="bg-muted p-8 text-center rounded-lg">
                  <h2 className="text-xl mb-2">暂无标签</h2>
                  <p className="text-muted-foreground mb-4">
                    您当前没有任何标签，请使用左侧表单创建标签。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tagsList.map((tag) => (
                    <Card key={tag.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color || "#888" }}
                          />
                          <h3 className="font-medium">{tag.name}</h3>
                        </div>
                        <DeleteTagButton tagId={tag.id} />
                      </div>

                      {tag.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {tag.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground mt-2">
                        创建于:{" "}
                        {formatDistance(new Date(tag.created_at), new Date(), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/prompts?tags=${tag.id}`}>
                            查看关联提示词
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("标签管理页面加载出错:", error);
    throw error; // 让错误边界处理
  }
}
