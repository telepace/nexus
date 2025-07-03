import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bookmark, 
  Share2, 
  MoreHorizontal, 
  Search,
  Lightbulb,
  BookOpen,
  Target,
  MessageSquare,
  Sparkles,
  X,
  Copy,
  ArrowRight,
  GripVertical
} from 'lucide-react';

// 极简的能力定义
const capabilities = {
  explain: { icon: Lightbulb, name: "深度解析" },
  search: { icon: Search, name: "相关搜索" },
  discuss: { icon: MessageSquare, name: "观点讨论" },
  method: { icon: Target, name: "实践方法" },
  connect: { icon: BookOpen, name: "知识关联" }
};

const cardData = {
  title: "AI产品设计的核心原则",
  blocks: [
    {
      id: "b1",
      type: "h2", 
      content: "用户体验的无感设计",
      capability: "explain"
    },
    {
      id: "b2",
      type: "p",
      content: "最好的AI产品设计是让用户感受不到AI的存在，技术应该像空气一样自然融入用户的工作流程中。当用户专注于完成任务时，AI在背后默默地提供智能支持。",
      capability: "discuss"
    },
    {
      id: "b3", 
      type: "h3",
      content: "渐进式智能披露",
      capability: "method"
    },
    {
      id: "b4",
      type: "p", 
      content: "不要一开始就展示所有AI能力，而是根据用户的使用深度逐步释放更高级的功能，避免认知过载。这需要精心设计的信息架构和用户引导策略。",
      capability: "method"
    },
    {
      id: "b5",
      type: "quote",
      content: "简约是复杂的终极体现。当你能把复杂的AI能力包装成简单的用户体验时，你就成功了。",
      capability: "connect"
    }
  ]
};

const CapabilityModal = ({ block, capability, onClose }) => {
  if (!block || !capability) return null;
  
  const Icon = capability.icon;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/3" onClick={onClose} />
      
      <Card className="relative w-72 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                <Icon className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{capability.name}</span>
            </div>
            <button onClick={onClose} className="w-5 h-5 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 py-0">
          <div className="text-xs text-muted-foreground/70 bg-muted/30 rounded-md p-2 border-l-2 border-primary/20">
            {block.content}
          </div>
          
          <div className="space-y-1">
            <button className="w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-muted/50 rounded-md transition-colors flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              开始智能分析
            </button>
            <button className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 rounded-md transition-colors flex items-center gap-2">
              <Copy className="w-3 h-3" />
              复制这段内容
            </button>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2">
          <Button size="sm" className="w-full h-7 text-xs bg-foreground hover:bg-foreground/90">
            执行分析
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const BlockComponent = ({ block, onCapabilityClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const capability = capabilities[block.capability];
  const Icon = capability.icon;

  const getTypeStyles = (type) => {
    switch (type) {
      case 'h2':
        return {
          wrapper: "mb-6 mt-8 first:mt-0",
          content: "text-[28px] font-bold text-foreground leading-tight tracking-tight"
        };
      case 'h3':
        return {
          wrapper: "mb-4 mt-8",
          content: "text-[20px] font-semibold text-foreground leading-snug"
        };
      case 'p':
        return {
          wrapper: "mb-6",
          content: "text-[16px] text-foreground/85 leading-[1.7] font-normal"
        };
      case 'quote':
        return {
          wrapper: "mb-6 pl-6 border-l-3 border-muted-foreground/20",
          content: "text-[16px] text-foreground/75 leading-[1.7] italic font-normal"
        };
      default:
        return {
          wrapper: "mb-6",
          content: "text-[16px] text-foreground/85 leading-[1.7]"
        };
    }
  };

  const styles = getTypeStyles(block.type);

  return (
    <div 
      className={`group relative ${styles.wrapper}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Notion风格左侧操作 - 只保留拖拽句柄 */}
      <div className={`
        absolute -left-8 top-1 transition-all duration-200
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `}>
        <button className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded transition-all">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 主要内容区域 */}
      <div className="relative group/content">
        <div className={styles.content}>
          {block.content}
        </div>

        {/* 能力标记 - 更自然的位置和样式 */}
        <div className={`
          absolute top-0 -right-10 flex items-center gap-1 transition-all duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          {/* 能力指示点 */}
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div>
          
          {/* 能力按钮 */}
          <button
            onClick={() => onCapabilityClick(block, capability)}
            className="w-5 h-5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200"
          >
            <Icon className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* 智能提示 - 悬浮时显示能力名称 */}
        {isHovered && (
          <div className="absolute top-6 -right-10 text-xs text-muted-foreground/60 whitespace-nowrap">
            {capability.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default function CardBlockInterface() {
  const [activeModal, setActiveModal] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleCapabilityClick = (block, capability) => {
    setActiveModal({ block, capability });
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 主容器 */}
      <div className="max-w-2xl mx-auto py-16 px-8">
        
        {/* 卡片标题区域 */}
        <header className="mb-16">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 text-xs font-normal border-border/50">
              <Sparkles className="w-3 h-3 mr-1" />
              智能卡片系统
            </Badge>
            <h1 className="text-[42px] font-bold text-foreground leading-tight tracking-tight mb-4">
              {cardData.title}
            </h1>
          </div>
          
          {/* 卡片结构说明 */}
          <div className="space-y-4 text-sm text-muted-foreground bg-muted/20 rounded-xl p-6 border border-border/30">
            <h2 className="text-base font-medium text-foreground mb-3">卡片的本质两部分组成：卡片的结构 + 卡片的内容</h2>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 mt-0.5 text-muted-foreground/40" />
                <div>
                  <span className="font-medium text-foreground">卡片的结构：</span>
                  <span className="ml-1">定义的规则，页面或者程序按照这种规则渲染，这个规则程序需要定义渲染的逻辑。（扩展-属性）</span>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 mt-0.5 rounded-full bg-primary/60 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-foreground">卡片的内容：</span>
                  <span className="ml-1">本质上是用户消费的数据，可以是 AI 生成的数据，或者是用户的数据文章等。</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground/80 mt-4 border-t border-border/30 pt-4">
              卡片应该是一个基础的消费载体，最小的单位是块，每个块都具备智能分析能力
            </p>
          </div>
        </header>

        {/* 阅读区域 */}
        <article className="relative pl-8 pr-12">
          {cardData.blocks.map((block) => (
            <BlockComponent
              key={block.id}
              block={block}
              onCapabilityClick={handleCapabilityClick}
            />
          ))}
        </article>

        {/* 文档底部操作 */}
        <footer className="mt-20 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`h-8 text-sm ${isBookmarked ? "text-primary" : "text-muted-foreground"}`}
              >
                <Bookmark className={`w-4 h-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? '已收藏' : '收藏'}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-sm text-muted-foreground">
                <Share2 className="w-4 h-4 mr-2" />
                分享
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{cardData.blocks.length} 个智能块</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {/* 能力弹窗 */}
      {activeModal && (
        <CapabilityModal
          block={activeModal.block}
          capability={activeModal.capability}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}