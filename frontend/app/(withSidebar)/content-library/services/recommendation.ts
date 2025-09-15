"use client";

import type { 
  RecommendationCard, 
  RecommendationRequest, 
  RecommendationResponse,
  UserProfile,
  ContentScoring,
  RecommendationReasoning,
  RecommendationVisual,
  IRecommendationService,
  RecommendationFeedback
} from "../types/recommendation";
import type { ContentItemPublic } from "../types";

// 🍎 乔布斯式智能推荐服务
// "让内容主动找到用户，创造魔法般的发现体验"

class SmartRecommendationService implements IRecommendationService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15分钟缓存

  // 情感化推荐理由模板
  private readonly REASON_TEMPLATES = {
    interest: [
      "基于你对{topic}的兴趣",
      "你可能会喜欢这个{category}内容",
      "继续探索{domain}领域的精彩"
    ],
    social: [
      "其他读者也在关注",
      "社区热门推荐", 
      "读者强烈推荐的内容"
    ],
    quality: [
      "高质量深度内容",
      "专家精心创作",
      "获得众多好评的佳作"
    ],
    trending: [
      "当下最受关注",
      "热门讨论话题",
      "正在流行的内容"
    ]
  };

  // 价值承诺模板
  private readonly VALUE_PROMISES = [
    "可能改变你的思维方式",
    "为你带来新的灵感启发", 
    "帮助你获得实用见解",
    "拓展你的知识边界",
    "给你带来深度思考",
    "让你发现新的可能性",
    "助你获得成长突破",
    "带来意想不到的收获"
  ];

  // 视觉主题配置
  private readonly VISUAL_THEMES = {
    warm: {
      gradients: [
        ["#ff7e5f", "#feb47b"],
        ["#ff6b6b", "#feca57"],
        ["#ff9a56", "#ffad56"]
      ],
      accentColors: ["#ff6b6b", "#ff7e5f", "#feca57"]
    },
    cool: {
      gradients: [
        ["#667eea", "#764ba2"],
        ["#6dd5fa", "#2980b9"],
        ["#a8edea", "#fed6e3"]
      ],
      accentColors: ["#667eea", "#2980b9", "#6dd5fa"]
    },
    neutral: {
      gradients: [
        ["#bdc3c7", "#2c3e50"],
        ["#757f9a", "#d7dde8"],
        ["#8e9eab", "#eef2f3"]
      ],
      accentColors: ["#2c3e50", "#757f9a", "#8e9eab"]
    }
  };

  // 生成推荐
  async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const cacheKey = `rec_${request.userId}_${request.type || 'all'}_${request.count || 3}`;
    
    // 检查缓存
    if (!request.forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            totalCount: cached.length,
            generatedAt: new Date().toISOString(),
            cacheUsed: true,
            algorithmVersion: "1.0.0"
          }
        };
      }
    }

    try {
      // 获取用户画像
      const userProfile = await this.getUserProfile(request.userId);
      
      // 获取候选内容
      // 注意：在实际应用中，这里需要传入所有可用的内容数据
      const candidates = await this.getCandidateContent(request.excludeItemIds, request.allItems);
      
      // 生成推荐卡片
      const recommendations = await this.generateRecommendationCards(
        candidates,
        userProfile,
        request
      );

      // 缓存结果
      this.setCache(cacheKey, recommendations, this.CACHE_TTL);

      return {
        success: true,
        data: recommendations,
        metadata: {
          totalCount: recommendations.length,
          generatedAt: new Date().toISOString(),
          cacheUsed: false,
          algorithmVersion: "1.0.0"
        }
      };
    } catch (error) {
      console.error('推荐生成失败:', error);
      return {
        success: false,
        data: [],
        metadata: {
          totalCount: 0,
          generatedAt: new Date().toISOString(),
          cacheUsed: false,
          algorithmVersion: "1.0.0"
        },
        error: error instanceof Error ? error.message : '推荐生成失败'
      };
    }
  }

  // 获取用户画像（模拟实现）
  async getUserProfile(userId: string): Promise<UserProfile> {
    // 从缓存或API获取用户画像
    const cacheKey = `profile_${userId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 模拟用户画像数据
    const mockProfile: UserProfile = {
      id: userId,
      interests: ["AI", "技术", "创业", "设计", "哲学"],
      readingHistory: [],
      preferredCategories: ["科技", "商业", "设计"],
      readingTime: this.getCurrentTimeOfDay(),
      averageReadingDuration: 8,
      lastActiveTime: new Date().toISOString(),
      engagementScore: 7.5
    };

    this.setCache(cacheKey, mockProfile, 30 * 60 * 1000); // 30分钟缓存
    return mockProfile;
  }

  // 生成推荐卡片
  private async generateRecommendationCards(
    candidates: ContentItemPublic[],
    userProfile: UserProfile,
    request: RecommendationRequest
  ): Promise<RecommendationCard[]> {
    const count = request.count || 3;
    const cards: RecommendationCard[] = [];

    // 对候选内容进行评分和排序
    const scoredCandidates = await Promise.all(
      candidates.map(async (item) => {
        const scoring = await this.getContentScoring(item.id, userProfile.id);
        return { item, scoring };
      })
    );

    // 按综合分数排序
    scoredCandidates.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);

    // 确保多样性：不同类型和主题的内容
    const diverseCandidates = this.ensureDiversity(scoredCandidates, count);

    // 生成推荐卡片
    for (let i = 0; i < Math.min(count, diverseCandidates.length); i++) {
      const { item, scoring } = diverseCandidates[i];
      
      const card: RecommendationCard = {
        id: `rec_${item.id}_${Date.now()}_${i}`,
        item,
        type: this.determineCardType(item, scoring, i),
        visual: this.generateVisual(item, i),
        reasoning: this.generateReasoning(item, userProfile, scoring),
        metadata: {
          estimatedReadTime: this.estimateReadingTime(item),
          difficulty: this.determineDifficulty(item, scoring),
          tags: this.extractTags(item),
          score: scoring.totalScore,
          priority: 100 - (i * 10),
          createdAt: new Date().toISOString()
        }
      };

      cards.push(card);
    }

    return cards;
  }

  // 内容评分算法
  async getContentScoring(contentId: string, userId: string): Promise<ContentScoring> {
    // 模拟评分算法
    const qualityScore = 7.5 + Math.random() * 2; // 7.5-9.5
    const engagementScore = 6 + Math.random() * 3; // 6-9
    const personalityMatch = 5 + Math.random() * 4; // 5-9
    const trendingScore = 4 + Math.random() * 5; // 4-9
    const freshnessScore = 3 + Math.random() * 6; // 3-9

    const weights = {
      quality: 0.3,
      engagement: 0.25,
      personality: 0.25,
      trending: 0.15,
      freshness: 0.05
    };

    const totalScore = 
      qualityScore * weights.quality +
      engagementScore * weights.engagement +
      personalityMatch * weights.personality +
      trendingScore * weights.trending +
      freshnessScore * weights.freshness;

    return {
      qualityScore,
      engagementScore,
      personalityMatch,
      trendingScore,
      freshnessScore,
      totalScore: Math.min(10, totalScore)
    };
  }

  // 生成推荐理由
  private generateReasoning(
    item: ContentItemPublic, 
    userProfile: UserProfile,
    scoring: ContentScoring
  ): RecommendationReasoning {
    // 根据评分选择最佳推荐理由类型
    let reasonType: keyof typeof this.REASON_TEMPLATES;
    
    if (scoring.personalityMatch > 7) {
      reasonType = 'interest';
    } else if (scoring.trendingScore > 7) {
      reasonType = 'trending';
    } else if (scoring.qualityScore > 8) {
      reasonType = 'quality';
    } else {
      reasonType = 'social';
    }

    const templates = this.REASON_TEMPLATES[reasonType];
    const primaryReason = templates[Math.floor(Math.random() * templates.length)]
      .replace('{topic}', userProfile.interests[0] || '技术')
      .replace('{category}', userProfile.preferredCategories[0] || '精彩')
      .replace('{domain}', userProfile.interests[1] || '知识');

    const valuePromise = this.VALUE_PROMISES[
      Math.floor(Math.random() * this.VALUE_PROMISES.length)
    ];

    return {
      primary: primaryReason,
      valuePromise,
      confidenceLevel: Math.min(1, scoring.personalityMatch / 10)
    };
  }

  // 生成视觉配置
  private generateVisual(item: ContentItemPublic, index: number): RecommendationVisual {
    const themes: (keyof typeof this.VISUAL_THEMES)[] = ['warm', 'cool', 'neutral'];
    const theme = themes[index % themes.length];
    const themeConfig = this.VISUAL_THEMES[theme];
    
    const gradientIndex = index % themeConfig.gradients.length;
    const gradient = themeConfig.gradients[gradientIndex] as [string, string];
    const accentColor = themeConfig.accentColors[gradientIndex];

    return {
      gradient,
      accentColor,
      theme
    };
  }

  // 确保推荐多样性
  private ensureDiversity(
    scoredCandidates: Array<{ item: ContentItemPublic; scoring: ContentScoring }>,
    count: number
  ) {
    const diverse: typeof scoredCandidates = [];
    const usedCategories = new Set<string>();
    
    // 先选择不同类别的高分内容
    for (const candidate of scoredCandidates) {
      if (diverse.length >= count) break;
      
      const category = this.getContentCategory(candidate.item);
      if (!usedCategories.has(category) || diverse.length < count / 2) {
        diverse.push(candidate);
        usedCategories.add(category);
      }
    }
    
    // 如果数量不够，继续添加高分内容
    for (const candidate of scoredCandidates) {
      if (diverse.length >= count) break;
      if (!diverse.includes(candidate)) {
        diverse.push(candidate);
      }
    }
    
    return diverse.slice(0, count);
  }

  // 辅助方法
  private getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private determineCardType(item: ContentItemPublic, scoring: ContentScoring, index: number): RecommendationCard['type'] {
    if (scoring.qualityScore > 8.5) return 'featured';
    if (scoring.trendingScore > 8) return 'trending';
    if (index === 0) return 'featured'; // 第一个总是精选
    return 'discover';
  }

  private estimateReadingTime(item: ContentItemPublic): number {
    const contentLength = item.content_text?.length || item.summary?.length || 1000;
    return Math.max(2, Math.ceil(contentLength / 200)); // 假设每分钟200字
  }

  private determineDifficulty(item: ContentItemPublic, scoring: ContentScoring): 'easy' | 'medium' | 'hard' {
    const complexity = (item.content_text?.length || 0) + (scoring.qualityScore * 100);
    if (complexity < 1000) return 'easy';
    if (complexity < 2000) return 'medium';
    return 'hard';
  }

  private extractTags(item: ContentItemPublic): string[] {
    // 从内容中提取标签（简化实现）
    return ['精选', '推荐'];
  }

  private getContentCategory(item: ContentItemPublic): string {
    // 简化的分类逻辑
    return item.title?.includes('AI') ? 'AI' : 
           item.title?.includes('设计') ? '设计' : 
           item.title?.includes('技术') ? '技术' : '综合';
  }

  // 获取候选内容
  private async getCandidateContent(excludeIds?: string[], allItems?: ContentItemPublic[]): Promise<ContentItemPublic[]> {
    // 使用传入的内容数据或返回空数组
    if (!allItems || allItems.length === 0) {
      return [];
    }
    
    // 过滤排除的内容
    let candidates = allItems;
    if (excludeIds && excludeIds.length > 0) {
      candidates = allItems.filter(item => !excludeIds.includes(item.id));
    }
    
    // 返回最多20个候选内容
    return candidates.slice(0, 20);
  }

  // 缓存管理
  private getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // 实现其他接口方法
  async updateUserProfile(userId: string, feedback: RecommendationFeedback): Promise<void> {
    // 实现用户画像更新逻辑
  }

  async recordFeedback(feedback: RecommendationFeedback): Promise<void> {
    // 实现用户反馈记录
  }

  async refreshCache(userId: string): Promise<void> {
    // 清除用户相关缓存
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keys.forEach(key => this.cache.delete(key));
  }
}

// 单例模式
export const recommendationService = new SmartRecommendationService();
export default recommendationService;