"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Button } from "./button";
import {
  BarChart3,
  TrendingUp,
  Network,
  Eye,
  Clock,
  Target,
  Zap,
  Users,
  BookOpen,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Filter,
  Search,
} from "lucide-react";
import {
  referenceGraphService,
  type ReferenceNode,
  type ReferenceCluster,
} from "@/lib/services/ReferenceGraphService";

/**
 * 📊 引用分析仪表盘
 *
 * 设计理念：
 * - 数据驱动的洞察
 * - 交互式可视化
 * - 实时分析反馈
 * - 个性化推荐
 */

export interface ReferenceAnalyticsDashboardProps {
  contentId?: string;
  timeRange?: "day" | "week" | "month" | "year" | "all";
  showAdvancedMetrics?: boolean;
  onReferenceSelect?: (refId: number, contentId: string) => void;
  className?: string;
}

interface AnalyticsData {
  totalReferences: number;
  averageImportance: number;
  topCategories: Array<{ category: string; count: number }>;
  mostImportantReferences: ReferenceNode[];
  recentlyAccessed: ReferenceNode[];
  clusters: ReferenceCluster[];
  trendData: Array<{ date: string; references: number; importance: number }>;
  heatmapData: Array<{ hour: number; day: number; activity: number }>;
}

const ReferenceAnalyticsDashboard: React.FC<
  ReferenceAnalyticsDashboardProps
