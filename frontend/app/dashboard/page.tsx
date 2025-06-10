"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Loader2,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  XCircle,
  Upload,
  Paperclip,
  Mic,
  Bot,
  Activity,
  Plus,
  Sparkles,
  Brain,
  Users,
  Target,
} from "lucide-react";
import { useAuth } from "@/lib/client-auth";
import Link from "next/link";
import { fetchItems } from "@/components/actions/items-action-client";
import { ContentItemPublic } from "@/app/openapi-client/index";
import { getCookie } from "@/lib/client-auth";
import MainLayout from "@/components/layout/MainLayout";
import {
  ExternalLink,
  Download,
  Trash2,
  Clock,
  Star,
  MessageCircle,
  Share2,
  Filter,
  Search,
  Tag,
  Calendar,
  Video,
  Music,
  BookOpen,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Bookmark,
  User,
  Settings,
  LogOut,
  RefreshCw,
  Eye,
  Heart,
  ThumbsUp,
  Archive,
  Grid,
  List,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { useContentEvents } from "@/hooks/useContentEvents";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 类型定义
interface DashboardMetrics {
  projects_count: number;
  content_items_count: number;
  processed_content_count: number;
  routing_count: number;
  growth_indicators: {
    active_projects: number;
    processed_documents: number;
    ai_insights: number;
  };
  recent_active_projects: Array<{
    id: string;
    title: string;
    updated_at: string;
  }>;
}

interface SmartRoutingResponse {
  recommended_project_id?: string;
  recommended_project_name?: string;
  confidence_score: number;
  reasoning: string;
  alternative_projects: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
  should_create_new: boolean;
  suggested_project_name?: string;
}

interface Activity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  confidence?: number;
  status?: string;
}

