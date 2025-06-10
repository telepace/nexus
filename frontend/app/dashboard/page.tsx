"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  Loader2,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/client-auth";
import Link from "next/link";

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
  const [error, setError] = useState<string | null>(null);

  // 加载Dashboard数据
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // 并行加载指标和活动数据
      const [metricsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/metrics", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }),
        fetch("/api/dashboard/activities", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setRoutingResult(null);

    try {
      const response = await fetch("/api/dashboard/analyze-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {/* 欢迎区域 */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">智能问答助手</h1>
        <p className="text-muted-foreground text-lg">
          告诉我你想了解什么，我会帮你找到最相关的项目和内容
        </p>
      </div>

      {/* 问题输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            提出你的问题
          </CardTitle>
          <CardDescription>
            描述你想了解的内容，AI会智能分析并推荐最合适的项目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuerySubmit} className="space-y-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例如：我想了解机器学习的最新进展..."
              className="text-lg py-3"
              disabled={isAnalyzing}
            />
            <Button
              type="submit"
              disabled={isAnalyzing || !query.trim()}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI正在分析...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  智能分析
                </>
              )}
            </Button>
          </form>

          {/* 错误提示 */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 路由结果 */}
          {routingResult && (
            <div className="mt-6 space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">AI 分析结果</h3>
                  <Badge
                    variant={
                      routingResult.confidence_score > 0.7
                        ? "default"
                        : "secondary"
                    }
                  >
                    置信度: {Math.round(routingResult.confidence_score * 100)}%
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {routingResult.reasoning}
                </p>

                {routingResult.recommended_project_id ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        推荐项目: {routingResult.recommended_project_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        点击查看项目详情
                      </p>
                    </div>
                    <Button asChild>
                      <Link
                        href={`/projects/${routingResult.recommended_project_id}`}
                      >
                        查看项目 <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : routingResult.should_create_new ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        建议创建新项目: {routingResult.suggested_project_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        为这个主题创建专门的项目
                      </p>
                    </div>
                    <Button asChild>
                      <Link
                        href={`/dashboard/add-item?title=${encodeURIComponent(routingResult.suggested_project_name || "")}`}
                      >
                        创建项目 <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}

                {/* 备选项目 */}
                {routingResult.alternative_projects.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">其他相关项目:</p>
                    <div className="space-y-2">
                      {routingResult.alternative_projects.map(
                        (project, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                          >
                            <span>{project.name}</span>
                            <Badge variant="outline">
                              {Math.round(project.confidence * 100)}%
                            </Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 价值指标 */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃项目</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.growth_indicators.active_projects}
              </div>
              <p className="text-xs text-muted-foreground">
                正在进行的项目数量
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">处理文档</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.growth_indicators.processed_documents}
              </div>
              <p className="text-xs text-muted-foreground">
                已完成AI处理的文档
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI洞察</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.growth_indicators.ai_insights}
              </div>
              <p className="text-xs text-muted-foreground">
                智能路由和分析次数
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 最近活动 */}
      {activities && activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近的AI处理活动</CardTitle>
            <CardDescription>查看AI如何帮助你整理和分析内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg border"
                >
                  <div className="flex-shrink-0">
                    {activity.type === "routing" ? (
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                    ) : activity.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : activity.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.confidence && (
                        <Badge variant="outline" className="text-xs">
                          置信度: {Math.round(activity.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link href="/dashboard/add-item">
                <div className="text-left">
                  <div className="font-medium">添加新内容</div>
                  <div className="text-sm text-muted-foreground">
                    上传文档或添加链接
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link href="/prompts">
                <div className="text-left">
                  <div className="font-medium">管理提示词</div>
                  <div className="text-sm text-muted-foreground">
                    创建和编辑AI提示词
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
