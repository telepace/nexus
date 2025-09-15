"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, TrendingUp, BookOpen, Star } from "lucide-react";
import type { RecommendationCard } from "../types/recommendation";
import type { ContentItemPublic } from "../types";

interface Props {
  recommendations: RecommendationCard[];
  onCardClick: (item: ContentItemPublic) => void;
  isLoading?: boolean;
}

// 🍎 乔布斯式的情感化文案模板
const EMOTIONAL_COPY = {
  sectionTitle: "🌅 今日为你精选",
  sectionSubtitle: "发现改变思维的智慧宝藏",
  loadingText: "正在为你寻找精彩内容...",
  emptyText: "新的发现即将到来",
  readTimeText: (minutes: number) => `${minutes}分钟阅读`,
  
  // 卡片类型标签
  cardTypeLabels: {
    featured: "✨ 精选",
    trending: "🔥 热门", 
    continue: "📖 继续",
    discover: "🔍 发现"
  },
  
  // 难度标签
  difficultyLabels: {
    easy: "轻松阅读",
    medium: "中等深度",
    hard: "深度思考"
  }
} as const;

// 获取卡片类型对应的图标
const getTypeIcon = (type: RecommendationCard['type']) => {
  const iconMap = {
    featured: Sparkles,
    trending: TrendingUp,
    continue: BookOpen,
    discover: Star
  };
  return iconMap[type] || Sparkles;
};

// 获取难度颜色
const getDifficultyColor = (difficulty: string) => {
  const colorMap = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-blue-100 text-blue-700", 
    hard: "bg-purple-100 text-purple-700"
  };
  return colorMap[difficulty as keyof typeof colorMap] || colorMap.easy;
};

// 单个推荐卡片组件
const RecommendationCardComponent: React.FC<{
  card: RecommendationCard;
  onCardClick: (item: ContentItemPublic) => void;
}> = ({ card, onCardClick }) => {
  const { item, visual, reasoning, metadata, type } = card;
  const TypeIcon = getTypeIcon(type);

  // 处理卡片点击
  const handleClick = () => {
    onCardClick(item);
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl border-0 overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${visual.gradient[0]}, ${visual.gradient[1]})`
      }}
      onClick={handleClick}
    >
      {/* 背景装饰 */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 70% 20%, ${visual.accentColor}, transparent 50%)`
        }}
      />
      
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white font-medium backdrop-blur-sm"
          >
            <TypeIcon className="w-3 h-3 mr-1" />
            {EMOTIONAL_COPY.cardTypeLabels[type]}
          </Badge>
          
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Clock className="w-3 h-3" />
            {EMOTIONAL_COPY.readTimeText(metadata.estimatedReadTime)}
          </div>
        </div>
        
        <CardTitle className="text-white text-lg font-bold leading-tight line-clamp-2 group-hover:text-white/90 transition-colors">
          {item.title || "精彩内容"}
        </CardTitle>
        
        <CardDescription className="text-white/90 text-sm line-clamp-2 mt-2">
          {item.summary || reasoning.valuePromise}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 pt-0">
        {/* 推荐理由 */}
        <div className="mb-3">
          <p className="text-white/80 text-xs italic">
            "{reasoning.primary}"
          </p>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          <Badge 
            className={`text-xs ${getDifficultyColor(metadata.difficulty)} bg-white/90`}
          >
            {EMOTIONAL_COPY.difficultyLabels[metadata.difficulty]}
          </Badge>
          
          <div className="flex items-center gap-1 text-white/70">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-xs font-medium">
              {metadata.score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* 悬停效果：价值承诺 */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-3 pt-3 border-t border-white/20">
          <p className="text-white/90 text-xs font-medium">
            💡 {reasoning.valuePromise}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// 骨架屏加载组件
const LoadingCard: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-6 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </CardHeader>
    <CardContent>
      <div className="h-3 bg-gray-200 rounded w-full mb-2" />
      <div className="flex justify-between items-center">
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-8" />
      </div>
    </CardContent>
  </Card>
);

// 主推荐矩阵组件
export const RecommendationMatrix: React.FC<Props> = ({
  recommendations,
  onCardClick,
  isLoading = false
}) => {
  // 今日精选：取前3个推荐
  const dailyPicks = useMemo(() => {
    return recommendations
      .filter(card => card.type === 'featured')
      .slice(0, 3);
  }, [recommendations]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 标题部分 */}
        <div className="text-center space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
        </div>
        
        {/* 加载中的卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!dailyPicks.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl mb-4">🌱</div>
        <h3 className="text-xl font-semibold text-gray-700">
          {EMOTIONAL_COPY.emptyText}
        </h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          我们正在为你准备个性化的内容推荐，请稍后再来看看
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {/* 标题区域 */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {EMOTIONAL_COPY.sectionTitle}
        </h2>
        <p className="text-gray-600 text-lg">
          {EMOTIONAL_COPY.sectionSubtitle}
        </p>
      </div>

      {/* 推荐卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dailyPicks.map((card) => (
          <RecommendationCardComponent
            key={card.id}
            card={card}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* 底部提示 */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          💡 推荐会根据你的阅读习惯持续优化
        </p>
      </div>
    </section>
  );
};

export default RecommendationMatrix;