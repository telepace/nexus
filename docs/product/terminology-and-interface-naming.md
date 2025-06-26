## 📖 Content Library 阅读界面命名体系

### 左右侧边栏命名定义

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Original Pane** | 原文面板 | 左侧区域，展示 Document 的原始内容（contentMarkdown） | 主要阅读区域 |
| **Insight Pane** | 洞察面板 | 右侧区域，展示 AI Cards、推荐指令、Notebook 入口 | AI 辅助区域 |
| **Split View** | 分屏视图 | 左右分栏的整体布局模式 | 对应 PC 端主要交互模式 |

### 深度分析与补充

#### 1. 左侧原文面板（Original Pane）细分组件

| **英文术语** | **中文术语** | **定义 / 用途** | **设计考量** |
| --- | --- | --- | --- |
| **Content Navigator** | 内容导航器 | 文档章节/分段的导航树，支持快速跳转 | 长文档必需，基于智能分段结果 |
| **Reading Progress** | 阅读进度 | 可视化显示当前阅读位置和整体进度 | 增强用户控制感 |
| **Text Selection Layer** | 文本选择层 | 支持 Snippet 圈选交互的底层组件 | 核心交互，触发 SnippetMenu |
| **Highlight Overlay** | 高亮覆盖层 | 显示与右侧 AI 结果关联的原文位置映射 | 基于 Position Mapping 实现 |
| **Adaptive Typography** | 自适应排版 | 根据内容类型优化的字体、行距、段落间距 | 提升长时间阅读体验 |

#### 2. 右侧洞察面板（Insight Pane）细分组件

| **英文术语** | **中文术语** | **定义 / 用途** | **设计考量** |
| --- | --- | --- | --- |
| **Card Stream** | 卡片流 | AI Results 的有序展示区域，支持折叠/展开 | 核心 AI 输出展示 |
| **Command Palette** | 指令面板 | 推荐 AI Commands 的快捷入口 | 基于 CommandOrderSet 排序 |
| **Context Sidebar** | 上下文侧栏 | 显示当前选中 Segment 的相关信息 | 与左侧选择联动 |
| **Notebook Quick Access** | 笔记快捷入口 | 一键保存当前内容到 Notebook 的操作区 | 降低收藏门槛 |
| **Cross-Reference Panel** | 交叉引用面板 | 显示与当前内容相关的其他 Documents | 基于 RAG 实现 |

#### 3. 交互状态与模式

| **英文术语** | **中文术语** | **定义 / 用途** | **触发条件** |
| --- | --- | --- | --- |
| **Focus Mode** | 专注模式 | 隐藏右侧面板，原文全屏展示 | 用户主动切换或长时间无交互 |
| **Analysis Mode** | 分析模式 | 右侧面板展开，显示详细 AI 分析结果 | 点击 AI Card 或执行 AI Command 后 |
| **Snippet Mode** | 圈选模式 | 激活文本选择功能，显示 SnippetMenu | 用户开始圈选文本时 |
| **Navigation Mode** | 导航模式 | 突出显示章节结构，便于快速跳转 | 用户点击内容导航器时 |

## 🎨 界面设计深化建议

### 视觉层级设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Title + Meta                    │
├─────────────────────┬───────────────────────────────────────┤
│                     │  ┌─ Command Palette                   │
│  Content Navigator  │  ├─ Card Stream                       │
│  ┌─ Chapter 1       │  │  ├─ Summary Card                   │
│  ├─ Chapter 2 ◄───  │  │  ├─ Key Points Card               │
│  └─ Chapter 3       │  │  └─ Q&A Card                      │
│                     │  ├─ Notebook Quick Access            │
│  Original Content   │  └─ Cross-Reference Panel            │
│  ================   │                                       │
│  Content text with  │                                       │
│  highlight mapping  │                                       │
│  and selection...   │                                       │
│                     │                                       │
│  [Reading Progress] │                                       │
└─────────────────────┴───────────────────────────────────────┘
```

### 响应式适配策略

| **设备类型** | **布局策略** | **交互优化** |
| --- | --- | --- |
| **Desktop** | 固定左右分栏，比例可调节 | 支持所有交互功能 |
| **Tablet** | 可切换单栏/双栏模式 | 简化 Command Palette |
| **Mobile** | 单栏堆叠，底部 Sheet 展示 AI 结果 | 手势优化的 Mobile Card |

### 个性化与自适应

| **英文术语** | **中文术语** | **自适应逻辑** |
| --- | --- | --- |
| **Layout Memory** | 布局记忆 | 记住用户的面板宽度、折叠状态偏好 |
| **Content-Aware UI** | 内容感知界面 | 根据文档类型（书籍/文章）调整界面元素 |
| **Progressive Disclosure** | 渐进式展示 | 基于用户行为逐步展示高级功能 |

## 🔄 状态管理与数据流

### 界面状态同步

```
Original Pane ↔ Insight Pane
     ↓              ↓
