"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Brain, Target, Zap } from "lucide-react";
import Link from "next/link";

export function OnboardingHero() {
  const [currentProblem, setCurrentProblem] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 用户痛点场景
  const problems = [
    {
      icon: "📚",
      text: "收藏了 200+ 文章，却很少真正阅读",
      subtext: "信息堆积，知识焦虑",
    },
    {
      icon: "🌊",
      text: "每天被信息洪流淹没，找不到重点",
      subtext: "注意力分散，效率低下",
    },
    {
      icon: "🧠",
      text: "读完就忘，无法形成系统化知识",
      subtext: "学习碎片化，缺乏沉淀",
    },
  ];

  // 解决方案特性
  const solutions = [
    {
      icon: Brain,
      title: "AI 智能理解",
      description: "深度解析内容结构，提取核心观点",
    },
    {
      icon: Target,
      title: "精准摘要",
      description: "智能分段，快速抓住文章重点",
    },
    {
      icon: BookOpen,
      title: "知识沉淀",
      description: "构建个人知识库，让学习有迹可循",
    },
  ];

  // 问题轮播效果
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentProblem((prev) => (prev + 1) % problems.length);
        setIsTransitioning(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [problems.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />

      {/* 动态背景装饰 */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
        <div
          className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* 顶部标识 */}
        <div className="mb-8">
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium">
            <Zap className="w-4 h-4 mr-2" />
            AI 驱动的智能阅读助手
          </Badge>
        </div>

        {/* 痛点共鸣区域 */}
        <div className="mb-12">
          <h2 className="text-lg text-muted-foreground mb-6">
            你是否也遇到过这样的困扰？
          </h2>
          <div className="relative h-20 flex items-center justify-center">
            <div
              className={`transition-all duration-300 ${
                isTransitioning
                  ? "opacity-0 transform scale-95"
                  : "opacity-100 transform scale-100"
              }`}
            >
              <div className="text-2xl mb-2">
                {problems[currentProblem].icon}
              </div>
              <p className="text-xl font-medium text-foreground">
                {problems[currentProblem].text}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {problems[currentProblem].subtext}
              </p>
            </div>
          </div>

          {/* 问题指示器 */}
          <div className="flex justify-center space-x-2 mt-6">
            {problems.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentProblem ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 价值主张 */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            重新发现
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              阅读的乐趣
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            让 AI 成为你的知识整理师，从信息焦虑到深度理解，
            <br />
            构建属于自己的知识秩序
          </p>
        </div>

        {/* 核心特性展示 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {solutions.map((solution, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <solution.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {solution.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {solution.description}
              </p>
            </div>
          ))}
        </div>

        {/* 主要 CTA */}
        <div className="space-y-4">
          <Link href="/setup">
            <Button
              size="lg"
              className="px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              开始你的知识旅程
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground">
            免费开始，无需信用卡 • 2 分钟即可设置完成
          </p>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex flex-col items-center space-y-2 text-muted-foreground">
            <span className="text-xs">体验完整流程</span>
            <div className="w-5 h-8 border border-muted-foreground/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-muted-foreground/50 rounded-full animate-bounce mt-2" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
