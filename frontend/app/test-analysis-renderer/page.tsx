"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisCard, ContentBlock } from "@/components/ui/analysis-card";
import { AnalysisContentRenderer, ReferenceInfo } from "@/components/ui/AnalysisContentRenderer";
import { useToast } from "@/hooks/use-toast";
import { Brain, BookOpen, Lightbulb, Sparkles, FileText, Target } from "lucide-react";

export default function TestAnalysisRendererPage() {
  const { toast } = useToast();

  // 示例 JSONL 分析内容
  const sampleAnalysisContent = `{"t":"h2","c":"核心观点"}
{"t":"insight","c":"类似NotebookLM的RAG系统通过文档解析、文本分块和来源映射技术，实现从多样化文档中提取信息并确保答案可追溯","ref":"2,3,4"}
{"t":"insight","c":"开源替代方案在文档处理流程上各有侧重，但与商业产品在成熟度上仍有差距","ref":"18,20,29"}

{"t":"h2","c":"主要内容"}
{"t":"p","c":"文档解析技术从简单文本提取演进到布局感知和多模态解析，以应对PDF/Office/网页等多样化格式","ref":"6,7"}
{"t":"p","c":"文本分块需平衡语义连贯性与检索效率，结构感知分块正成为新趋势","ref":"9,10,11,12"}
{"t":"p","c":"来源映射通过元数据存储和引用机制确保答案可追溯，是RAG可信度的基础","ref":"14,15,16"}
{"t":"p","c":"NotebookLM整合Gemini大模型和云服务，在长文本处理和文档理解上具有优势","ref":"17"}
{"t":"p","c":"开源生态呈现多样性，多个项目在解析/分块/引用环节各有创新实现","ref":"18,19,20,21"}

{"t":"h2","c":"关键细节"}
{"t":"concept","c":"表格解析是文档处理最大难点，布局感知和多模态方法是最有希望的解决方案","ref":"7","expandable":"表格解析技术"}
{"t":"concept","c":"字符偏移量是实现精确引用的关键元数据，支持在原始文档中高亮显示","ref":"15","expandable":"字符偏移量"}
{"t":"concept","c":"Verba项目提供Token/句子/语义/递归等6种分块策略，满足不同场景需求","ref":"9,19","expandable":"分块策略"}`;

  // 简化的 JSONL 示例
  const simpleAnalysisContent = `{"t":"h2","c":"AI 技术发展趋势"}
{"t":"insight","c":"生成式 AI 正在重塑内容创作和知识工作的未来","ref":"1,2"}
{"t":"p","c":"大语言模型的能力已经超越了传统的文本生成，开始涉足推理、编程、创作等复杂任务"}
{"t":"concept","c":"多模态融合是下一代 AI 系统的关键特征","expandable":"多模态技术"}
{"t":"p","c":"AI 系统将越来越多地整合视觉、听觉、文本等多种信息处理能力"}`;

  // 复杂的示例
  const complexAnalysisContent = `{"t":"h1","c":"深度研究：NotebookLM 技术分析"}
{"t":"h2","c":"技术架构"}
{"t":"insight","c":"NotebookLM 采用了分层处理架构，将文档理解、知识抽取和问答生成分离为独立模块","ref":"1,2,3"}
{"t":"p","c":"前端负责文档上传和用户交互，后端集成了多个 AI 服务进行文档处理"}
{"t":"concept","c":"Retrieval-Augmented Generation (RAG) 是核心技术","ref":"4,5","expandable":"RAG 技术详解"}
{"t":"p","c":"通过向量数据库存储文档片段，实现语义搜索和上下文增强生成"}

{"t":"h2","c":"创新点分析"}
{"t":"insight","c":"NotebookLM 的最大创新在于将 AI 助手与个人知识库深度结合","ref":"6,7,8"}
{"t":"p","c":"用户可以上传自己的文档，AI 基于这些私有内容提供个性化回答"}
{"t":"concept","c":"音频总结功能是一个重要的差异化特征","expandable":"音频生成技术"}
{"t":"p","c":"系统可以将文档内容转换为类似播客的音频对话形式"}

{"t":"h2","c":"技术挑战"}
{"t":"p","c":"长文档的处理需要解决上下文窗口限制问题"}
{"t":"concept","c":"多文档的知识融合是一个复杂的技术问题","ref":"9,10","expandable":"知识融合算法"}
{"t":"p","c":"如何保持生成内容的准确性和可信度是持续的挑战"}`;

  // 示例引用数据
  const sampleReferences: ReferenceInfo[] = [
    {
      id: 1,
      title: "NotebookLM 官方文档",
      source: "Google AI",
      snippet: "NotebookLM 是一个基于大语言模型的研究和写作助手...",
    },
    {
      id: 2,
      title: "RAG 技术原理",
      source: "AI 研究论文",
      snippet: "检索增强生成通过结合检索系统和生成模型...",
    },
    {
      id: 3,
      title: "多模态 AI 发展",
      source: "技术评估报告",
      snippet: "多模态模型能够处理文本、图像、音频等多种类型的输入...",
    },
  ];

  // 处理引用点击
  const handleReferenceClick = (refId: number) => {
    toast({
      title: `查看引用 #${refId}`,
      description: `跳转到引用来源 ${refId}`,
    });
  };

  // 创建卡片内容块
  const createAnalysisCard = (title: string, content: string) => {
    const contentBlocks: ContentBlock[] = [
      {
        id: "analysis",
        type: "analysis",
        content: content,
        tooltip: "基于 JSONL 格式的分析内容",
      },
    ];

    return contentBlocks;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              分析内容渲染器演示
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              全新的 JSONL 分析内容渲染系统，支持分层渲染、智能间距、引用系统和丰富交互
            </p>
          </div>

          {/* 功能介绍 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200/40 dark:border-blue-800/40">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              核心功能特性
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-medium text-blue-800 dark:text-blue-200">🎨 视觉设计</h3>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 分层渲染架构</li>
                  <li>• 类型专属设计语言</li>
                  <li>• 智能间距系统</li>
                  <li>• 响应式适配</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-blue-800 dark:text-blue-200">🔧 交互功能</h3>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 可展开概念块</li>
                  <li>• 引用系统导航</li>
                  <li>• 一键复制内容</li>
                  <li>• 悬浮提示信息</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-blue-800 dark:text-blue-200">📱 用户体验</h3>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 流畅动画效果</li>
                  <li>• 渐进式信息展示</li>
                  <li>• 上下文关联显示</li>
                  <li>• 无障碍支持</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 独立渲染器演示 */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              独立渲染器演示
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* 简单示例 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    简单分析内容
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisContentRenderer
                    content={simpleAnalysisContent}
                    references={sampleReferences}
                    onReferenceClick={handleReferenceClick}
                  />
                </CardContent>
              </Card>

              {/* 复杂示例 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    复杂分析内容
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisContentRenderer
                    content={complexAnalysisContent}
                    references={sampleReferences}
                    onReferenceClick={handleReferenceClick}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 增强卡片集成演示 */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              增强卡片集成演示
            </h2>

            <div className="grid gap-6">
              {/* 主要分析卡片 */}
              <AnalysisCard
                title="NotebookLM 技术深度分析"
                subtitle="基于 JSONL 格式的结构化分析内容"
                emoji="📊"
                contentBlocks={createAnalysisCard("主要分析", sampleAnalysisContent)}
                variant="featured"
                defaultActions={true}
                onCopyContent={async () => {
                  await navigator.clipboard.writeText(sampleAnalysisContent);
                  toast({
                    title: "已复制",
                    description: "分析内容已复制到剪贴板",
                  });
                }}
              />

              {/* 对比示例 */}
              <div className="grid gap-6 lg:grid-cols-2">
                <AnalysisCard
                  title="传统文本渲染"
                  subtitle="普通文本显示方式"
                  emoji="📝"
                  contentBlocks={[
                    {
                      id: "text",
                      type: "text",
                      content: `核心观点：类似NotebookLM的RAG系统通过文档解析、文本分块和来源映射技术，实现从多样化文档中提取信息并确保答案可追溯。主要内容：文档解析技术从简单文本提取演进到布局感知和多模态解析，以应对PDF/Office/网页等多样化格式。`,
                    },
                  ]}
                  variant="compact"
                />

                <AnalysisCard
                  title="结构化分析渲染"
                  subtitle="使用新的分析渲染器"
                  emoji="✨"
                  contentBlocks={createAnalysisCard("结构化", simpleAnalysisContent)}
                  variant="detailed"
                />
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                使用说明
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    支持的块类型
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>• <code>h1, h2, h3</code> - 标题块</div>
                    <div>• <code>insight</code> - 洞察块（高亮显示）</div>
                    <div>• <code>concept</code> - 概念块（可展开）</div>
                    <div>• <code>p</code> - 段落块</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    JSONL 格式
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 text-xs font-mono">
                    {`{"t":"h2","c":"标题内容"}
{"t":"insight","c":"洞察内容","ref":"1,2"}
{"t":"concept","c":"概念","expandable":"详情"}
{"t":"p","c":"段落内容","ref":"3"}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 