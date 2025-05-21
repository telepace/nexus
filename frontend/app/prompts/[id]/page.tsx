import { fetchPrompt, fetchPromptVersions } from "@/components/actions/prompts-action";
import { getAuthState } from "@/lib/server-auth-bridge";
import { redirect as _redirect } from "next/navigation";
import { Suspense } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, Edit, Copy, History, Tag as TagIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistance } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 引入客户端组件
import { DuplicateButton } from "../_components/DuplicateButton";

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const promptData = await fetchPrompt(params.id);
    
    if ('error' in promptData) {
      return {
        title: "提示词 - 错误",
        description: "无法加载提示词详情",
      };
    }
    
    return {
      title: `${promptData.name} - 提示词详情`,
      description: promptData.description || "提示词详情页面",
    };
  } catch (_error) {
    return {
      title: "提示词 - 错误",
      description: "无法加载提示词详情",
    };
  }
}

// 主页面组件
export default async function PromptDetailPage({ params }: { params: { id: string } }) {
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
          <h1 className="text-2xl font-bold mb-6">提示词详情</h1>
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
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded-full w-24 mb-4"></div>
              </div>
            </div>
          </div>
        }
      >
        <PromptDetailContent id={params.id} />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件
async function PromptDetailContent({ id }: { id: string }) {
  try {
    // 获取提示词详情和版本历史
    const [promptData, versionsData] = await Promise.all([
      fetchPrompt(id),
      fetchPromptVersions(id),
    ]);
    
    // 处理错误
    if ('error' in promptData) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">提示词详情</h1>
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
    
    // 版本列表
    const versions = Array.isArray(versionsData) ? versionsData : [];
    
    // 可见性映射
    const visibilityMap = {
      'public': { label: '公开', icon: <Eye className="h-4 w-4 mr-2" /> },
      'private': { label: '私有', icon: <Eye className="h-4 w-4 mr-2" /> },
      'team': { label: '团队', icon: <Eye className="h-4 w-4 mr-2" /> },
    };
    
    return (
      <div className="container py-10">
        <div className="max-w-4xl mx-auto">
          {/* 标题和操作按钮 */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">{promptData.name}</h1>
              <p className="text-muted-foreground mt-1">{promptData.description || "无描述"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/prompts">
                  返回列表
                </Link>
              </Button>
              <DuplicateButton promptId={promptData.id} />
              <Button asChild>
                <Link href={`/prompts/edit/${promptData.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </Button>
            </div>
          </div>
          
          {/* 元数据信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center text-sm">
                <TagIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">类型:</span>
                <span className="ml-auto">{promptData.type}</span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center text-sm">
                {visibilityMap[promptData.visibility as keyof typeof visibilityMap]?.icon}
                <span className="font-medium">可见性:</span>
                <span className="ml-auto">
                  {visibilityMap[promptData.visibility as keyof typeof visibilityMap]?.label || promptData.visibility}
                </span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">更新时间:</span>
                <span className="ml-auto" title={new Date(promptData.updated_at).toLocaleString()}>
                  {formatDistance(new Date(promptData.updated_at), new Date(), { 
                    addSuffix: true,
                    locale: zhCN 
                  })}
                </span>
              </div>
            </Card>
          </div>
          
          {/* 标签 */}
          {promptData.tags && promptData.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium mb-2">标签:</h2>
              <div className="flex flex-wrap gap-2">
                {promptData.tags.map((tag) => (
                  <Badge 
                    key={tag.id}
                    variant="outline" 
                    style={{ borderColor: tag.color || '#888', color: tag.color || '#888' }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <Separator className="my-6" />
          
          {/* 内容和版本历史 */}
          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">提示词内容</TabsTrigger>
              {promptData.input_vars && promptData.input_vars.length > 0 && (
                <TabsTrigger value="variables">输入变量 ({promptData.input_vars.length})</TabsTrigger>
              )}
              {versions.length > 0 && (
                <TabsTrigger value="versions">
                  <History className="h-4 w-4 mr-2" />
                  版本历史 ({versions.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="content">
              <Card className="mb-6">
                <pre className="p-4 overflow-auto whitespace-pre-wrap bg-muted/30 rounded-md font-mono text-sm">
                  {promptData.content}
                </pre>
              </Card>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(promptData.content);
                    // 如果需要加入提示可以使用toast通知
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制内容
                </Button>
              </div>
            </TabsContent>
            
            {promptData.input_vars && promptData.input_vars.length > 0 && (
              <TabsContent value="variables">
                <div className="space-y-4">
                  {promptData.input_vars.map((variable, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium">变量名</h3>
                          <p className="font-mono">{variable.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">描述</h3>
                          <p>{variable.description || "无描述"}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">是否必填</h3>
                          <p>{variable.required ? "是" : "否"}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
            
            {versions.length > 0 && (
              <TabsContent value="versions">
                <div className="space-y-4">
                  {versions.map((version) => (
                    <Card key={version.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">版本 {version.version}</h3>
                        <span className="text-sm text-muted-foreground">
                          {formatDistance(new Date(version.created_at), new Date(), { 
                            addSuffix: true,
                            locale: zhCN 
                          })}
                        </span>
                      </div>
                      {version.change_notes && (
                        <p className="text-sm mb-2">{version.change_notes}</p>
                      )}
                      <pre className="p-3 overflow-auto whitespace-pre-wrap bg-muted/30 rounded-md font-mono text-xs max-h-40">
                        {version.content}
                      </pre>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    console.error('提示词详情页面加载出错:', error);
    throw error; // 让错误边界处理
  }
} 