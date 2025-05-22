"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookmarkIcon, ExternalLink, MessageSquare, FileText, Star, Trash2 } from "lucide-react";

// 模拟收藏数据
const FAVORITES_DATA = [
  {
    id: "fav1",
    title: "重要文档",
    type: "document",
    description: "关于项目规划的重要文档",
    date: "2023-11-15",
    tags: ["工作", "规划"],
  },
  {
    id: "fav2",
    title: "学习资料",
    type: "link",
    description: "机器学习入门教程",
    url: "https://example.com/ml-tutorial",
    date: "2023-12-03",
    tags: ["学习", "技术"],
  },
  {
    id: "fav3",
    title: "创意笔记",
    type: "note",
    description: "新产品创意和功能规划",
    date: "2024-01-10",
    tags: ["创意", "产品"],
  },
  {
    id: "fav4",
    title: "市场分析报告",
    type: "document",
    description: "2024年第一季度市场分析报告",
    date: "2024-02-18",
    tags: ["市场", "分析"],
  },
];

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState(FAVORITES_DATA);
  const [activeTab, setActiveTab] = useState("all");

  const filteredFavorites = activeTab === "all" 
    ? favorites 
    : favorites.filter(fav => fav.type === activeTab);

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "link":
        return <ExternalLink className="h-4 w-4 text-green-500" />;
      case "note":
        return <MessageSquare className="h-4 w-4 text-amber-500" />;
      default:
        return <BookmarkIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <MainLayout pageTitle="收藏" currentPath="/favorites">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookmarkIcon className="h-6 w-6 text-primary" />
            <span>我的收藏</span>
          </h2>
          <Button variant="outline" size="sm">
            整理收藏
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="document">文档</TabsTrigger>
            <TabsTrigger value="link">链接</TabsTrigger>
            <TabsTrigger value="note">笔记</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filteredFavorites.length === 0 ? (
              <div className="text-center py-12">
                <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">没有收藏内容</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">您当前没有任何收藏的内容</p>
                <Button variant="outline">浏览内容</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFavorites.map((favorite) => (
                  <Card key={favorite.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getTypeIcon(favorite.type)}
                          {favorite.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          添加于 {favorite.date}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFavorite(favorite.id)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{favorite.description}</p>
                      {favorite.url && (
                        <a 
                          href={favorite.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-2 inline-flex items-center"
                        >
                          {favorite.url.replace(/^https?:\/\//, '').substring(0, 30)}...
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                      <div className="flex flex-wrap gap-1">
                        {favorite.tags?.map((tag, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-amber-400 hover:text-amber-500"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
} 