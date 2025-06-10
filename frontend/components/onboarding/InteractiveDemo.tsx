"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Wand2,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Target,
} from "lucide-react";

export function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(0);

  // 示例文章
  const sampleArticles = [
    {
      title: "深度学习的未来发展趋势",
      type: "技术文章",
      content:
        "随着人工智能技术的快速发展，深度学习已经成为了推动技术革新的重要力量。从最初的神经网络到现在的Transformer架构，我们见证了算法的巨大飞跃。未来，深度学习将在更多领域发挥作用，包括自然语言处理、计算机视觉、语音识别等。同时，随着计算能力的提升和数据量的增长，我们有理由相信深度学习将会带来更多突破性的进展...",
      summary:
        "文章探讨了深度学习从神经网络到Transformer的技术演进，预测其在NLP、CV、语音识别等领域的未来应用前景，强调计算能力和数据增长将推动更多突破。",
      keyPoints: [
        "Transformer架构带来算法突破",
        "多领域应用前景广阔",
        "计算能力提升是关键驱动力",
      ],
    },
    {
      title: "远程工作的组织管理挑战",
      type: "管理思考",
      content:
        "疫情之后，远程工作已经成为了许多公司的常态。然而，这种工作模式也带来了新的挑战：如何保持团队协作效率？如何维护企业文化？如何进行有效的绩效管理？本文将从组织行为学的角度，分析远程工作模式下的管理难点，并提供一些实用的解决方案。我们发现，成功的远程团队往往具有几个共同特征：清晰的沟通机制、强大的自我管理能力、以及基于结果的评估体系...",
      summary:
        "文章分析远程工作带来的团队协作、企业文化维护、绩效管理等挑战，从组织行为学角度提出解决方案，指出成功远程团队的三个关键特征。",
      keyPoints: [
        "远程工作成为后疫情时代常态",
        "管理挑战集中在协作和文化维护",
        "成功团队的三个关键特征",
      ],
    },
    {
      title: "可持续发展与企业社会责任",
      type: "行业报告",
      content:
        "在全球气候变化和环境问题日益严峻的背景下，企业社会责任（CSR）已经不再是可有可无的附加项，而是关系到企业长期发展的核心战略。越来越多的消费者开始关注企业的环境影响和社会价值，这也推动了ESG（环境、社会、治理）投资的兴起。本报告通过分析全球500强企业的CSR实践，发现了一些共同的趋势和最佳实践...",
      summary:
        "报告分析企业社会责任从附加项转变为核心战略的背景，探讨ESG投资兴起的推动因素，总结全球500强企业CSR实践的共同趋势。",
      keyPoints: [
        "CSR从附加项转为核心战略",
        "消费者环保意识推动ESG投资",
        "全球500强企业实践趋势分析",
      ],
    },
  ];

  const steps = [
    {
      title: "选择内容",
      description: "选择一篇文章或粘贴你想要分析的内容",
      icon: FileText,
    },
    {
      title: "AI 处理",
      description: "智能分析内容结构，提取关键信息",
      icon: Wand2,
    },
    {
      title: "生成摘要",
      description: "自动生成结构化摘要和要点",
      icon: Target,
    },
    {
      title: "智能问答",
      description: "与内容进行深度对话，获得洞察",
      icon: MessageSquare,
    },
  ];

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgress(0);

    // 模拟处理过程
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setProgress(i);
    }

    setIsProcessing(false);
    setCurrentStep(3);
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            实时体验
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            亲身体验 AI 阅读助手
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            选择一篇文章，观看 AI 如何将复杂内容转化为结构化知识
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <button
                  onClick={() => handleStepClick(index)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                    index <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } ${index < currentStep ? "cursor-pointer hover:bg-primary/90" : ""}`}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 主要演示区域 */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>选择内容</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 文章选择器 */}
              <div className="space-y-3">
                {sampleArticles.map((article, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedArticle(index)}
                    className={`w-full p-4 text-left rounded-lg border transition-all duration-300 ${
                      selectedArticle === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-foreground">
                        {article.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {article.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.content}
                    </p>
                  </button>
                ))}
              </div>

              {/* 自定义输入 */}
              <div className="pt-4 border-t">
                <Textarea
                  placeholder="或者粘贴你想要分析的文章内容..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* 处理按钮 */}
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 处理中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    开始 AI 分析
                  </>
                )}
              </Button>

              {/* 处理进度 */}
              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>正在智能分析内容结构...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：结果展示 */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>AI 处理结果</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep >= 3 ? (
                <div className="space-y-6">
                  {/* 智能摘要 */}
                  <div>
                    <h3 className="font-medium text-foreground mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      智能摘要
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sampleArticles[selectedArticle].summary}
                    </p>
                  </div>

                  {/* 关键要点 */}
                  <div>
                    <h3 className="font-medium text-foreground mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      关键要点
                    </h3>
                    <ul className="space-y-2">
                      {sampleArticles[selectedArticle].keyPoints.map(
                        (point, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {point}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* AI 问答演示 */}
                  <div>
                    <h3 className="font-medium text-foreground mb-3 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                      AI 智能问答
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          💭 这篇文章的核心观点是什么？
                        </p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-primary">
                        <p className="text-sm text-foreground">
                          基于文章内容，核心观点是强调技术发展的重要性和未来应用前景...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Wand2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    选择一篇文章并点击分析，查看 AI 处理结果
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部说明 */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            ✨ 这只是 AI
            能力的一小部分展示，完整体验还包括个性化配置、知识图谱构建等功能
          </p>
        </div>
      </div>
    </section>
  );
}
