"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Search,
  FileText,
  Lightbulb,
  Tags,
  BarChart3,
  AlertCircle,
  Globe,
  Type,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/client-auth";
import { DetailedProcessingStatus } from "@/components/ui/DetailedProcessingStatus";
import { ProcessingStatusBadge } from "@/components/ui/ProcessingStatusBadge";
import type { ProcessingStatus } from "@/components/ui/ProcessingStatusBadge";
import MainLayout from "@/components/layout/MainLayout";

interface ContentProcessingItem {
  id: string;
  title: string;
  type: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  // AI 处理详细状态（模拟数据结构）
  ai_processing_details?: {
    summary_status: "pending" | "processing" | "completed" | "failed";
    key_points_status: "pending" | "processing" | "completed" | "failed";
    labels_status: "pending" | "processing" | "completed" | "failed";
    content_analysis_status: "pending" | "processing" | "completed" | "failed";
  };
}

interface ProcessingStats {
  total_items: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  ai_tasks_summary: {
    summary_completed: number;
    key_points_completed: number;
    labels_completed: number;
  };
}

export default function ProcessingMonitorPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentProcessingItem[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadProcessingData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 这里应该调用实际的 API，现在使用模拟数据
      const mockItems: ContentProcessingItem[] = [
        {
          id: "1",
          title: "机器学习基础教程",
          type: "url",
          processing_status: "processing",
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-15T10:35:00Z",
          ai_processing_details: {
            summary_status: "completed",
            key_points_status: "completed",
            labels_status: "processing",
            content_analysis_status: "completed",
          },
        },
        {
          id: "2",
          title: "深度学习算法详解",
          type: "pdf",
          processing_status: "completed",
          created_at: "2024-01-15T09:15:00Z",
          updated_at: "2024-01-15T09:45:00Z",
          ai_processing_details: {
            summary_status: "completed",
            key_points_status: "completed",
            labels_status: "completed",
            content_analysis_status: "completed",
          },
        },
        {
          id: "3",
          title: "Python 编程指南",
          type: "text",
          processing_status: "failed",
          created_at: "2024-01-15T08:20:00Z",
          updated_at: "2024-01-15T08:25:00Z",
          error_message: "标签生成失败：API 调用超时",
          ai_processing_details: {
            summary_status: "completed",
            key_points_status: "completed",
            labels_status: "failed",
            content_analysis_status: "completed",
          },
        },
      ];

      const mockStats: ProcessingStats = {
        total_items: 45,
        pending: 8,
        processing: 12,
        completed: 20,
        failed: 5,
        ai_tasks_summary: {
          summary_completed: 32,
          key_points_completed: 30,
          labels_completed: 25,
        },
      };

      setItems(mockItems);
      setStats(mockStats);
      setLastRefresh(new Date());
    } catch (err) {
      setError("加载监控数据失败");
      console.error("Loading processing data failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProcessingData();

    // 设置自动刷新
    const interval = setInterval(loadProcessingData, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  // 模拟 API 调用重新处理
  const retryProcessing = async (itemId: string) => {
    console.log(`重新处理项目: ${itemId}`);
    // 这里应该调用实际的重新处理 API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await loadProcessingData();
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!user?.is_superuser) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">访问被拒绝</h3>
                <p className="text-muted-foreground">
                  只有管理员可以访问处理监控页面
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">处理监控</h1>
            <p className="text-muted-foreground">
              实时监控内容处理状态和 AI 任务进度
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProcessingData}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
            <span className="text-xs text-muted-foreground">
              上次更新: {formatTime(lastRefresh.toISOString())}
            </span>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">总内容数</p>
                    <p className="text-2xl font-bold">{stats.total_items}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">摘要完成</p>
                    <p className="text-2xl font-bold">
                      {stats.ai_tasks_summary.summary_completed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">要点完成</p>
                    <p className="text-2xl font-bold">
                      {stats.ai_tasks_summary.key_points_completed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">标签完成</p>
                    <p className="text-2xl font-bold">
                      {stats.ai_tasks_summary.labels_completed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 过滤和搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">搜索内容</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="搜索标题..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status-filter">状态筛选</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">等待处理</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容列表 */}
        <Card>
          <CardHeader>
            <CardTitle>处理任务详情</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">没有找到匹配的处理任务</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-blue-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {item.type === "url" && (
                              <Globe className="h-4 w-4 text-blue-500" />
                            )}
                            {item.type === "pdf" && (
                              <FileText className="h-4 w-4 text-red-500" />
                            )}
                            {item.type === "text" && (
                              <Type className="h-4 w-4 text-gray-500" />
                            )}
                            <CardTitle className="text-base">
                              {item.title}
                            </CardTitle>
                          </div>
                          <ProcessingStatusBadge
                            status={item.processing_status}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.updated_at)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* AI 处理详情 */}
                        {item.ai_processing_details && (
                          <DetailedProcessingStatus
                            overallStatus={
                              item.processing_status as ProcessingStatus
                            }
                            steps={{
                              content_extraction: "completed",
                              summary:
                                item.ai_processing_details.summary_status,
                              key_points:
                                item.ai_processing_details.key_points_status,
                              labels: item.ai_processing_details.labels_status,
                            }}
                            compact
                          />
                        )}

                        {/* 错误信息 */}
                        {item.error_message && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                处理失败
                              </p>
                              <p className="text-sm text-red-600 mt-1">
                                {item.error_message}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryProcessing(item.id)}
                              className="ml-auto"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              重试
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
