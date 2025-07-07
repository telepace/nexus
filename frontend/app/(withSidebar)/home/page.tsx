"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  ArrowRight,
  Settings,
  Search,
  Paperclip,
  Info,
  Send,
  BookOpen,
  BarChart3,
  Flame,
  Inbox,
  Brain,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/client-auth";
import Link from "next/link";
import { fetchItems } from "@/components/actions/items-action-client";
import { ContentItemPublic } from "@/app/openapi-client/index";
import { getCookie } from "@/lib/client-auth";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

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

// GitHub 风格贡献图组件
const ContributionGraph = ({ className }: { className?: string }) => {
  // 生成过去一年的贡献数据
  const generateContributionData = () => {
    const weeks = 52;
    const data = [];
    for (let week = 0; week < weeks; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        // 随机生成贡献级别 0-4
        const level = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0;
        weekData.push(level);
      }
      data.push(weekData);
    }
    return data;
  };

  const contributionData = generateContributionData();
  const totalContributions = contributionData
    .flat()
    .filter((level) => level > 0).length;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-100 p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-900 mb-1">成长足迹</div>
        <div className="text-xs text-gray-500">
          过去一年共学习{" "}
          <span className="font-semibold text-gray-700">
            {totalContributions}
          </span>{" "}
          天
        </div>
      </div>

      <div className="relative">
        {/* 月份标签 */}
        <div className="grid grid-cols-12 gap-0.5 mb-1 pl-3 text-xs text-gray-400">
          {[
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
          ].map((month, index) => (
            <span key={index} className="text-center">
              {month}
            </span>
          ))}
        </div>

        {/* 贡献网格 */}
        <div className="flex gap-0.5">
          {/* 星期标签 */}
          <div className="flex flex-col gap-0.5 w-3 text-xs text-gray-400">
            <span className="h-2.5 leading-none">Mon</span>
            <span className="h-2.5 leading-none"></span>
            <span className="h-2.5 leading-none">Wed</span>
            <span className="h-2.5 leading-none"></span>
            <span className="h-2.5 leading-none">Fri</span>
            <span className="h-2.5 leading-none"></span>
            <span className="h-2.5 leading-none"></span>
          </div>

          {/* 贡献单元格 */}
          <div className="grid grid-flow-col grid-rows-7 gap-0.5 flex-1">
            {contributionData.map((week, weekIndex) =>
              week.map((level, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    "w-2.5 h-2.5 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-gray-400",
                    level === 0 && "bg-gray-100",
                    level === 1 && "bg-green-200",
                    level === 2 && "bg-green-300",
                    level === 3 && "bg-green-500",
                    level === 4 && "bg-green-700",
                  )}
                  title={`${level} 个洞察 · ${new Date().toLocaleDateString()}`}
                />
              )),
            )}
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 bg-gray-100 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-200 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-300 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-green-700 rounded-sm" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

// 获取时间问候语
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "早上好", icon: "🌅" };
  if (hour < 18) return { text: "下午好", icon: "☀️" };
  return { text: "晚上好", icon: "🌙" };
};

export default function HomePage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"Ask" | "Research" | "Build">(
    "Ask",
  );

  const greeting = getGreeting();

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
    return <Loading />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Notion 风格极简导航 */}
      <div className="h-11 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-sm bg-white/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-900 rounded-md flex items-center justify-center text-white text-xs font-semibold">
              N
            </div>
            <span className="font-medium text-gray-900 text-sm">Nexus</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-7 h-7 hover:bg-gray-100 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <Link href="/settings">
            <button className="w-7 h-7 hover:bg-gray-100 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full ml-1" />
        </div>
      </div>

      {/* 主内容容器 */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* 问候语区域 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-xl">
            {greeting.icon}
          </div>
          <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
            {greeting.text}
          </h1>
        </div>

        {/* 大型输入区域 */}
        <div className="mb-12">
          <div className="relative mb-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在这里输入任何想法、粘贴链接，或描述想要探索的主题..."
              className="w-full min-h-[140px] p-5 border border-gray-200 rounded-xl bg-white text-base text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-sm hover:shadow-md"
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1">
              {["Ask", "Research", "Build"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    activeTab === tab
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
                <Info className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors ml-1">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主内容区域 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 学习轨迹 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  学习轨迹
                </h2>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="space-y-4">
                  {metrics?.recent_active_projects
                    ?.slice(0, 3)
                    .map((project, index) => (
                      <div
                        key={project.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0",
                            index === 0
                              ? "bg-blue-500 border-blue-500"
                              : "bg-gray-100 border-gray-300",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {project.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {index === 0
                              ? "进行中 · 今天"
                              : "已完成 · " + formatDate(project.updated_at)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )) || (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        开始你的第一个学习项目
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 洞察积累 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-gray-600" />
                <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  洞察积累
                </h2>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="space-y-4">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="text-sm text-gray-900 leading-relaxed mb-2">
                        {item.ai_result?.brief_description ||
                          "AI 正在分析这个内容，将为你提供独特的洞察和见解。"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">{item.title}</span>
                        <span>·</span>
                        <span>{formatDate(item.updated_at || "")}</span>
                      </div>
                    </div>
                  ))}

                  <Link href="/content-library">
                    <button className="w-full py-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium">
                      查看全部洞察
                    </button>
                  </Link>
                </div>
              </div>
            </section>

            {/* 成长足迹 */}
            <ContributionGraph />
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 推荐空间 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  推荐空间
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <div className="text-lg">🎨</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      UI/UX设计进阶
                    </div>
                    <div className="text-xs text-gray-500">
                      基于你的设计兴趣
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <div className="text-lg">🤖</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      AI工具应用
                    </div>
                    <div className="text-xs text-gray-500">热门推荐</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <div className="text-lg">📈</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      数据可视化
                    </div>
                    <div className="text-xs text-gray-500">技能补充</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 待处理内容 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Inbox className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  待处理内容
                </h3>
              </div>

              <div className="space-y-3 mb-4">
                {items
                  .filter((item) => item.processing_status === "pending")
                  .slice(0, 3)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {item.title || "无标题内容"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.type} · {formatDate(item.updated_at || "")}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <Link href="/content-library">
                <button className="w-full py-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium">
                  处理全部
                </button>
              </Link>
            </div>

            {/* 热门话题 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  热门话题
                </h3>
              </div>

              <div className="space-y-2">
                {[
                  { name: "GPT-4", count: 256 },
                  { name: "设计系统", count: 189 },
                  { name: "产品思维", count: 134 },
                  { name: "远程工作", count: 98 },
                  { name: "用户体验", count: 87 },
                ].map((topic) => (
                  <div
                    key={topic.name}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="text-sm text-gray-700 font-medium">
                      {topic.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {topic.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 本周概览 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  本周概览
                </h3>
              </div>

              {metrics && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">学习时间</span>
                    <span className="text-sm font-medium text-gray-900">
                      12.5h
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">活跃项目</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.growth_indicators.active_projects}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">AI 洞察</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.growth_indicators.ai_insights}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">知识连接</span>
                    <span className="text-sm font-medium text-gray-900">7</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
