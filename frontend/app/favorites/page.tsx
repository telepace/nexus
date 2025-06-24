"use client";

import React from "react";
import {
  Star,
  Heart,
  Clock,
  FileText,
  Link as LinkIcon,
  BookOpen,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useFavoritesList } from "@/lib/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteItemData {
  id: string;
  content_item: {
    id: string;
    title?: string;
    type: string;
    source_uri?: string;
    summary?: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
}

/**
 * Renders a single favorite item card, redesigned according to UI guidelines.
 * Actions are now explicit in the CardFooter.
 */
function FavoriteItemCard({ item }: { item: FavoriteItemData }) {
  const { content_item } = item;

  const getTypeIcon = (type: string) => {
    const commonClass = "h-5 w-5";
    switch (type) {
      case "text":
        return <FileText className={cn(commonClass, "text-blue-500")} />;
      case "url":
        return <LinkIcon className={cn(commonClass, "text-green-500")} />;
      case "pdf":
        return <FileText className={cn(commonClass, "text-red-500")} />;
      default:
        return <FileText className={cn(commonClass, "text-gray-500")} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCardClick = () => {
    if (content_item.processing_status === "completed") {
      window.location.href = `/content-library/reader/${content_item.id}`;
    }
  };

  const isCompleted = content_item.processing_status === "completed";

  return (
    <Card
      className={cn(
        "flex flex-col h-full border-0 shadow-lg transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1",
        isCompleted && "cursor-pointer",
      )}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
            {getTypeIcon(content_item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2 leading-snug">
              {content_item.title || "Untitled"}
            </CardTitle>
            <CardDescription className="mt-1 text-xs uppercase tracking-wider">
              {content_item.type}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pt-0 pb-4">
        {content_item.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 border-l-2 pl-3">
            {content_item.summary}
          </p>
        )}

        {content_item.source_uri && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <LinkIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate" title={content_item.source_uri}>
              {content_item.source_uri}
            </span>
          </div>
        )}

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "py-0.5 px-2 text-xs",
                isCompleted &&
                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
              )}
            >
              {isCompleted ? "AI Ready" : content_item.processing_status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-yellow-500" />
            <span>Favorited on {formatDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Created on {formatDate(content_item.created_at)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end items-center gap-2 bg-muted/30 p-2.5">
        <FavoriteButton itemId={content_item.id} size="sm" />
      </CardFooter>
    </Card>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const { data, isLoading, error } = useFavoritesList();
  const [searchQuery, setSearchQuery] = React.useState("");

  // 过滤收藏项
  const filteredItems = React.useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery) return data.items;

    return data.items.filter(
      (item) =>
        item.content_item.title
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.content_item.summary
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }, [data?.items, searchQuery]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-destructive mb-4">
            <Heart className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            加载收藏失败
          </h2>
          <p className="text-muted-foreground">请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">我的收藏</h1>
              {data && (
                <p className="text-sm text-muted-foreground mt-1">
                  共 {data.total} 项内容
                </p>
              )}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索收藏..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <FavoritesSkeleton />
          ) : filteredItems.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12">
                <div className="text-center">
                  <Star className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {data?.items.length === 0 ? "暂无收藏" : "未找到匹配的内容"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {data?.items.length === 0
                      ? "开始收藏你感兴趣的内容吧"
                      : "尝试使用不同的搜索关键词"}
                  </p>
                  {data?.items.length === 0 && (
                    <Button asChild>
                      <a href="/content-library">
                        <BookOpen className="mr-2 h-4 w-4" />
                        浏览内容库
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <FavoriteItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
