import type { ContentItemPublic } from "../types";

// 🍎 乔布斯式智能推荐系统数据结构
// "让内容主动找到用户，而不是让用户寻找内容"

// 用户画像接口
export interface UserProfile {
  id: string;
  interests: string[];                    // 兴趣标签
  readingHistory: string[];               // 阅读历史ID
  preferredCategories: string[];          // 偏好分类
  readingTime: 'morning' | 'afternoon' | 'evening'; // 阅读时间偏好
  averageReadingDuration: number;         // 平均阅读时长(分钟)
  lastActiveTime: string;                 // 最后活跃时间
  engagementScore: number;                // 用户活跃度评分 (0-10)
}

// 内容评分系统
export interface ContentScoring {
  qualityScore: number;      // 内容质量分 (0-10)
  engagementScore: number;   // 用户互动分 (0-10)
  personalityMatch: number;  // 个性化匹配分 (0-10)
  trendingScore: number;     // 热度分 (0-10)
  freshnessScore: number;    // 新鲜度分 (0-10)
  totalScore: number;        // 综合评分 (0-10)
}

// 推荐理由接口
export interface RecommendationReasoning {
  primary: string;           // 主要推荐理由 "基于你对AI的兴趣"
  secondary?: string;        // 次要理由 "其他用户也喜欢这篇"
  valuePromise: string;      // 价值承诺 "可能改变你的思维"
  confidenceLevel: number;   // 推荐置信度 (0-1)
}

// 视觉呈现配置
export interface RecommendationVisual {
  coverImage?: string;                    // 封面图URL
  gradient: [string, string];             // 渐变色彩 [起始色, 结束色]
  icon?: string;                         // 类型图标
  accentColor: string;                   // 强调色
  theme: 'warm' | 'cool' | 'neutral';    // 色彩主题
}

// 推荐卡片核心接口
export interface RecommendationCard {
  id: string;
  item: ContentItemPublic;
  type: 'featured' | 'trending' | 'continue' | 'discover';
  
  // 视觉呈现
  visual: RecommendationVisual;
  
  // 推荐理由
  reasoning: RecommendationReasoning;
  
  // 元数据
  metadata: {
    estimatedReadTime: number;                    // 预估阅读时长(分钟)
    difficulty: 'easy' | 'medium' | 'hard';     // 难度等级
    tags: string[];                              // 标签列表
    score: number;                               // 综合推荐分数 (0-10)
    priority: number;                            // 优先级 (0-100)
    createdAt: string;                          // 推荐创建时间
  };
  
  // 交互状态
  interaction?: {
    clicked: boolean;         // 是否被点击过
    hovered: boolean;         // 是否被悬停过
    dismissed: boolean;       // 是否被忽略
    bookmarked: boolean;      // 是否被收藏
  };
}

// 推荐引擎核心接口
export interface RecommendationEngine {
  // 用户画像
  userProfile: UserProfile;

  // 推荐结果
  recommendations: {
    dailyPicks: RecommendationCard[];     // 今日精选 (最多3张)
    continueReading: RecommendationCard[]; // 继续阅读
    discover: RecommendationCard[];        // 发现更多
    trending: RecommendationCard[];        // 热门内容
  };
  
  // 算法配置
  algorithmConfig: {
    personalizedWeight: number;     // 个性化权重 (0-1)
    diversityFactor: number;        // 多样性因子 (0-1)
    freshnessBoost: number;         // 新鲜度加权 (0-1)
    qualityThreshold: number;       // 质量门槛 (0-10)
    maxRecommendationsPerType: number;
  };
  
  // 性能指标
  metrics?: {
    generateTime: number;           // 生成耗时(ms)
    cacheHitRate: number;          // 缓存命中率
    userSatisfactionScore: number;  // 用户满意度
  };
}

// 推荐请求参数
export interface RecommendationRequest {
  userId: string;
  type?: 'daily' | 'continue' | 'discover' | 'trending';
  count?: number;                        // 推荐数量
  excludeItemIds?: string[];             // 排除的内容ID
  forceRefresh?: boolean;                // 强制刷新
  allItems?: import("../types").ContentItemPublic[];  // 所有可用的内容数据
  context?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    device: 'mobile' | 'desktop';
    location?: string;
  };
}

// 推荐响应
export interface RecommendationResponse {
  success: boolean;
  data: RecommendationCard[];
  metadata: {
    totalCount: number;
    generatedAt: string;
    cacheUsed: boolean;
    algorithmVersion: string;
  };
  error?: string;
}

// 用户反馈接口
export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  action: 'click' | 'dismiss' | 'bookmark' | 'share' | 'read_complete';
  timestamp: string;
  metadata?: {
    dwellTime?: number;     // 停留时间(ms)
    scrollDepth?: number;   // 滚动深度(0-1)
    rating?: number;        // 用户评分(1-5)
  };
}

// 推荐算法接口
export interface IRecommendationService {
  // 生成推荐
  generateRecommendations(request: RecommendationRequest): Promise<RecommendationResponse>;
  
  // 获取用户画像
  getUserProfile(userId: string): Promise<UserProfile>;
  
  // 更新用户画像
  updateUserProfile(userId: string, feedback: RecommendationFeedback): Promise<void>;
  
  // 获取内容评分
  getContentScoring(contentId: string, userId: string): Promise<ContentScoring>;
  
  // 记录用户反馈
  recordFeedback(feedback: RecommendationFeedback): Promise<void>;
  
  // 刷新推荐缓存
  refreshCache(userId: string): Promise<void>;
}