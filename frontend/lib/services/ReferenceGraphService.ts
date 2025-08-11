/**
 * 🕸️ 引用图谱服务
 *
 * 设计理念：
 * - 构建引用知识图谱
 * - 发现隐藏的引用关系
 * - 智能推荐相关引用
 * - 可视化引用网络
 */

export interface ReferenceNode {
  id: string;
  refId: number;
  contentId: string;
  title: string;
  content: string;
  snippet: string;

  // 图谱属性
  importance: number; // 0-1, 基于被引用次数和内容质量
  centrality: number; // 0-1, 在图谱中的中心性
  category: string;
  tags: string[];

  // 位置信息
  position?: {
    chapter?: string;
    section?: string;
    paragraph: number;
  };

  // 元数据
  metadata: {
    wordCount: number;
    readingTime: number;
    complexity: number;
    sentiment: number;
    lastAccessed: number;
    accessCount: number;
  };
}

export interface ReferenceEdge {
  id: string;
  sourceId: string;
  targetId: string;

  // 关系类型
  type:
    | "citation"
    | "similarity"
    | "sequence"
    | "contradiction"
    | "elaboration";
  strength: number; // 0-1, 关系强度

  // 关系属性
  properties: {
    semantic_similarity?: number;
    temporal_distance?: number;
    structural_similarity?: number;
    co_occurrence_frequency?: number;
  };

  // 元数据
  metadata: {
    discoveredAt: number;
    confidence: number;
    source: "explicit" | "inferred" | "user_defined";
  };
}

export interface ReferenceGraph {
  nodes: Map<string, ReferenceNode>;
  edges: Map<string, ReferenceEdge>;

  // 图谱统计
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
    clusters: number;
    stronglyConnectedComponents: number;
  };
}

export interface ReferenceRecommendation {
  refId: number;
  contentId: string;
  score: number;
  reason: string;
  type: "similar_content" | "follow_up" | "prerequisite" | "related_topic";
  confidence: number;
}

export interface ReferenceCluster {
  id: string;
  name: string;
  nodes: string[];
  centroid: ReferenceNode;
  coherence: number;
  size: number;
}