Selection State → AI Command Trigger
     ↓              ↓  
Position Mapping ← AI Result Display
     ↓              ↓
Highlight Update ← Card Interaction
```

### 性能优化策略

| **策略** | **应用场景** | **技术实现** |
| --- | --- | --- |
| **Virtual Scrolling** | 长文档的原文展示 | 大文档分页加载 |
| **Lazy Card Loading** | AI Results 的渲染 | 视窗内 Card 才渲染 |
| **Debounced Selection** | Snippet 圈选交互 | 防止频繁触发 AI 调用 |

## 💡 创新交互设计

### 智能辅助功能

| **功能名称** | **触发方式** | **用户价值** |
| --- | --- | --- |
| **Smart Bookmarking** | 长按文本段落 | 自动提取关键信息到 Notebook |
| **Context Bridging** | 双击专业词汇 | 显示相关解释和背景知识 |
| **Reading Flow Optimization** | AI 检测阅读停顿 | 主动推荐相关 AI Command |
| **Cross-Document Linking** | 选中相似概念 | 显示其他文档中的相关讨论 |

---

## 🎯 核心业务概念

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Document** | 文档 | 用户上传的顶层内容物（PDF、网页、文档等）。 | 字段核心：documentId, content, contentMarkdown |
| **AI Command** | AI 指令 | 触发 LLM 的单条操作 | commandId, defaultOrder |
| **AI Result** | AI 结果 | 执行 AI Command 后得到的原始文本输出。 | 与 Card 分离：Result 是数据，Card 是 UI 容器 |
| **Card** | 卡片 | AI Result 渲染后的可视化容器（Markdown、HTML、图表…）。 | 特殊富媒体可称 Artifact |
| **Feeds / Feed** | Feed 流 / Feed | 供用户消费的内容列表；每一个 Document 处理完后生成一条 Feed。 |  |
| **CommandOrderSet** | 指令推荐顺序集 | 针对同一 Document的一组推荐指令顺序。 | 字段：plannedOrder, executionOrder  [AI指令推荐排序 PRD](https://gcn1azh2dm21.feishu.cn/wiki/JFChw954MiFZjnkXfUpcyxy1nof) |

---

## 🛠️ 产品功能模块

| **英文术语** | **中文术语** | **定义 / 用途** |
| --- | --- | --- |
| **Document Upload** | 文档上传 | 内容获取入口，支持文件、链接、主题关键词。 |
| **Document Processing** | 文档预处理 | OCR、分页、抽标题、生成摘要等离线流程。 |
| **Extension** | 浏览器插件 | 提供快速 Clipping、SidePanel 功能。 |

---

## 🏗️ 技术架构概念

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Segment** | 分段 | 一级拆分：将 Document 切成子文档。 | segmentOrder |
| **Chunk** | 块 | 二级拆分：将 Segment 切成向量化粒度，用于 Embedding。 | chunkOrder |
| **Artifact** | 画布 | 用 Card 渲染富媒体（HTML、SVG、图表）时的容器资源。 | 仅当 Card 需保存外部文件时使用 |

---

## 📚 文档属性

| **字段** | **含义** |
| --- | --- |
| content | 文档原文（纯文本或富文本 HTML）。 |
| contentMarkdown | Markdown 版本，预处理阶段生成。 |
| subheading | 一句话概览，帮助用户判断是否展开阅读。 |
| summary | AI 自动摘要（Document Processing 输出）。 |
| notebook | 用户收藏的 AI Result 或笔记集合。 |

---

## 🖥️ 用户界面与交互

| **英文术语** | **中文术语** | **定义 / 用途** |
| --- | --- | --- |
| **Snippet** | 圈选文本 | 用户在原文 / AI 结果中框选的文字片段。 |
| **SnippetMenu** | 圈选菜单 | 悬浮按钮组，对 Snippet 可执行的 AI Command 列表。 |
| **Collapse / Expand** | 折叠 / 展开 | UI 交互，用于收起或展开 Card / 段落等。 |

圈选交互（Snippet）PRD

---

## 🔧 插件相关术语

| **英文术语** | **中文术语** | **定义 / 用途** |
| --- | --- | --- |
| **Clipping** | 剪藏 | 一键保存网页正文到 Document。 |
| **DOM Extraction** | DOM 提取 | 从当前页面提取正文、元数据、读者评论等。 |
| **SidePanel** | 侧边栏 | 插件主 UI，整合阅读、AI 指令、聊天等功能。 |

---

## 🔄 处理流程相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Watch List** | 待处理列表 | 内容获取后、AI预处理前的暂存队列 | 区别于传统的"稍后阅读"，侧重处理状态 |
| **Agentic Mode** | 智能体模式 | AI根据原则自主规划、执行、评估任务的处理模式 | vs 非Agentic模式（规则驱动） |
| **Principle** | 原则 | 指导AI行为的规则集，存储为MD/JSON格式 | 如"打分原则"、"总结原则" |
| **Memory Context** | 记忆上下文 | AI交互过程中维护的历史信息和状态 | 区别于单次请求的context |

## 📝 内容组织相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Atomic Fragment** | 原子片段 | 长文章分割的基本单元（2000-4000字） | 介于Segment和Chunk之间 |
| **Mobile Card** | 手机卡片 | 为移动端优化的内容片段（200-400字） | 特殊的Chunk类型 |
| **Prompt Pack** | 指令套餐 | 预定义的AI指令组合，如"快速浏览"、"深度理解" | 区别于单个Prompt |
| **Prompt Schema** | 指令模式 | 定义Prompt的结构化配置（input_keys, template, output_type等） | 行业标准术语 |

## 🎯 AI处理相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Intelligent Segmentation** | 智能分段 | 基于语义和结构（而非固定长度）的文本切分 | 核心技术特性 |
| **Iterative Processing** | 迭代处理 | AI任务包含质量评估和循环优化的处理方式 | 如"迭代总结"、"迭代生成" |
| **Quality Assessment** | 质量评估 | AI输出的自动化质量判断机制 | 用于迭代终止条件 |
| **RAG Index** | RAG索引 | 检索增强生成的向量化索引标记 | 行业标准术语 |

## 🗂️ 数据状态相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Processing Status** | 处理状态 | pending/segmenting/ready/error等文档状态 | 需要明确状态机 |
| **Task Status** | 任务状态 | pending/running/success/failed等AI任务状态 | 区别于文档状态 |
| **Embedding Reference** | 嵌入引用 | 指向向量数据库中存储位置的标识 | embedding_ref字段 |
| **Source Reference** | 源引用 | 指向原始内容（Segment/AIOutput）的标识 | source_ref字段 |

## 🖥️ 渲染相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Gamma Generation** | Gamma生成 | 将内容转换为类似Gamma的PPT式网页展示 | 特定的富媒体格式 |
| **Structured Message** | 结构化消息 | 带序号、可折叠的分层信息展示格式 | 区别于普通Markdown |
| **Original Text Index** | 原文索引 | AI结果中关联到原文特定位置的映射标记 | 用于追溯性 |
| **Position Mapping** | 位置映射 | position_id到原文片段和坐标（Bounding Box）的映射 | 用于高亮定位 |

## 🔍 搜索相关术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Deep Research** | 深度研究 | 基于主题进行多源、迭代的综合性内容获取 | 未来功能 |
| **Cross-text Analysis** | 跨文本分析 | 对多个文档进行比较、提取共同点或差异 | 高级分析功能 |
| **Semantic Search** | 语义搜索 | 基于向量相似度而非关键词的搜索方式 | 行业标准术语 |

## 💡 特殊概念术语

| **英文术语** | **中文术语** | **定义 / 用途** | **备注** |
| --- | --- | --- | --- |
| **Information Value Perception** | 信息价值感知 | 用户识别和判断信息价值的能力 | 产品核心理念 |
| **Mental Order** | 心智秩序 | 用户通过系统构建的个人知识体系和认知框架 | 产品愿景概念 |
| **Displacive Summary** | 置换式摘要 | 完全替代原文的摘要类型 | vs 补充式摘要 |
| **Information Judge** | 信息裁判 | 系统在信息洪流中的筛选和评判角色 | 产品定位隐喻 |