> = ({
  contentId,
  timeRange = "week",
  showAdvancedMetrics = true,
  onReferenceSelect,
  className,
}) => {
  // 状态管理
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // 模拟数据生成（实际应用中应从服务获取）
  const generateMockAnalytics = useMemo((): AnalyticsData => {
    const baseStats = referenceGraphService.getReferenceStats(contentId);

    // 生成趋势数据
    const trendData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split("T")[0],
        references: Math.floor(Math.random() * 20) + 5,
        importance: Math.random() * 0.8 + 0.2,
      };
    });

    // 生成热力图数据
    const heatmapData = Array.from({ length: 7 * 24 }, (_, i) => ({
      day: Math.floor(i / 24),
      hour: i % 24,
      activity: Math.random() * 100,
    }));

    return {
      ...baseStats,
      trendData,
      heatmapData,
    };
  }, [contentId]);

  // 加载分析数据
  useEffect(() => {
    setIsLoading(true);

    // 模拟异步加载
    setTimeout(() => {
      setAnalyticsData(generateMockAnalytics);
      setIsLoading(false);
    }, 1000);
  }, [contentId, timeRange, generateMockAnalytics]);

  // 渲染概览卡片
  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const cards = [
      {
        title: "总引用数",
        value: analyticsData.totalReferences,
        icon: BookOpen,
        change: "+12%",
        isPositive: true,
        description: "比上周增加",
      },
      {
        title: "平均重要性",
        value: (analyticsData.averageImportance * 100).toFixed(1) + "%",
        icon: Star,
        change: "+5%",
        isPositive: true,
        description: "质量提升",
      },
      {
        title: "活跃引用",
        value: analyticsData.recentlyAccessed.length,
        icon: Activity,
        change: "+8%",
        isPositive: true,
        description: "最近访问",
      },
      {
        title: "知识聚类",
        value: analyticsData.clusters.length,
        icon: Network,
        change: "持平",
        isPositive: null,
        description: "主题分组",
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <div className="flex items-center mt-2">
                      {card.isPositive !== null && (
                        <>
                          {card.isPositive ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-sm ${
                              card.isPositive
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {card.change}
                          </span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground ml-2">
                        {card.description}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <card.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>

              {/* 装饰性渐变 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50" />
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  // 渲染分类分布
  const renderCategoryDistribution = () => {
    if (!analyticsData) return null;

    const maxCount = Math.max(
      ...analyticsData.topCategories.map((c) => c.count),
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            主题分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.topCategories.map((category, index) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="capitalize">
                    {category.category}
                  </Badge>
                  <Progress
                    value={(category.count / maxCount) * 100}
                    className="flex-1 max-w-40"
                  />
                </div>
                <span className="text-sm font-medium min-w-[3rem] text-right">
                  {category.count}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染重要引用排行
  const renderTopReferences = () => {
    if (!analyticsData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            重要引用排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.mostImportantReferences.map((ref, index) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onReferenceSelect?.(ref.refId, ref.contentId)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ref.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {ref.snippet}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {ref.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      重要性: {(ref.importance * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Progress
                    value={ref.importance * 100}
                    className="w-16 mb-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    访问 {ref.metadata.accessCount}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染知识聚类
  const renderKnowledgeClusters = () => {
    if (!analyticsData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            知识聚类分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analyticsData.clusters.map((cluster, index) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedCluster === cluster.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() =>
                  setSelectedCluster(
                    selectedCluster === cluster.id ? null : cluster.id,
                  )
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{cluster.name}</h4>
                  <Badge variant="outline">{cluster.size} 个引用</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      一致性:
                    </span>
                    <Progress
                      value={cluster.coherence * 100}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium">
                      {(cluster.coherence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    核心内容: {cluster.centroid.snippet.slice(0, 60)}...
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {cluster.centroid.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染趋势图表
  const renderTrendChart = () => {
    if (!analyticsData) return null;

    const maxRefs = Math.max(
      ...analyticsData.trendData.map((d) => d.references),
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            引用趋势分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-1">
            {analyticsData.trendData.map((data, index) => (
              <motion.div
                key={data.date}
                initial={{ height: 0 }}
                animate={{ height: `${(data.references / maxRefs) * 100}%` }}
                transition={{ delay: index * 0.02 }}
                className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t-sm min-h-[4px] hover:from-primary/80 hover:to-primary/30 transition-colors cursor-pointer"
                title={`${data.date}: ${data.references} 引用`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-4 text-sm text-muted-foreground">
            <span>30天前</span>
            <span>今天</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {analyticsData.trendData
                  .slice(-7)
                  .reduce((sum, d) => sum + d.references, 0)}
              </p>
              <p className="text-sm text-muted-foreground">本周引用</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(
                  (analyticsData.trendData
                    .slice(-7)
                    .reduce((sum, d) => sum + d.importance, 0) /
                    7) *
                  100
                ).toFixed(1)}
                %
              </p>
              <p className="text-sm text-muted-foreground">平均质量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                +{Math.round(Math.random() * 20 + 5)}%
              </p>
              <p className="text-sm text-muted-foreground">周环比</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染活动热力图
  const renderActivityHeatmap = () => {
    if (!analyticsData) return null;

    const days = ["日", "一", "二", "三", "四", "五", "六"];
    const maxActivity = Math.max(
      ...analyticsData.heatmapData.map((d) => d.activity),
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            活动热力图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-2">
                <span className="text-sm font-medium w-4">{day}</span>
                <div className="flex gap-1">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const data = analyticsData.heatmapData.find(
                      (d) => d.day === dayIndex && d.hour === hour,
                    );
                    const intensity = data ? data.activity / maxActivity : 0;

                    return (
                      <motion.div
                        key={hour}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (dayIndex * 24 + hour) * 0.001 }}
                        className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-110"
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                        title={`${day} ${hour}:00 - 活动度: ${Math.round(intensity * 100)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">活动强度:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />
                <span className="text-xs">低</span>
                <div className="w-3 h-3 rounded-sm bg-blue-300 border border-blue-400" />
                <span className="text-xs">中</span>
                <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600" />
                <span className="text-xs">高</span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              筛选时段
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">引用分析洞察</h2>
          <p className="text-muted-foreground">
            深度分析引用模式，发现知识关联
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            搜索引用
          </Button>
          <Button variant="outline" size="sm">
            导出数据
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      {renderOverviewCards()}

      {/* 主要内容标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="trends">趋势</TabsTrigger>
          <TabsTrigger value="clusters">聚类</TabsTrigger>
          <TabsTrigger value="activity">活动</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderCategoryDistribution()}
            {renderTopReferences()}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {renderTrendChart()}
        </TabsContent>

        <TabsContent value="clusters" className="space-y-6">
          {renderKnowledgeClusters()}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {renderActivityHeatmap()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferenceAnalyticsDashboard;
