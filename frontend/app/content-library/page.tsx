"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  FileText,
  Link,
  AlertCircle,
  Loader2,
  Download,
  Share2,
  Search,
  Calendar,
  Clock,
  Brain,
  Target,
  Trash2,
  MoreVertical,
  Star,
  Tag,
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { ShareContentModal } from "@/components/share/ShareContentModal";
import {
  ProcessingStatusBadge,
  ProcessingStatus,
} from "@/components/ui/ProcessingStatusBadge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";
import { eventBus } from "@/lib/event-bus";
import { contentApi } from "@/lib/services/content-api";
import { FavoriteButton } from "@/components/actions/FavoriteButton";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Define the ContentItemPublic type based on backend schema
interface AIResultPublic {
  summary?: {
    main_thesis?: string;
    key_arguments?: string[];
  } | null;
  key_points?: {
    core_concepts?: Array<{ point: string; category: string }>;
  } | null;
  labels?: string[] | null;
  content_quality_score?: number | null;
  difficulty_level?: string | null;
  reading_time_minutes?: number | null;
}

interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  ai_result?: AIResultPublic | null;
}

// Content type icons mapping
const getContentIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "url":
      return <Link className="h-4 w-4" />;
    case "text":
      return <BookOpen className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// 简单的防抖函数
