# 智能卡片块界面 (Intelligent Card-Block Interface)

## 概述

这是一个基于卡片+块理念设计的智能阅读界面组件，融合了Notion风格的优雅交互和AI能力增强。

## 设计理念

### 卡片的本质两部分组成

**卡片的结构** + **卡片的内容**

- **卡片的结构**: 定义的规则，页面或者程序按照这种规则渲染，这个规则程序需要定义渲染的逻辑（扩展-属性）
- **卡片的内容**: 本质上是用户消费的数据，可以是AI生成的数据，或者是用户的数据文章等

### 核心概念

- **卡片应该是一个基础的消费载体**
- **最小的单位是块**，每个块都具备智能分析能力
- **块是LLM流式输出的一个基本单位**，定义块的规则，让LLM按照块的规则输出

## 功能特性

### ✨ 交互设计

1. **Notion风格悬浮操作**
   - 悬浮时左侧显示拖拽句柄
   - 右侧显示AI能力标记
   - 去除不必要的添加按钮，保持纯净

2. **渐进式信息披露**
   - 默认状态：纯净阅读体验
   - 悬浮状态：显示操作选项
   - 点击激活：弹出智能分析面板

3. **智能能力标记**
   - 每个块都有对应的AI能力图标
   - 5种能力类型：解析、搜索、讨论、方法、关联
   - 悬浮时显示能力名称提示

### 🎨 美学设计

1. **极简主义**
   - 减法美学：删除所有非必要元素
   - 留白运用：充分的元素间距
   - 色彩克制：单色调为主，强调色谨慎使用

2. **字体层级**
   ```css
   h2: 28px/bold/tight - 强烈的视觉锚点
   h3: 20px/semibold/snug - 清晰的章节划分  
   p:  16px/normal/1.7 - 舒适的阅读体验
   quote: 16px/italic/1.7 + 左边框 - 优雅的引用
   ```

3. **微交互**
   - 自然缓动：200-300ms过渡
   - 微位移：hover时的subtle变化
   - 背景模糊：弹窗的backdrop效果

## 使用方法

### 基本用法

```tsx
import CardBlockInterface from '@/components/card-blocks/card-block-interface';

function App() {
  return <CardBlockInterface />;
}
```

### 数据结构

```typescript
interface Block {
  id: string;
  type: 'h2' | 'h3' | 'p' | 'quote';
  content: string;
  capability: 'explain' | 'search' | 'discuss' | 'method' | 'connect';
}

interface CardData {
  title: string;
  blocks: Block[];
}
```

### AI能力类型

| 能力类型 | 图标 | 说明 |
|---------|------|------|
| explain | 💡 | 深度解析概念内涵 |
| search | 🔍 | 相关内容搜索 |
| discuss | 💬 | 观点讨论交流 |
| method | 🎯 | 实践方法指导 |
| connect | 📖 | 知识关联分析 |

## 技术实现

### 依赖项

- React 18+
- Tailwind CSS v4
- shadcn/ui 组件库
- Lucide React 图标库

### 组件结构

```
CardBlockInterface/
├── CardBlockInterface    # 主组件
├── BlockComponent       # 单个块组件  
├── CapabilityModal     # 能力弹窗
└── types.ts           # 类型定义
```

### 响应式设计

- 移动端：44px最小触摸目标
- 桌面端：精细的hover状态
- 适配暗色模式：WCAG AA对比度标准

## 设计原则

### 🌙 Dark Mode兼容

- 使用语义化color tokens
- 确保对比度≥4.5:1  
- 测试不同lighting conditions

### 📐 空间设计

- 8px网格系统
- 黄金比例指导尺寸关系
- 最大宽度32rem（类似高端杂志）

### 🎯 用户体验

- 内容优先：让内容成为界面主体
- 直觉操作：界面不言自明
- 认知负荷最小化

## 演示地址

🔗 **在线演示**: [https://claude.ai/public/artifacts/504db96c-9495-4ae6-a3ba-c319e46448a1](https://claude.ai/public/artifacts/504db96c-9495-4ae6-a3ba-c319e46448a1)

## 开发计划

### 下一步功能

- [ ] 块级别的拖拽重排
- [ ] 多选块操作
- [ ] 键盘快捷键支持
- [ ] 自定义AI能力扩展
- [ ] 导出为多种格式

### 优化方向

- [ ] 性能优化：虚拟滚动
- [ ] 无障碍访问：屏幕阅读器支持
- [ ] 国际化：多语言支持
- [ ] 主题系统：自定义色彩方案

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建Pull Request

## 许可证

本项目采用 [MIT License](LICENSE)
