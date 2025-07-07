# Preview AnalysisCards JsonlRenderer 修复测试

## 修复说明

已修复 Content Library 的 preview 容器中 AnalysisCards 没有使用 JsonlRenderer 的问题：

### 修改文件：
- `components/ai/AnalysisCards.tsx`

### 主要修改：
1. **SummaryCard 组件**：将 `content: summaryText` 改为 `content: <UniversalContentRenderer content={summaryText} />`
2. **KeyPointsCard 组件**：将 `content: keyPointsContent` 改为 `content: <UniversalContentRenderer content={keyPointsContent} />`

### 原理：
- `UniversalContentRenderer` 会自动检测内容格式
- 如果是 JSONL 格式，会使用 `JsonlRenderer` 进行渲染
- 如果是普通文本，会使用 `MarkdownRenderer` 进行渲染

## 测试方法

1. 访问 Content Library 页面
2. 点击任何一个内容卡片，打开 preview
3. 查看 preview 中的 AnalysisCards 是否正确渲染了 JSONL 格式内容

## 预期效果

**修复前**：JSONL 内容显示为原始 JSON 文本
```
{"type": "h2", "content": "关键要点"}
{"type": "insight", "content": "这是重要洞察"}
```

**修复后**：JSONL 内容被正确渲染为结构化内容
```
## 关键要点
💡 这是重要洞察
```

## 技术细节

### 数据流转：
1. AI 分析结果（JSONL 格式）
2. → adaptAnalysisData() 
3. → SummaryCard/KeyPointsCard
4. → UniversalContentRenderer 
5. → JsonlRenderer（如果是 JSONL）
6. → 结构化渲染输出

### 兼容性：
- ✅ 支持 JSONL 格式
- ✅ 支持纯文本格式  
- ✅ 支持 Markdown 格式
- ✅ 向后兼容现有数据