export default function DashboardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routingResult, setRoutingResult] =
    useState<SmartRoutingResponse | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoutingDialog, setShowRoutingDialog] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // 加载Dashboard数据
  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadItems();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const token = getCookie("accessToken");
      if (!token) {
        console.error("未找到访问令牌");
        return;
      }

      // 并行加载指标和活动数据
      const [metricsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/v1/dashboard/metrics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/v1/dashboard/activities", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data);
      }
    } catch (err) {
      console.error("加载Dashboard数据失败:", err);
    }
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const itemsData = await fetchItems();

      if (Array.isArray(itemsData)) {
        setItems(itemsData);
        if (itemsData.length === 0) {
          // 为了测试兼容性，当没有内容时显示空状态信息
          setError(null);
        }
      } else if (itemsData && "error" in itemsData && itemsData.error) {
        setError(itemsData.error);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("加载内容失败:", err);
      setError("加载内容时发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setRoutingResult(null);

    try {
      const token = getCookie("accessToken");
      if (!token) {
        setError("未找到访问令牌");
        return;
      }

      const response = await fetch("/api/v1/dashboard/analyze-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query_text: query,
          context: {},
        }),
      });

      if (!response.ok) {
        throw new Error("分析请求失败");
      }

      const result = await response.json();
      setRoutingResult(result.data);
      setShowRoutingDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 加载状态渲染
  if (isLoadingAuth) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="container py-10">
        <Alert>
          <AlertDescription>请先登录以使用智能问答功能</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/login">去登录</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要区域 - 智能问答 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 欢迎区域 */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                智能问答助手
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                告诉我你想了解什么
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                我会帮你找到最相关的项目和内容，并智能推荐最合适的归属
              </p>
            </div>

            {/* 智能问答输入区域 */}
            <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="h-5 w-5 text-primary" />
                  提出你的问题
                </CardTitle>
                <CardDescription className="text-base">
                  描述你想了解的内容，AI会智能分析并推荐最合适的项目
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleQuerySubmit} className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="例如：我想了解机器学习的最新进展..."
                      className="min-h-[120px] resize-none text-base pr-20 border-2 focus:border-primary/50"
                      disabled={isAnalyzing || isLoading}
                    />
                    <div className="absolute right-3 bottom-3 flex gap-2">
                      <Sheet
                        open={uploadDialogOpen}
                        onOpenChange={setUploadDialogOpen}
                      >
                        <SheetTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>智能文档处理</SheetTitle>
                            <SheetDescription>
                              上传文档，AI将自动分析并智能分类
                            </SheetDescription>
                          </SheetHeader>
                          <div className="py-6">
                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="font-medium">
                                拖放文件到这里或点击选择
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                支持 PDF, DOCX, TXT, MD 等格式
                              </p>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Mic className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isAnalyzing || !query.trim() || isLoading}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        AI正在分析...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        智能分析
                      </>
                    )}
                  </Button>
                </form>

                {/* 错误提示 */}
                {error && error !== "API返回了意外的数据格式" && (
                  <Alert
                    variant="destructive"
                    className="border-destructive/50"
                  >
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>错误</AlertTitle>
                    <AlertDescription>
                      {error === "API返回了意外的数据格式"
                        ? "服务器返回了意外的数据格式，这可能是一个临时问题。请尝试刷新页面。"
                        : error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* AI处理过程提示 */}
                {isAnalyzing && (
                  <Alert className="border-primary/50 bg-primary/5">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>AI正在理解你的问题...</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">💭 识别关键概念中...</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 内容展示区域 - 为了测试兼容性 */}
            {isLoading && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading content...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoading && items.length === 0 && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground mb-4">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No Items Yet</h3>
                    <p>
                      You don&apos;t have any content yet. Add one to get
                      started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoading && items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold">
                          {item.title || "Untitled"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.summary || "No summary"}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <Badge
                            variant={
                              item.processing_status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {item.processing_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 错误状态显示 */}
            {error === "API返回了意外的数据格式" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>错误</AlertTitle>
                <AlertDescription>
                  服务器返回了意外的数据格式，这可能是一个临时问题。请尝试刷新页面。
                </AlertDescription>
              </Alert>
            )}

            {/* 快速操作区域 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  快速开始
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  选择最适合的方式开始构建你的知识体系
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 justify-start border-dashed hover:border-solid hover:bg-primary/5 transition-all duration-300"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">上传文档</div>
                        <div className="text-xs text-muted-foreground">
                          PDF、Word、Markdown等格式
                        </div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 justify-start hover:bg-primary/5 transition-all duration-300"
                    asChild
                  >
                    <Link href="/content-library">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm">浏览内容库</div>
                          <div className="text-xs text-muted-foreground">
                            查看已收集的所有内容
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 justify-start hover:bg-primary/5 transition-all duration-300"
                    asChild
                  >
                    <Link href="/prompts">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm">AI 提示管理</div>
                          <div className="text-xs text-muted-foreground">
                            创建和管理智能提示词
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 侧边栏 - 价值指示器和活动流 */}
          <div className="space-y-8">
            {/* 价值增长指示器 */}
            {metrics && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    智能洞察
                  </CardTitle>
                  <CardDescription>
                    🔥 AI最近为你发现了跨领域的新联系
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {metrics.growth_indicators.active_projects}个项目正在增长
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {metrics.growth_indicators.processed_documents}
                      篇文档已处理
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {metrics.growth_indicators.ai_insights}个洞察已生成
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">知识积累进度</span>
                      <span className="text-sm text-muted-foreground">
                        {metrics.growth_indicators.processed_documents}/∞
                      </span>
                    </div>
                    <Progress value={75} className="h-3" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {metrics.growth_indicators.active_projects}
                      </div>
                      <div className="text-xs text-muted-foreground">项目</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {metrics.growth_indicators.processed_documents}
                      </div>
                      <div className="text-xs text-muted-foreground">文档</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {metrics.growth_indicators.ai_insights}
                      </div>
                      <div className="text-xs text-muted-foreground">洞察</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最近活动流 */}
            {activities && activities.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    最近活动
                  </CardTitle>
                  <CardDescription>
                    查看AI如何帮助你整理和分析内容
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {activities.slice(0, 10).map((activity, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            {index !== activities.length - 1 && (
                              <div className="w-px h-8 bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  AI
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {activity.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(activity.timestamp).toLocaleString(
                                    "zh-CN",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {activity.description}
                            </p>
                            {activity.confidence && (
                              <Badge variant="outline" className="text-xs mt-2">
                                置信度: {Math.round(activity.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* 如果没有活动，显示占位内容 */}
            {(!activities || activities.length === 0) && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    开始使用智能问答，这里将显示AI的处理活动
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 智能路由结果对话框 */}
        <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                智能路由建议
              </DialogTitle>
              <DialogDescription>AI为你推荐最合适的项目归属</DialogDescription>
            </DialogHeader>

            {routingResult && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium">分析结果</span>
                  <Badge
                    variant={
                      routingResult.confidence_score > 0.7
                        ? "default"
                        : "secondary"
                    }
                    className="text-sm"
                  >
                    置信度: {Math.round(routingResult.confidence_score * 100)}%
                  </Badge>
                </div>

                <Alert className="border-primary/50 bg-primary/5">
                  <AlertDescription className="text-sm leading-relaxed">
                    {routingResult.reasoning}
                  </AlertDescription>
                </Alert>

                {routingResult.recommended_project_id && (
                  <div className="space-y-4">
                    <Select defaultValue={routingResult.recommended_project_id}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={`${routingResult.recommended_project_name} (${Math.round(routingResult.confidence_score * 100)}%匹配度)`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value={routingResult.recommended_project_id}
                        >
                          {routingResult.recommended_project_name} (
                          {Math.round(routingResult.confidence_score * 100)}%)
                        </SelectItem>
                        {routingResult.alternative_projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} (
                            {Math.round(project.confidence * 100)}%)
                          </SelectItem>
                        ))}
                        <SelectItem value="new">创建新项目</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {routingResult.should_create_new && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        建议创建新项目
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      项目名称: {routingResult.suggested_project_name}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRoutingDialog(false)}
              >
                修改
              </Button>
              <Button onClick={() => setShowRoutingDialog(false)}>
                确认路由
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