function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number,
) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// AI分析结果展示组件
const AIAnalysisCard = ({
  analysis,
}: {
  analysis: AIResultPublic | null | undefined;
}) => {
  if (!analysis) return null;

  const { summary, key_points, labels } = analysis;

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Brain className="h-4 w-4" />
        AI 智能分析
      </div>

      {summary && summary.main_thesis && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              智能总结
            </span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed line-clamp-3">
            {summary.main_thesis}
          </p>
        </div>
      )}

      {key_points && key_points.core_concepts && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              关键要点
            </span>
          </div>
          <ul className="space-y-1">
            {key_points.core_concepts.slice(0, 2).map((point, i) => (
              <li
                key={i}
                className="text-sm text-emerald-800 dark:text-emerald-200"
              >
                - {point.point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {labels && labels.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              智能标签
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="text-xs bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ContentLibraryPage() {
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // 添加分享状态管理
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reprocessingItems, setReprocessingItems] = useState<Set<string>>(
    new Set(),
  );
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  // 添加性能监控状态
  const [prefetchStats, setPrefetchStats] = useState({
    total: 0,
    cached: 0,
    inProgress: false,
  });

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 恢复导航状态
  useEffect(() => {
    const savedState = navigationState.getLibraryState();
    if (savedState) {
      setSearchQuery(savedState.searchQuery || "");
      setStatusFilter(savedState.statusFilter || "all");
      setTypeFilter(savedState.typeFilter || "all");
    }
  }, []);

  // 保存状态变化
  useEffect(() => {
    navigationState.saveLibraryState({
      searchQuery,
      statusFilter,
      typeFilter,
      selectedItem: selectedItem?.id || null,
    });
  }, [searchQuery, statusFilter, typeFilter, selectedItem]);

  // 在数据加载完成后恢复滚动位置
  useEffect(() => {
    if (!loading && items.length > 0) {
      const savedState = navigationState.getLibraryState();
      if (savedState.scrollPosition > 0) {
        setTimeout(() => {
          window.scrollTo({ top: savedState.scrollPosition, behavior: "auto" });
        }, 100);
      }

      // 恢复选中的项目
      if (savedState.selectedItem) {
        const item = items.find((item) => item.id === savedState.selectedItem);
        if (item) {
          setSelectedItem(item);
        }
      }
    }
  }, [loading, items]);

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      navigationState.saveLibraryState({
        scrollPosition: window.scrollY,
      });
    };

    const debouncedHandleScroll = debounce(handleScroll, 300);
    window.addEventListener("scroll", debouncedHandleScroll);

    return () => {
      window.removeEventListener("scroll", debouncedHandleScroll);
    };
  }, []);

  // Filter items based on search and filters
  useEffect(() => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.ai_result?.summary?.main_thesis
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (item) => item.processing_status === statusFilter,
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, statusFilter, typeFilter]);

  // Handle Open Reader
  const handleOpenReader = useCallback(
    (item: ContentItemPublic) => {
      // 快速跳转，让服务器端预取和骨架屏处理加载状态
      router.push(`/content-library/reader/${item.id}`);
    },
    [router],
  );

  // 预加载内容详情
  const prefetchContent = useCallback(
    async (item: ContentItemPublic) => {
      // 如果已经缓存了，不需要重复预加载
      if (contentCache.has(`content-detail-${item.id}`)) {
        return;
      }

      try {
        const token = user?.token || getCookie("accessToken");
        if (!token) return;

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // 预加载内容详情和markdown
        const [contentResponse, markdownResponse] = await Promise.allSettled([
          fetch(`${apiUrl}/api/v1/content/${item.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }),
          fetch(`${apiUrl}/api/v1/content/${item.id}/markdown`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }),
        ]);

        // 缓存结果
        if (
          contentResponse.status === "fulfilled" &&
          contentResponse.value.ok
        ) {
          const contentData = await contentResponse.value.json();
          contentCache.setContentDetail(item.id, contentData);
        }

        if (
          markdownResponse.status === "fulfilled" &&
          markdownResponse.value.ok
        ) {
          const markdownData = await markdownResponse.value.json();
          contentCache.setMarkdownContent(
            item.id,
            markdownData.markdown_content,
          );
        }
      } catch (error) {
        console.debug("Prefetch failed:", error);
        // 预加载失败不影响用户体验
      }
    },
    [user],
  );

  // 批量预加载内容详情
  const batchPrefetchContent = useCallback(
    async (items: ContentItemPublic[]) => {
      const token = user?.token || getCookie("accessToken");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      // 只预加载已完成处理的前15个内容
      const itemsToPrefetch = items
        .filter((item) => item.processing_status === "completed")
        .slice(0, 15);

      console.log(`🚀 开始批量预加载 ${itemsToPrefetch.length} 个内容...`);

      setPrefetchStats((prev) => ({
        ...prev,
        total: itemsToPrefetch.length,
        inProgress: true,
      }));

      const prefetchPromises = itemsToPrefetch.map(async (item) => {
        // 跳过已缓存的内容
        if (contentCache.has(`content-detail-${item.id}`)) {
          setPrefetchStats((prev) => ({
            ...prev,
            cached: prev.cached + 1,
          }));
          return;
        }

        try {
          const [contentResponse, markdownResponse] = await Promise.allSettled([
            fetch(`${apiUrl}/api/v1/content/${item.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            }),
            fetch(`${apiUrl}/api/v1/content/${item.id}/markdown`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
            }),
          ]);

          // 缓存结果
          if (
            contentResponse.status === "fulfilled" &&
            contentResponse.value.ok
          ) {
            const contentData = await contentResponse.value.json();
            contentCache.setContentDetail(item.id, contentData);
          }

          if (
            markdownResponse.status === "fulfilled" &&
            markdownResponse.value.ok
          ) {
            const markdownData = await markdownResponse.value.json();
            contentCache.setMarkdownContent(
              item.id,
              markdownData.markdown_content,
            );
          }

          setPrefetchStats((prev) => ({
            ...prev,
            cached: prev.cached + 1,
          }));
        } catch (error) {
          console.debug(`预加载内容 ${item.id} 失败:`, error);
        }
      });

      // 并行执行所有预加载，但不阻塞主流程
      Promise.allSettled(prefetchPromises).then(() => {
        console.log(
          `✅ 批量预加载完成，已缓存 ${itemsToPrefetch.length} 个内容`,
        );
        setPrefetchStats((prev) => ({
          ...prev,
          inProgress: false,
        }));
      });
    },
    [user],
  );

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!filteredItems.length) return;

      const currentIndex = selectedItem
        ? filteredItems.findIndex((item) => item.id === selectedItem.id)
        : -1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = Math.min(
            currentIndex + 1,
            filteredItems.length - 1,
          );
          setSelectedItem(filteredItems[nextIndex]);
          break;

        case "ArrowUp":
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          setSelectedItem(filteredItems[prevIndex]);
          break;

        case "Enter":
          e.preventDefault();
          if (selectedItem && selectedItem.processing_status === "completed") {
            handleOpenReader(selectedItem);
          }
          break;

        case "Escape":
          e.preventDefault();
          setSelectedItem(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedItem, handleOpenReader]);

  // Handle Share
  const handleShare = (item: ContentItemPublic) => {
    setSelectedItem(item);
    setIsShareModalOpen(true);
  };

  // Handle Download
  const handleDownload = async (item: ContentItemPublic) => {
    try {
      const token = user?.token || getCookie("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/content/${item.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.title || "content"}.${item.type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("下载失败，请重试");
    }
  };

  // 订阅来自 AddContentModal 的本地事件，立即更新内容列表
  useEffect(() => {
    const handler = (item: ContentItemPublic) => {
      setItems((prev) => {
        // 避免重复插入
        if (prev.some((existing) => existing.id === item.id)) {
          return prev;
        }
        // 将新项目添加到顶部
        return [item, ...prev];
      });

      // 清除缓存，确保后续刷新数据准确
      contentCache.clearContentList();

      toast.success(`新内容已添加: ${item.title || "未知内容"}`);
    };

    eventBus.on("contentCreated", handler);

    return () => {
      eventBus.off("contentCreated", handler);
    };
  }, []);

  // 重新处理内容项
  const handleReprocess = async (item: ContentItemPublic) => {
    try {
      setReprocessingItems((prev) => new Set(prev).add(item.id));

      await contentApi.reprocessContentItem(item.id);

      // 更新本地状态
      setItems((prevItems) =>
        prevItems.map((prevItem) =>
          prevItem.id === item.id
            ? { ...prevItem, processing_status: "processing" }
            : prevItem,
        ),
      );

      // 更新选中项
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) =>
          prev ? { ...prev, processing_status: "processing" } : null,
        );
      }

      toast.success("已开始重新处理内容");
    } catch (error) {
      console.error("重新处理失败:", error);
      toast.error("重新处理失败，请稍后重试");
    } finally {
      setReprocessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Handle Delete
  const handleDelete = async (item: ContentItemPublic) => {
    if (!confirm(`确定删除「${item.title || "无标题"}」? 删除后不可恢复。`)) {
      return;
    }
    setDeletingItems((prev) => new Set(prev).add(item.id));
    try {
      await contentApi.deleteContentItem(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      toast.success("删除成功");
    } catch (error) {
      console.error(error);
      toast.error("删除失败");
    } finally {
      setDeletingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // ContentItemCard 组件移动到这里，作为内部组件
  const ContentItemCard = ({ item }: { item: ContentItemPublic }) => {
    const isSelected = selectedItem?.id === item.id;
    
    return (
      <Card
        key={item.id}
        className={`cursor-pointer transition-all duration-300 ease-in-out relative group border ${
          isSelected
            ? "ring-2 ring-primary shadow-lg"
            : "hover:shadow-md hover:border-primary/20"
        }`}
        onMouseEnter={() => {
          setSelectedItem(item);
          prefetchContent(item);
        }}
        onClick={() => handleOpenReader(item)}
      >
        <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
          <div className="flex-1">
            <CardTitle className="text-base leading-tight pr-8">
              {item.title || "未命名内容"}
            </CardTitle>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {item.ai_result?.content_quality_score != null && (
              <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                {Array.from({ length: 5 }, (_, i) => {
                  const starCount = item.ai_result.content_quality_score >= 0.9 ? 5 :
                                   item.ai_result.content_quality_score >= 0.8 ? 4 :
                                   item.ai_result.content_quality_score >= 0.7 ? 3 :
                                   item.ai_result.content_quality_score >= 0.6 ? 2 : 1;
                  return (
                    <Star 
                      key={i} 
                      className={`h-3 w-3 ${
                        i < starCount 
                          ? "text-amber-500 fill-current" 
                          : "text-gray-300"
                      }`} 
                    />
                  );
                })}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => handleShare(item)}>
                  <Share2 className="mr-2 h-4 w-4" /> 分享
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(item)}>
                  <Download className="mr-2 h-4 w-4" /> 下载
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  disabled={deletingItems.has(item.id)}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deletingItems.has(item.id) ? "删除中..." : "删除"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center text-xs text-muted-foreground mb-3 space-x-4">
            <div className="flex items-center gap-1.5">
              {getContentIcon(item.type)}
              <span>{item.type.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            {item.ai_result?.reading_time_minutes != null && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{item.ai_result.reading_time_minutes} 分钟阅读</span>
              </div>
            )}
          </div>
          <ProcessingStatusBadge
            status={item.processing_status as ProcessingStatus}
            isReprocessing={reprocessingItems.has(item.id)}
            onReprocess={() => handleReprocess(item)}
          />

          {item.ai_result?.labels && item.ai_result.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.ai_result.labels.slice(0, 5).map((label) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    // Wait for auth to complete
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);

        // 先尝试从缓存获取数据
        const cachedItems = null; // contentCache.getContentList(); // 临时禁用缓存
        if (cachedItems) {
          console.log(`📦 从缓存加载 ${cachedItems.length} 个内容项`);
          setItems(cachedItems);
          setLoading(false);

          // 即使有缓存，也在后台启动批量预加载以更新数据
          setTimeout(() => {
            batchPrefetchContent(cachedItems);
          }, 1000);
          return;
        }

        // Get token from user object or cookie
        const token = user?.token || getCookie("accessToken");

        if (!token) {
          setError("No authentication token found. Please log in again.");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        console.log("🚀 Fetching content items...", {
          apiUrl: `${apiUrl}/api/v1/content/`,
          hasToken: !!token,
          tokenLength: token?.length,
          userEmail: user?.email,
        });

        // Use the correct API endpoint with authentication
        const response = await fetch(`${apiUrl}/api/v1/content/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        console.log(" API Response:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.error("🔒 Authentication failed");
            setError("Authentication failed. Please log in again.");
            router.push("/login");
            return;
          }

          const errorData = await response.text();
          console.error("❌ API Error:", errorData);
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        console.log("✅ Content items loaded:", {
          count: data.length,
          items: data.map((item: ContentItemPublic) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            ai_result: item.ai_result,
          })),
        });
        
        // 详细检查AI结果数据
        data.forEach((item: ContentItemPublic) => {
          if (item.ai_result) {
            console.log(`🔍 Item ${item.title} AI结果:`, {
              labels: item.ai_result.labels,
              quality_score: item.ai_result.content_quality_score,
              reading_time: item.ai_result.reading_time_minutes,
              difficulty: item.ai_result.difficulty_level,
            });
          } else {
            console.log(`❌ Item ${item.title} 没有AI结果数据`);
          }
        });
        
        setItems(data);
        // 缓存内容列表
        contentCache.setContentList(data);

        // 批量预加载内容详情（在后台进行，不阻塞UI）
        setTimeout(() => {
          batchPrefetchContent(data);
        }, 500); // 延迟500ms开始预加载，确保主要UI已渲染完成
      } catch (e: unknown) {
        console.error("Error fetching content items:", e);
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred while fetching content items.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [user, authLoading, router, batchPrefetchContent]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <MainLayout pageTitle="Content Library">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show loading while fetching content
  if (loading) {
    return (
      <MainLayout pageTitle="Content Library">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading content library...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout pageTitle="Content Library">
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Content Library">
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                内容库
              </h1>
              <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
                管理和浏览你的所有内容，快速找到需要的信息
              </p>

              {/* 性能指示器 - 暂时隐藏 */}
              {false && (
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${prefetchStats.inProgress ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
                    />
                    <span>
                      预加载: {prefetchStats.cached}/{prefetchStats.total}
                    </span>
                  </div>
                  <div className="text-xs">
                    缓存命中率:{" "}
                    {Math.round(
                      (prefetchStats.cached / prefetchStats.total) * 100,
                    )}
                    %
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索标题或摘要..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-primary/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="all">所有状态</option>
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="completed">已完成</option>
                      <option value="failed">失败</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="all">所有类型</option>
                      <option value="pdf">PDF</option>
                      <option value="url">网页</option>
                      <option value="text">文本</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>共 {items.length} 项内容</span>
                  <div className="flex items-center gap-4">
                    {(searchQuery ||
                      statusFilter !== "all" ||
                      typeFilter !== "all") && (
                      <span>筛选后显示 {filteredItems.length} 项</span>
                    )}
                    <span className="text-xs text-muted-foreground/70">
                      提示: 使用 ↑↓ 选择，Enter 阅读，Esc 取消
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Content List */}
              <div className="lg:col-span-2">
                {filteredItems.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-12">
                      <div className="text-center">
                        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {items.length === 0 ? "暂无内容" : "未找到匹配的内容"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {items.length === 0
                            ? "开始构建你的内容库，添加第一个项目"
                            : "尝试调整搜索条件或过滤器"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredItems.map((item) => (
                      <ContentItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              {/* Content Preview */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6 border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      内容预览
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedItem ? (
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-lg flex-1">
                              {selectedItem.title || "无标题"}
                            </h3>
                            <FavoriteButton
                              itemId={selectedItem.id}
                              size="sm"
                              className="ml-2"
                            />
                          </div>
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              {getContentIcon(selectedItem.type)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {selectedItem.type.toUpperCase()}
                            </Badge>
                            <ProcessingStatusBadge
                              status={
                                selectedItem.processing_status as ProcessingStatus
                              }
                              size="sm"
                              errorMessage={
                                selectedItem.processing_status === "failed"
                                  ? "处理失败，点击重试"
                                  : undefined
                              }
                              onReprocess={
                                selectedItem.processing_status === "failed"
                                  ? () => handleReprocess(selectedItem)
                                  : undefined
                              }
                              isReprocessing={reprocessingItems.has(
                                selectedItem.id,
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-2">
                              摘要
                            </label>
                            <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                              {selectedItem.ai_result?.summary?.main_thesis ||
                                "暂无摘要"}
                            </p>
                          </div>

                          {selectedItem.source_uri && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground block mb-2">
                                来源
                              </label>
                              <p className="text-sm break-all bg-muted/30 p-3 rounded-lg">
                                <a
                                  href={selectedItem.source_uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {selectedItem.source_uri}
                                </a>
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="text-muted-foreground block mb-1">
                                创建时间
                              </label>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  selectedItem.created_at,
                                ).toLocaleDateString("zh-CN")}
                              </div>
                            </div>
                            <div>
                              <label className="text-muted-foreground block mb-1">
                                更新时间
                              </label>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  selectedItem.updated_at,
                                ).toLocaleDateString("zh-CN")}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <Button
                            onClick={() => handleOpenReader(selectedItem)}
                            className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            disabled={
                              selectedItem.processing_status !== "completed"
                            }
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            阅读内容
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShare(selectedItem)}
                              className="h-9"
                            >
                              <Share2 className="mr-1 h-3 w-3" />
                              分享
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(selectedItem)}
                              className="h-9"
                            >
                              <Download className="mr-1 h-3 w-3" />
                              下载
                            </Button>
                          </div>
                        </div>

                        {/* AI 智能分析 */}
                        <AIAnalysisCard analysis={selectedItem.ai_result} />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            悬停内容卡片查看预览
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            点击卡片直接开始阅读
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {selectedItem && (
          <ShareContentModal
            open={isShareModalOpen}
            onOpenChange={(open) => setIsShareModalOpen(open)}
            contentItem={selectedItem}
          />
        )}
      </div>
    </MainLayout>
  );
}
