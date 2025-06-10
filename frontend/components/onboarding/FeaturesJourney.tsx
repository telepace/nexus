"use client";

import { useRef, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Brain,
  Newspaper,
  MessageCircle,
  BookMarked,
  ArrowRight,
  Globe,
  FileText,
  Link2,
  Layers,
  Lightbulb,
  Network,
} from "lucide-react";

export function FeaturesJourney() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // 用户旅程步骤
  const journeySteps = useMemo(
    () => [
      {
        id: "input",
        title: "随手保存，智能整理",
        subtitle: "多种方式，轻松导入",
        icon: Upload,
        color: "from-blue-500 to-cyan-500",
        description:
          "支持文件拖拽、链接粘贴、浏览器插件等多种方式，让内容收集变得简单自然。",
        features: [
          {
            icon: FileText,
            text: "拖拽文件上传",
            detail: "支持 PDF、Word、TXT 等格式",
          },
          { icon: Link2, text: "一键保存链接", detail: "智能抓取网页核心内容" },
          {
            icon: Globe,
            text: "浏览器插件",
            detail: "随时随地保存有价值的内容",
          },
        ],
        visual: "📁→📄→💾",
      },
      {
        id: "processing",
        title: "AI 理解，结构重构",
        subtitle: "深度分析，智能处理",
        icon: Brain,
        color: "from-purple-500 to-pink-500",
        description:
          "强大的 AI 引擎深度理解内容语义，自动分段、提取要点、生成摘要。",
        features: [
          { icon: Layers, text: "智能分段", detail: "按主题自动划分内容结构" },
          {
            icon: Lightbulb,
            text: "要点提取",
            detail: "自动识别关键信息和观点",
          },
          { icon: FileText, text: "生成摘要", detail: "压缩冗余，保留精华" },
        ],
        visual: "📄→🧠→📋",
      },
      {
        id: "browsing",
        title: "高效浏览，快速筛选",
        subtitle: "Feed 流设计，一目了然",
        icon: Newspaper,
        color: "from-green-500 to-emerald-500",
        description:
          "以卡片流的形式展示处理后的内容，快速浏览和筛选真正有价值的信息。",
        features: [
          { icon: Newspaper, text: "卡片式布局", detail: "清晰展示摘要和要点" },
          {
            icon: ArrowRight,
            text: "快速筛选",
            detail: "一键标记重要、稍后、归档",
          },
          {
            icon: Globe,
            text: "多维分类",
            detail: "按主题、来源、时间智能分组",
          },
        ],
        visual: "📋→👀→✅",
      },
      {
        id: "interaction",
        title: "深度对话，洞察发现",
        subtitle: "AI 问答，思维碰撞",
        icon: MessageCircle,
        color: "from-orange-500 to-red-500",
        description: "与内容进行深度对话，发现隐藏的洞察，拓展思维边界。",
        features: [
          {
            icon: MessageCircle,
            text: "智能问答",
            detail: "基于内容的深度对话",
          },
          {
            icon: Lightbulb,
            text: "洞察发现",
            detail: "挖掘内容间的关联和启发",
          },
          { icon: Network, text: "思维拓展", detail: "从单点认知到系统理解" },
        ],
        visual: "💬→🤔→💡",
      },
      {
        id: "knowledge",
        title: "知识积累，体系构建",
        subtitle: "沉淀精华，构建网络",
        icon: BookMarked,
        color: "from-indigo-500 to-purple-500",
        description:
          "将有价值的内容和洞察整理成个人知识库，构建属于自己的知识体系。",
        features: [
          {
            icon: BookMarked,
            text: "笔记整理",
            detail: "结构化保存重要内容和思考",
          },
          { icon: Network, text: "知识图谱", detail: "可视化展示知识间的关联" },
          {
            icon: Layers,
            text: "体系构建",
            detail: "从点到面，形成完整认知框架",
          },
        ],
        visual: "📝→🕸️→🏗️",
      },
    ],
    [],
  );

  // 滚动监听，实现步骤自动切换
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepId = entry.target.getAttribute("data-step");
            const stepIndex = journeySteps.findIndex(
              (step) => step.id === stepId,
            );
            if (stepIndex !== -1) {
              // Keep for potential future use with step indicators
            }
          }
        });
      },
      { threshold: 0.6 },
    );

    const stepElements = document.querySelectorAll("[data-step]");
    stepElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [journeySteps]);

  return (
    <section className="py-20" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <ArrowRight className="w-4 h-4 mr-2" />
            完整流程
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            从信息到知识的完整旅程
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            跟随我们的步伐，看看如何将零散的信息转化为有价值的知识体系
          </p>
        </div>

        {/* 旅程步骤 */}
        <div className="space-y-32">
          {journeySteps.map((step, index) => (
            <div
              key={step.id}
              data-step={step.id}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
              }`}
            >
              {/* 内容区域 */}
              <div
                className={`space-y-6 ${index % 2 === 1 ? "lg:col-start-2" : ""}`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      步骤 {index + 1}
                    </Badge>
                    <h3 className="text-2xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed text-lg">
                  {step.description}
                </p>

                <div className="space-y-4">
                  {step.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-start space-x-3"
                    >
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <feature.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {feature.text}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {feature.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 视觉演示区域 */}
              <div
                className={`${index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}
              >
                <Card className="h-80 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-8 h-full flex flex-col items-center justify-center">
                    {/* 简化的视觉表示 */}
                    <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110 duration-300">
                      {step.visual}
                    </div>

                    <div
                      className={`w-full h-2 bg-gradient-to-r ${step.color} rounded-full mb-4 opacity-20`}
                    />

                    <div className="text-center">
                      <h4 className="font-semibold text-foreground mb-2">
                        {step.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {step.subtitle}
                      </p>
                    </div>

                    {/* 装饰性背景 */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-5 group-hover:opacity-10 transition-opacity`}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* 旅程总结 */}
        <div className="mt-32 text-center">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-12">
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  完整的知识管理闭环
                </h3>
                <p className="text-xl text-muted-foreground">
                  从随手收集到系统沉淀，让每一份学习都有价值
                </p>
              </div>

              <div className="flex justify-center items-center space-x-4 text-4xl">
                <span>📥</span>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <span>🧠</span>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <span>📋</span>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <span>💬</span>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <span>🏗️</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 text-center">
                <div>
                  <p className="text-sm font-medium text-foreground">收集</p>
                  <p className="text-xs text-muted-foreground">随手保存</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">理解</p>
                  <p className="text-xs text-muted-foreground">AI 分析</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">浏览</p>
                  <p className="text-xs text-muted-foreground">快速筛选</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">交互</p>
                  <p className="text-xs text-muted-foreground">深度对话</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">沉淀</p>
                  <p className="text-xs text-muted-foreground">知识体系</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