class ReferenceGraphService {
  private graph: ReferenceGraph;
  private semanticCache: Map<string, number[]> = new Map();
  private recommendationCache: Map<string, ReferenceRecommendation[]> =
    new Map();

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        avgDegree: 0,
        density: 0,
        clusters: 0,
        stronglyConnectedComponents: 0,
      },
    };
  }

  /**
   * 🔍 智能内容分析
   */
  private analyzeContent(content: string): {
    complexity: number;
    sentiment: number;
    keywords: string[];
    topics: string[];
    readingTime: number;
  } {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // 复杂度分析（基于句子长度、词汇复杂性等）
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const avgSentenceLength = wordCount / sentences.length;
    const complexity = Math.min(1, (avgSentenceLength - 10) / 20); // 标准化到 0-1

    // 情感分析（简化版本，实际应用中可集成 NLP API）
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "positive",
      "benefit",
      "advantage",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "negative",
      "problem",
      "issue",
      "disadvantage",
      "concern",
    ];

    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter((word) =>
      positiveWords.includes(word),
    ).length;
    const negativeCount = words.filter((word) =>
      negativeWords.includes(word),
    ).length;
    const sentiment = (positiveCount - negativeCount) / wordCount;

    // 关键词提取（简化版本）
    const keywords = this.extractKeywords(content);
    const topics = this.identifyTopics(content);

    return {
      complexity: Math.max(0, Math.min(1, complexity)),
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      keywords,
      topics,
      readingTime,
    };
  }

  /**
   * 🏷️ 关键词提取
   */
  private extractKeywords(content: string, limit: number = 10): string[] {
    // 停用词列表
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
    ]);

    // 词频统计
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    const wordFreq = new Map<string, number>();
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // 按频率排序并返回前N个
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * 🎯 主题识别
   */
  private identifyTopics(content: string): string[] {
    // 主题关键词映射
    const topicKeywords = {
      technology: [
        "ai",
        "artificial",
        "intelligence",
        "machine",
        "learning",
        "algorithm",
        "data",
        "computer",
        "software",
        "digital",
      ],
      science: [
        "research",
        "study",
        "experiment",
        "hypothesis",
        "theory",
        "analysis",
        "scientific",
        "evidence",
        "method",
      ],
      business: [
        "market",
        "company",
        "revenue",
        "profit",
        "strategy",
        "customer",
        "product",
        "service",
        "management",
      ],
      education: [
        "learning",
        "student",
        "teacher",
        "education",
        "knowledge",
        "skill",
        "training",
        "course",
        "curriculum",
      ],
      health: [
        "health",
        "medical",
        "disease",
        "treatment",
        "patient",
        "doctor",
        "medicine",
        "therapy",
        "wellness",
      ],
      environment: [
        "environment",
        "climate",
        "sustainability",
        "green",
        "renewable",
        "pollution",
        "conservation",
        "ecology",
      ],
    };

    const contentLower = content.toLowerCase();
    const topics: string[] = [];

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.filter((keyword) =>
        contentLower.includes(keyword),
      ).length;
      if (matches >= 2) {
        // 至少匹配2个关键词
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * 📊 计算语义相似度
   */
  private calculateSemanticSimilarity(
    content1: string,
    content2: string,
  ): number {
    // 简化的余弦相似度计算
    const getWordVector = (content: string): Map<string, number> => {
      const words = content.toLowerCase().split(/\s+/);
      const vector = new Map<string, number>();

      words.forEach((word) => {
        vector.set(word, (vector.get(word) || 0) + 1);
      });

      return vector;
    };

    const vector1 = getWordVector(content1);
    const vector2 = getWordVector(content2);

    // 计算交集
    const commonWords = new Set(
      [...vector1.keys()].filter((word) => vector2.has(word)),
    );

    if (commonWords.size === 0) return 0;

    // 计算余弦相似度
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allWords = new Set([...vector1.keys(), ...vector2.keys()]);

    allWords.forEach((word) => {
      const freq1 = vector1.get(word) || 0;
      const freq2 = vector2.get(word) || 0;

      dotProduct += freq1 * freq2;
      norm1 += freq1 * freq1;
      norm2 += freq2 * freq2;
    });

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 🌐 添加引用节点
   */
  addReferenceNode(
    refId: number,
    contentId: string,
    title: string,
    content: string,
    snippet: string,
    position?: ReferenceNode["position"],
  ): void {
    const analysis = this.analyzeContent(content);

    const node: ReferenceNode = {
      id: `${contentId}-${refId}`,
      refId,
      contentId,
      title,
      content,
      snippet,
      importance: 0.5, // 初始重要性，后续会根据图谱结构调整
      centrality: 0,
      category: analysis.topics[0] || "general",
      tags: analysis.keywords,
      position,
      metadata: {
        wordCount: content.split(/\s+/).length,
        readingTime: analysis.readingTime,
        complexity: analysis.complexity,
        sentiment: analysis.sentiment,
        lastAccessed: Date.now(),
        accessCount: 0,
      },
    };

    this.graph.nodes.set(node.id, node);
    this.updateGraphStats();

    // 自动发现与现有节点的关系
    this.discoverRelationships(node.id);
  }

  /**
   * 🔗 自动发现关系
   */
  private discoverRelationships(nodeId: string): void {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;

    // 与其他节点比较，发现潜在关系
    this.graph.nodes.forEach((otherNode, otherNodeId) => {
      if (nodeId === otherNodeId) return;

      // 语义相似度
      const similarity = this.calculateSemanticSimilarity(
        node.content,
        otherNode.content,
      );

      if (similarity > 0.3) {
        // 相似度阈值
        this.addReferenceEdge(nodeId, otherNodeId, "similarity", similarity, {
          semantic_similarity: similarity,
        });
      }

      // 序列关系（基于位置）
      if (
        node.contentId === otherNode.contentId &&
        node.position &&
        otherNode.position
      ) {
        const distance = Math.abs(
          node.position.paragraph - otherNode.position.paragraph,
        );
        if (distance === 1) {
          this.addReferenceEdge(nodeId, otherNodeId, "sequence", 0.8, {
            temporal_distance: distance,
            structural_similarity: 0.8,
          });
        }
      }

      // 主题相关性
      const commonTopics = node.tags.filter((tag) =>
        otherNode.tags.includes(tag),
      );
      if (commonTopics.length > 0) {
        const topicSimilarity =
          commonTopics.length /
          Math.max(node.tags.length, otherNode.tags.length);
        if (topicSimilarity > 0.3) {
          this.addReferenceEdge(
            nodeId,
            otherNodeId,
            "elaboration",
            topicSimilarity,
            {
              co_occurrence_frequency: topicSimilarity,
            },
          );
        }
      }
    });
  }

  /**
   * ➡️ 添加引用边
   */
  addReferenceEdge(
    sourceId: string,
    targetId: string,
    type: ReferenceEdge["type"],
    strength: number,
    properties: ReferenceEdge["properties"] = {},
  ): void {
    const edgeId = `${sourceId}-${targetId}`;

    // 避免重复边
    if (this.graph.edges.has(edgeId)) return;

    const edge: ReferenceEdge = {
      id: edgeId,
      sourceId,
      targetId,
      type,
      strength,
      properties,
      metadata: {
        discoveredAt: Date.now(),
        confidence: strength,
        source: "inferred",
      },
    };

    this.graph.edges.set(edgeId, edge);
    this.updateGraphStats();
  }

  /**
   * 📈 更新图谱统计
   */
  private updateGraphStats(): void {
    const nodeCount = this.graph.nodes.size;
    const edgeCount = this.graph.edges.size;

    this.graph.stats = {
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      avgDegree: nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0,
      density:
        nodeCount > 1 ? edgeCount / ((nodeCount * (nodeCount - 1)) / 2) : 0,
      clusters: this.detectClusters().length,
      stronglyConnectedComponents:
        this.findStronglyConnectedComponents().length,
    };

    // 更新节点重要性和中心性
    this.calculateNodeMetrics();
  }

  /**
   * 🎯 计算节点重要性和中心性
   */
  private calculateNodeMetrics(): void {
    // 计算度中心性
    const degreeCentrality = new Map<string, number>();

    this.graph.edges.forEach((edge) => {
      degreeCentrality.set(
        edge.sourceId,
        (degreeCentrality.get(edge.sourceId) || 0) + 1,
      );
      degreeCentrality.set(
        edge.targetId,
        (degreeCentrality.get(edge.targetId) || 0) + 1,
      );
    });

    const maxDegree = Math.max(...Array.from(degreeCentrality.values()), 1);

    // 更新节点指标
    this.graph.nodes.forEach((node, nodeId) => {
      const degree = degreeCentrality.get(nodeId) || 0;

      // 中心性 = 标准化的度中心性
      node.centrality = degree / maxDegree;

      // 重要性 = 中心性 + 内容质量 + 访问频率
      const accessWeight = Math.min(1, node.metadata.accessCount / 100);
      const qualityWeight = (1 - node.metadata.complexity) * 0.5 + 0.5; // 复杂度适中为佳

      node.importance =
        node.centrality * 0.4 + qualityWeight * 0.3 + accessWeight * 0.3;
    });
  }

  /**
   * 🔍 获取智能推荐
   */
  getSmartRecommendations(
    refId: number,
    contentId: string,
    limit: number = 5,
  ): ReferenceRecommendation[] {
    const cacheKey = `${contentId}-${refId}`;

    // 检查缓存
    if (this.recommendationCache.has(cacheKey)) {
      return this.recommendationCache.get(cacheKey)!.slice(0, limit);
    }

    const currentNodeId = `${contentId}-${refId}`;
    const currentNode = this.graph.nodes.get(currentNodeId);

    if (!currentNode) return [];

    const recommendations: ReferenceRecommendation[] = [];

    // 1. 基于相似内容的推荐
    this.graph.edges.forEach((edge) => {
      if (edge.sourceId === currentNodeId || edge.targetId === currentNodeId) {
        const otherNodeId =
          edge.sourceId === currentNodeId ? edge.targetId : edge.sourceId;
        const otherNode = this.graph.nodes.get(otherNodeId);

        if (otherNode && edge.type === "similarity") {
          recommendations.push({
            refId: otherNode.refId,
            contentId: otherNode.contentId,
            score: edge.strength * otherNode.importance,
            reason: `与当前内容有 ${Math.round(edge.strength * 100)}% 的相似度`,
            type: "similar_content",
            confidence: edge.strength,
          });
        }
      }
    });

    // 2. 基于序列关系的推荐
    this.graph.edges.forEach((edge) => {
      if (edge.sourceId === currentNodeId && edge.type === "sequence") {
        const nextNode = this.graph.nodes.get(edge.targetId);
        if (nextNode) {
          recommendations.push({
            refId: nextNode.refId,
            contentId: nextNode.contentId,
            score: 0.8 * nextNode.importance,
            reason: "这是逻辑上的下一个段落内容",
            type: "follow_up",
            confidence: 0.9,
          });
        }
      }
    });

    // 3. 基于主题关联的推荐
    const currentTopics = currentNode.tags;
    this.graph.nodes.forEach((node, nodeId) => {
      if (nodeId === currentNodeId) return;

      const commonTopics = currentTopics.filter((topic) =>
        node.tags.includes(topic),
      );
      if (commonTopics.length > 0) {
        const topicScore =
          commonTopics.length /
          Math.max(currentTopics.length, node.tags.length);

        recommendations.push({
          refId: node.refId,
          contentId: node.contentId,
          score: topicScore * node.importance * 0.7,
          reason: `共享主题: ${commonTopics.slice(0, 2).join(", ")}`,
          type: "related_topic",
          confidence: topicScore,
        });
      }
    });

    // 排序并去重
    const uniqueRecommendations = recommendations
      .filter(
        (rec, index, arr) =>
          arr.findIndex(
            (r) => r.refId === rec.refId && r.contentId === rec.contentId,
          ) === index,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2); // 取更多候选，后续筛选

    // 缓存结果
    this.recommendationCache.set(cacheKey, uniqueRecommendations);

    return uniqueRecommendations.slice(0, limit);
  }

  /**
   * 🎨 检测引用聚类
   */
  detectClusters(): ReferenceCluster[] {
    // 简化的聚类算法（基于连通性）
    const visited = new Set<string>();
    const clusters: ReferenceCluster[] = [];

    this.graph.nodes.forEach((node, nodeId) => {
      if (visited.has(nodeId)) return;

      // DFS 查找连通分量
      const clusterNodes: string[] = [];
      const stack = [nodeId];

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;

        visited.add(currentId);
        clusterNodes.push(currentId);

        // 查找邻居节点
        this.graph.edges.forEach((edge) => {
          if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
            stack.push(edge.targetId);
          } else if (
            edge.targetId === currentId &&
            !visited.has(edge.sourceId)
          ) {
            stack.push(edge.sourceId);
          }
        });
      }

      if (clusterNodes.length > 1) {
        // 找到聚类中心（最高重要性的节点）
        const centerNodeId = clusterNodes.reduce((center, nodeId) => {
          const centerNode = this.graph.nodes.get(center)!;
          const currentNode = this.graph.nodes.get(nodeId)!;
          return currentNode.importance > centerNode.importance
            ? nodeId
            : center;
        });

        const centerNode = this.graph.nodes.get(centerNodeId)!;

        clusters.push({
          id: `cluster-${clusters.length}`,
          name: `${centerNode.category} 相关内容`,
          nodes: clusterNodes,
          centroid: centerNode,
          coherence: this.calculateClusterCoherence(clusterNodes),
          size: clusterNodes.length,
        });
      }
    });

    return clusters.sort((a, b) => b.coherence - a.coherence);
  }

  /**
   * 📊 计算聚类一致性
   */
  private calculateClusterCoherence(nodeIds: string[]): number {
    if (nodeIds.length <= 1) return 1;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const node1 = this.graph.nodes.get(nodeIds[i])!;
        const node2 = this.graph.nodes.get(nodeIds[j])!;

        const similarity = this.calculateSemanticSimilarity(
          node1.content,
          node2.content,
        );
        totalSimilarity += similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * 🔄 查找强连通分量
   */
  private findStronglyConnectedComponents(): string[][] {
    // Tarjan 算法的简化版本
    const visited = new Set<string>();
    const components: string[][] = [];

    this.graph.nodes.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        const component = this.dfsComponent(nodeId, visited);
        if (component.length > 0) {
          components.push(component);
        }
      }
    });

    return components;
  }

  private dfsComponent(nodeId: string, visited: Set<string>): string[] {
    if (visited.has(nodeId)) return [];

    visited.add(nodeId);
    const component = [nodeId];

    this.graph.edges.forEach((edge) => {
      if (edge.sourceId === nodeId && !visited.has(edge.targetId)) {
        component.push(...this.dfsComponent(edge.targetId, visited));
      }
    });

    return component;
  }

  /**
   * 📊 获取引用统计
   */
  getReferenceStats(contentId?: string) {
    let nodes = Array.from(this.graph.nodes.values());

    if (contentId) {
      nodes = nodes.filter((node) => node.contentId === contentId);
    }

    return {
      totalReferences: nodes.length,
      averageImportance:
        nodes.reduce((sum, node) => sum + node.importance, 0) / nodes.length,
      topCategories: this.getTopCategories(nodes),
      mostImportantReferences: nodes
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5),
      recentlyAccessed: nodes
        .sort((a, b) => b.metadata.lastAccessed - a.metadata.lastAccessed)
        .slice(0, 5),
      clusters: this.detectClusters(),
    };
  }

  private getTopCategories(
    nodes: ReferenceNode[],
  ): Array<{ category: string; count: number }> {
    const categoryCount = new Map<string, number>();

    nodes.forEach((node) => {
      categoryCount.set(
        node.category,
        (categoryCount.get(node.category) || 0) + 1,
      );
    });

    return Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * 🎯 标记引用被访问
   */
  markReferenceAccessed(refId: number, contentId: string): void {
    const nodeId = `${contentId}-${refId}`;
    const node = this.graph.nodes.get(nodeId);

    if (node) {
      node.metadata.lastAccessed = Date.now();
      node.metadata.accessCount++;

      // 重新计算重要性
      this.calculateNodeMetrics();
    }
  }

  /**
   * 🧹 清理缓存
   */
  clearCache(): void {
    this.semanticCache.clear();
    this.recommendationCache.clear();
  }

  /**
   * 📤 导出图谱数据
   */
  exportGraph(): {
    nodes: ReferenceNode[];
    edges: ReferenceEdge[];
    stats: typeof this.graph.stats;
  } {
    return {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values()),
      stats: this.graph.stats,
    };
  }
}

// 单例实例
export const referenceGraphService = new ReferenceGraphService();

export default ReferenceGraphService;
