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
} from "lucide-react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { ShareContentModal } from "@/components/share/ShareContentModal";
import { useContentEvents, ContentEvent } from "@/hooks/useContentEvents";
import {
  ProcessingStatusBadge,
  ProcessingStatus,
} from "@/components/ui/ProcessingStatusBadge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

// Define the ContentItemPublic type based on backend schema
interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title?: string | null;
  summary?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
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

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Filter items based on search and filters
  useEffect(() => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary?.toLowerCase().includes(searchQuery.toLowerCase()),
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

  // Handle content status updates from SSE
  const handleContentUpdate = useCallback((event: ContentEvent) => {
    if (event.type === "content_status_update" && event.content_id) {
      setItems((prevItems) => {
        return prevItems.map((item) => {
          if (item.id === event.content_id) {
            const updatedItem = {
              ...item,
              processing_status: event.status || item.processing_status,
              title: event.title || item.title,
              updated_at: new Date().toISOString(),
            };

            // Update selected item if it's the same one
            setSelectedItem((prev) =>
              prev?.id === event.content_id ? updatedItem : prev,
            );

            return updatedItem;
          }
          return item;
        });
      });

      // Show toast notifications for important status changes
      if (event.status === "completed") {
        toast.success(`内容处理完成: ${event.title || "未知内容"}`);
      } else if (event.status === "failed") {
        toast.error(`内容处理失败: ${event.error_message || "未知错误"}`);
      }
    }
  }, []);

  const handleConnectionEstablished = useCallback(() => {
    console.log("SSE connection established");
  }, []);

  const handleSSEError = useCallback((error: Error) => {
    console.error("SSE error:", error);
  }, []);

  // Setup SSE connection
  useContentEvents({
    onContentUpdate: handleContentUpdate,
    onConnectionEstablished: handleConnectionEstablished,
    onError: handleSSEError,
    enabled: !!user,
  });

  // Handle Open Reader
  const handleOpenReader = (item: ContentItemPublic) => {
    router.push(`/content-library/reader/${item.id}`);
  };

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

        // Get token from user object or cookie
        const token = user?.token || getCookie("accessToken");

        if (!token) {
          setError("No authentication token found. Please log in again.");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Use the correct API endpoint with authentication
        const response = await fetch(`${apiUrl}/api/v1/content/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Authentication failed. Please log in again.");
            router.push("/login");
            return;
          }

          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        setItems(data);
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
  }, [user, authLoading, router]);

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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                内容库
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                管理和浏览你的所有内容，快速找到需要的信息
              </p>
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
                  {(searchQuery ||
                    statusFilter !== "all" ||
                    typeFilter !== "all") && (
                    <span>筛选后显示 {filteredItems.length} 项</span>
                  )}
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
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] ${
                          selectedItem?.id === item.id
                            ? "ring-2 ring-primary shadow-xl scale-[1.02]"
                            : ""
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                {getContentIcon(item.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate mb-2">
                                  {item.title || "无标题"}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                  {item.summary || "暂无摘要"}
                                </p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <ProcessingStatusBadge
                                    status={
                                      item.processing_status as ProcessingStatus
                                    }
                                    size="sm"
                                  />
                                  <Badge variant="outline" className="text-xs">
                                    {item.type.toUpperCase()}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(
                                      item.created_at,
                                    ).toLocaleDateString("zh-CN")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                          <h3 className="font-semibold mb-3 text-lg">
                            {selectedItem.title || "无标题"}
                          </h3>
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
                              {selectedItem.summary || "暂无摘要"}
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
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <p className="text-sm text-muted-foreground">
                          选择一个内容项目查看详情
                        </p>
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
