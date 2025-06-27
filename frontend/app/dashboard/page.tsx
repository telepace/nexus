"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  XCircle,
  Upload,
  Activity,
  Plus,
  Sparkles,
  TrendingUp,
  ExternalLink,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/client-auth";
import Link from "next/link";
import { fetchItems } from "@/components/actions/items-action-client";
import { ContentItemPublic } from "@/app/openapi-client/index";
import { getCookie } from "@/lib/client-auth";
import { Loading } from "@/components/ui/loading";
import MainLayout from "@/components/layout/MainLayout";

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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoadingAuth || isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "processing":
        return "处理中";
      case "pending":
        return "等待中";
      case "failed":
        return "失败";
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* 页面标题区域 */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  仪表板
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  管理你的内容库和项目进展
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/content-library">
                    <FileText className="h-4 w-4 mr-2" />
                    内容库
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/dashboard/add-item">
                    <Plus className="h-4 w-4 mr-2" />
                    添加内容
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 主要内容区域 */}
            <div className="lg:col-span-3 space-y-6">
              {/* 统计卡片 */}
              {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            项目总数
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {metrics.growth_indicators.active_projects}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            已处理文档
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {metrics.growth_indicators.processed_documents}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            AI 洞察
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {metrics.growth_indicators.ai_insights}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 最近的内容 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">最近的内容</h2>
                    <p className="text-sm text-muted-foreground">
                      查看最新添加和更新的内容项目
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/content-library">
                      查看全部
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                {error && error !== "API返回了意外的数据格式" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>错误</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {items.length === 0 && !error ? (
                  <Card className="border-0 bg-transparent">
                    <CardContent className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">还没有内容</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        开始添加你的第一个内容项目
                      </p>
                      <Button asChild>
                        <Link href="/dashboard/add-item">
                          <Plus className="h-4 w-4 mr-2" />
                          添加内容
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {items.slice(0, 5).map((item, index) => (
                      <div key={item.id}>
                        <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-base mb-1 truncate">
                                  {item.title || "无标题"}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {item.ai_result?.brief_description || "无摘要"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.type}
                                  </Badge>
                                  <Badge
                                    variant={getStatusColor(
                                      item.processing_status,
                                    )}
                                    className="text-xs"
                                  >
                                    {getStatusText(item.processing_status)}
                                  </Badge>
                                  {item.updated_at && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDate(item.updated_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                        {index < Math.min(items.length, 5) - 1 && (
                          <Separator className="ml-14" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {items.length > 5 && (
                  <div className="pt-4">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/content-library">
                        查看全部 {items.length} 个内容项目
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* 快速操作 */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">快速操作</h2>
                  <p className="text-sm text-muted-foreground">
                    快速访问常用功能和操作
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors">
                    <CardContent className="p-0">
                      <Button
                        variant="ghost"
                        className="w-full h-auto p-6 justify-start"
                        asChild
                      >
                        <Link href="/dashboard/add-item">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Upload className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">添加内容</div>
                              <div className="text-sm text-muted-foreground">
                                上传文档或添加链接
                              </div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-transparent hover:bg-muted/30 transition-colors">
                    <CardContent className="p-0">
                      <Button
                        variant="ghost"
                        className="w-full h-auto p-6 justify-start"
                        asChild
                      >
                        <Link href="/prompts">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">AI 提示管理</div>
                              <div className="text-sm text-muted-foreground">
                                创建和管理提示词
                              </div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 进度概览 */}
              {metrics && (
                <Card className="border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      进度概览
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>知识积累</span>
                        <span className="text-muted-foreground">
                          {metrics.growth_indicators.processed_documents}/100
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (metrics.growth_indicators.processed_documents /
                            100) *
                            100,
                          100,
                        )}
                        className="h-2"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          活跃项目
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {metrics.growth_indicators.active_projects}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          AI 洞察
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {metrics.growth_indicators.ai_insights}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 最近活动 */}
              {activities && activities.length > 0 ? (
                <Card className="border-0 bg-transparent">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4 text-primary" />
                      最近活动
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {activities.slice(0, 8).map((activity, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 bg-primary rounded-full" />
                              {index !== activities.slice(0, 8).length - 1 && (
                                <div className="w-px h-6 bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {activity.type === "content_processing"
                                    ? "处理"
                                    : "路由"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(activity.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm font-medium leading-tight">
                                {activity.title}
                              </p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 bg-transparent">
                  <CardContent className="p-6 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      暂无最近活动
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
