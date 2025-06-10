"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Brain,
  Star,
  Target,
  Lightbulb,
  GraduationCap,
  Building,
  Briefcase,
} from "lucide-react";

export function SocialProof() {
  // 用户成功故事
  const userStories = [
    {
      persona: "研究者",
      name: "Dr. Chen",
      role: "AI 研究员",
      icon: GraduationCap,
      gradient: "from-blue-500 to-cyan-500",
      challenge: "每月需要阅读 50+ 篇论文，很难跟上前沿进展",
      solution: "AI 摘要 + 智能分类",
      result: "阅读效率提升 3x，研究洞察力显著增强",
      metrics: [
        { label: "月处理论文", value: "200+", unit: "篇" },
        { label: "时间节省", value: "60%", unit: "" },
        { label: "知识留存", value: "85%", unit: "" },
      ],
    },
    {
      persona: "产品经理",
      name: "Sarah Wang",
      role: "高级产品经理",
      icon: Briefcase,
      gradient: "from-purple-500 to-pink-500",
      challenge: "信息过载导致决策困难，错过重要行业趋势",
      solution: "智能筛选 + 趋势分析",
      result: "从信息焦虑到战略清晰，团队决策质量大幅提升",
      metrics: [
        { label: "日处理信息", value: "100+", unit: "条" },
        { label: "决策准确率", value: "92%", unit: "" },
        { label: "团队效率", value: "2.5x", unit: "" },
      ],
    },
    {
      persona: "终身学习者",
      name: "Mike Zhang",
      role: "技术主管",
      icon: Building,
      gradient: "from-green-500 to-emerald-500",
      challenge: "学习内容碎片化，无法形成系统化知识体系",
      solution: "知识图谱 + 个人笔记",
      result: "构建完整技术知识体系，成为团队的技术专家",
      metrics: [
        { label: "知识节点", value: "500+", unit: "个" },
        { label: "学习路径", value: "15+", unit: "条" },
        { label: "技能提升", value: "显著", unit: "" },
      ],
    },
  ];

  // 核心数据指标
  const keyMetrics = [
    {
      icon: TrendingUp,
      label: "阅读效率提升",
      value: "300%",
      description: "平均用户反馈",
      color: "text-green-600",
    },
    {
      icon: Clock,
      label: "时间节省",
      value: "70%",
      description: "每天节省 2+ 小时",
      color: "text-blue-600",
    },
    {
      icon: Brain,
      label: "知识留存率",
      value: "85%",
      description: "vs 传统阅读 35%",
      color: "text-purple-600",
    },
    {
      icon: Users,
      label: "活跃用户",
      value: "10K+",
      description: "遍布全球的知识工作者",
      color: "text-orange-600",
    },
  ];

  // 使用场景
  const useScenes = [
    {
      icon: BookOpen,
      title: "学术研究",
      description: "快速梳理文献，发现研究机会",
      users: "研究员、博士生、学者",
    },
    {
      icon: Target,
      title: "行业分析",
      description: "追踪趋势，洞察商机",
      users: "分析师、投资人、咨询师",
    },
    {
      icon: Lightbulb,
      title: "产品创新",
      description: "整合信息，激发创意",
      users: "产品经理、设计师、创业者",
    },
    {
      icon: GraduationCap,
      title: "技能提升",
      description: "系统学习，持续成长",
      users: "工程师、管理者、学生",
    },
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Star className="w-4 h-4 mr-2" />
            用户价值
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            已经帮助数千位知识工作者
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            从学者到创业者，从研究员到产品经理，他们都在用 AI 重新定义学习方式
          </p>
        </div>

        {/* 核心数据指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {keyMetrics.map((metric, index) => (
            <Card
              key={index}
              className="text-center hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center`}
                >
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {metric.value}
                </div>
                <div className="text-sm font-medium text-foreground mb-2">
                  {metric.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {metric.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 用户成功故事 */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-center text-foreground mb-12">
            真实用户的成功转变
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {userStories.map((story, index) => (
              <Card
                key={index}
                className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  {/* 用户信息 */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-r ${story.gradient} flex items-center justify-center`}
                    >
                      <story.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {story.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {story.role}
                      </p>
                    </div>
                  </div>

                  {/* 挑战 */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      面临挑战
                    </h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {story.challenge}
                    </p>
                  </div>

                  {/* 解决方案 */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      使用功能
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {story.solution}
                    </p>
                  </div>

                  {/* 结果 */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      获得成果
                    </h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {story.result}
                    </p>
                  </div>

                  {/* 关键指标 */}
                  <div className="grid grid-cols-3 gap-3">
                    {story.metrics.map((metric, metricIndex) => (
                      <div key={metricIndex} className="text-center">
                        <div className="text-lg font-bold text-foreground">
                          {metric.value}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metric.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 装饰性背景 */}
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${story.gradient} opacity-5 group-hover:opacity-10 transition-opacity rounded-full -mr-16 -mt-16`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 使用场景 */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-center text-foreground mb-12">
            适用于多种专业场景
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useScenes.map((scene, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-lg transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <scene.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {scene.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {scene.description}
                  </p>
                  <div className="text-xs text-primary bg-primary/10 rounded-full px-3 py-1 inline-block">
                    {scene.users}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 底部总结 */}
        <div className="text-center">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
            <CardContent className="p-12">
              <h3 className="text-3xl font-bold text-foreground mb-4">
                你也可以成为下一个成功案例
              </h3>
              <p className="text-xl text-muted-foreground mb-8">
                加入数千位知识工作者的行列，用 AI 重新定义你的学习和工作方式
              </p>
              <div className="flex items-center justify-center space-x-8 text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">2 分钟快速设置</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span className="text-sm">免费开始使用</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">随时取消订阅</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
