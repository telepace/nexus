"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Rocket, 
  Download, 
  Play, 
  Check,
  Sparkles,
  Clock,
  Star,
  Zap,
  Shield,
  Gift
} from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  // 核心价值点
  const valueProps = [
    {
      icon: Zap,
      title: "即刻生效",
      description: "无需复杂配置，2分钟即可开始体验AI阅读助手的强大功能"
    },
    {
      icon: Shield,
      title: "隐私安全",
      description: "数据本地加密存储，完全掌控你的知识资产"
    },
    {
      icon: Gift,
      title: "免费体验",
      description: "核心功能免费使用，随时可以升级到更多高级特性"
    }
  ];

  // 用户担忧及解答
  const concerns = [
    {
      question: "会不会很复杂？",
      answer: "不会！我们专注简洁易用的设计，大多数功能都是一键完成。"
    },
    {
      question: "数据安全吗？",
      answer: "绝对安全！所有数据都在你的设备上加密存储，我们无法访问。"
    },
    {
      question: "免费版够用吗？",
      answer: "对大多数用户来说完全够用，包含核心的AI分析和笔记功能。"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
      <div className="max-w-7xl mx-auto px-4">
        {/* 主要CTA区域 */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            开始你的知识旅程
          </Badge>
          
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            准备好让 AI 成为
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              你的知识助手了吗？
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            不再为信息过载焦虑，不再让有价值的内容在收藏夹里沉睡。
            <br />
            现在就开始，重新发现阅读和学习的乐趣。
          </p>

          {/* 主要行动按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/setup">
              <Button 
                size="lg" 
                className="px-10 py-4 text-xl font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 group bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              >
                <Rocket className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform" />
                立即开始免费体验
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg font-medium rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
            >
              <Download className="w-5 h-5 mr-2" />
              安装浏览器插件
            </Button>
          </div>

          {/* 次要行动链接 */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-muted-foreground">
            <button className="flex items-center space-x-2 hover:text-foreground transition-colors">
              <Play className="w-4 h-4" />
              <span>观看产品演示 (2分钟)</span>
            </button>
            <span className="hidden sm:block">•</span>
            <Link href="/dashboard" className="flex items-center space-x-2 hover:text-foreground transition-colors">
              <span>已有账户？直接登录</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 核心价值强调 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {valueProps.map((prop, index) => (
            <div
              key={index}
              className="text-center group cursor-pointer"
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 ${
                hoveredFeature === index ? 'bg-primary/20 scale-110' : ''
              }`}>
                <prop.icon className={`w-8 h-8 text-primary transition-all duration-300 ${
                  hoveredFeature === index ? 'scale-110' : ''
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {prop.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>

        {/* 用户担忧解答 */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            常见疑虑解答
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {concerns.map((concern, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-bold flex items-center justify-center mr-2">
                      ?
                    </span>
                    {concern.question}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {concern.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 最后推动 */}
        <Card className="max-w-5xl mx-auto bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-foreground mb-4">
                超过 10,000+ 用户已经开始了他们的知识旅程
              </h3>
              <p className="text-lg text-muted-foreground">
                不要让信息焦虑继续困扰你，现在就加入我们
              </p>
            </div>

            {/* 用户反馈滚动 */}
            <div className="mb-8 overflow-hidden">
              <div className="flex space-x-8 animate-pulse">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground whitespace-nowrap">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>"阅读效率提升了3倍！" - 产品经理 Sarah</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground whitespace-nowrap">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>"终于有了完整的知识体系" - 研究员 Dr. Chen</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground whitespace-nowrap">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>"信息焦虑彻底消失了" - 创业者 Mike</span>
                </div>
              </div>
            </div>

            {/* 承诺保障 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Clock className="w-6 h-6 text-green-600" />
                <span className="text-xs text-muted-foreground">2分钟设置</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Check className="w-6 h-6 text-green-600" />
                <span className="text-xs text-muted-foreground">免费开始</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Shield className="w-6 h-6 text-green-600" />
                <span className="text-xs text-muted-foreground">数据安全</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Gift className="w-6 h-6 text-green-600" />
                <span className="text-xs text-muted-foreground">随时取消</span>
              </div>
            </div>

            {/* 最终CTA */}
            <Link href="/setup">
              <Button 
                size="lg" 
                className="px-12 py-4 text-xl font-bold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                现在就开始我的知识旅程
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            
            <p className="text-xs text-muted-foreground mt-4">
              点击开始即表示你同意我们的服务条款和隐私政策
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
} 