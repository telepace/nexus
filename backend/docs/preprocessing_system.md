# 预处理系统技术文档

## 🎯 系统总览

预处理系统是一个完整的6层流水线架构，用于将原始内容转换为结构化、智能化的数据，为Feed流呈现和用户交互提供优质的内容基础。

### 用户流程图
```
用户输入 → 内容获取 → Agent预处理 → Feed流呈现 → 用户交互 → Agent响应 → 结果渲染
```

### 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                     预处理流水线 (Pipeline)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  输入层 → 解析层 → 智能分段层 → AI初始化层 → 存储层 → 输出层     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ 技术架构

### 6层流水线详解

#### 1️⃣ 输入层 (Input Layer)
**目标**: 内容验证和规范化
- 长度验证 (最小50字符)
- 格式检测和清理
- 字符标准化处理
- 基础统计信息收集

**关键代码**:
```python
async def _input_layer(self, content: str, metadata: DocumentMetadata):
    if not content or len(content.strip()) < 50:
        raise ValueError("内容太短，至少需要50个字符")
    
    normalized_content = self._normalize_content(content)
    metadata.estimated_words = self._estimate_word_count(normalized_content)
    
    return normalized_content, stats
```

#### 2️⃣ 解析层 (Parsing Layer)
**目标**: 转换为统一Markdown格式
- HTML内容解析 (使用BeautifulSoup)
- PDF文档转换
- 纯文本结构化
- Markdown格式优化

**支持格式**:
- HTML → Markdown (使用markdownify)
- PDF → Markdown (文本提取)
- Plain Text → Markdown (智能结构识别)

#### 3️⃣ 智能分段层 (Segmentation Layer)
**目标**: 长文本智能分段
- 最小分段: 500字符
- 最大分段: 4000字符
- 重叠长度: 200字符

**分段策略**:
1. **章节分段**: 基于标题结构
2. **段落分段**: 基于段落边界
3. **语义分段**: 保持语义完整性
4. **长度分段**: 基于字符长度

#### 4️⃣ AI初始化层 (AI Initialization Layer)
**目标**: 生成摘要、要点、标签等
- 使用Jinja2模板系统
- 并行执行AI任务
- 集成现有prompt模板

**AI任务**:
```python
tasks = [
    self._generate_summary(template_context),      # summary.j2
    self._generate_key_points(template_context),   # key_points.j2  
    self._generate_labels(template_context),       # labels.j2
    self._analyze_content_properties(content, metadata)
]
```

#### 5️⃣ 存储层 (Storage Layer)
**目标**: 数据持久化
- 内容存储到数据库
- 分段数据存储
- 元数据索引建立
- AI分析结果存储

#### 6️⃣ 输出层 (Output Layer)  
**目标**: 格式化结果输出
- 结果数据整合
- 内容质量评分
- 阅读时间估算
- 标准化JSON输出

## 📊 数据模型

### DocumentMetadata
```python
@dataclass
class DocumentMetadata:
    title: Optional[str] = None
    author: Optional[str] = None
    source_url: Optional[str] = None
    content_type: ContentType = ContentType.DOCUMENT
    language: str = "en"
    domain: Optional[str] = None
    estimated_words: int = 0
```

### PreprocessingResult
```python
@dataclass  
class PreprocessingResult:
    content_id: str
    status: ProcessingStatus
    processed_at: datetime
    markdown_content: str
    segments: List[Dict[str, Any]]
    summary: Dict[str, Any]
    key_points: Dict[str, Any]
    labels: List[str]
    reading_time_minutes: int
    difficulty_level: str
    content_quality_score: float
    metadata: DocumentMetadata
    processing_stats: Dict[str, Any]
    errors: List[str] = None
```

## 🚀 API接口

### 核心端点

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/preprocessing/process` | 单个内容处理 |
| POST | `/api/preprocessing/batch-process` | 批量内容处理 |
| GET | `/api/preprocessing/status/{id}` | 查询处理状态 |
| GET | `/api/preprocessing/content/{id}/segments` | 获取分段信息 |
| POST | `/api/preprocessing/validate` | 内容格式验证 |

### 请求示例
```json
{
    "content": "这是要处理的内容...",
    "metadata": {
        "title": "文章标题",
        "author": "作者",
        "content_type": "article",
        "language": "zh"
    },
    "user_preferences": {
        "summary_style": "detailed",
        "target_length": 300,
        "focus_areas": ["技术", "应用"]
    }
}
```

### 响应示例
```json
{
    "success": true,
    "message": "内容预处理完成",
    "data": {
        "content_id": "content_12345",
        "status": "completed",
        "markdown_content": "...",
        "segments_count": 3,
        "summary": {...},
        "key_points": {...},
        "labels": [...],
        "reading_time_minutes": 8,
        "difficulty_level": "intermediate",
        "content_quality_score": 0.85
    }
}
```

## 🤖 AI模板集成

### 现有模板利用

#### summary.j2 模板
- **用途**: 生成内容摘要
- **输出**: 主要论点、关键论据、独特见解、价值评估
- **格式**: 结构化JSON响应

#### key_points.j2 模板  
- **用途**: 提取关键要点
- **输出**: 核心概念、可行性洞察、重要数据、新颖观点
- **格式**: 分类的要点列表

#### labels.j2 模板
- **用途**: 生成内容标签
- **输出**: 主题标签、概念标签、行业标签、技能标签
- **格式**: 多层级标签体系

### 模板上下文
```python
template_context = {
    "content": content,
    "document_metadata": asdict(metadata),
    "user_preferences": user_preferences or {},
    "content_type": metadata.content_type.value
}
```

## ⚡ 性能优化

### 异步并行处理
```python
# AI任务并行执行，提升处理速度
summary, key_points, labels, content_analysis = await asyncio.gather(*tasks)
```

### 智能分段优化
- 最小分段长度: 500字符 (保证内容完整性)
- 最大分段长度: 4000字符 (控制处理粒度)
- 重叠长度: 200字符 (保持语义连贯)

### 内容质量评估
```python
def _calculate_quality_score(self, content: str, ai_results: Dict, metadata: DocumentMetadata) -> float:
    score = 0.5  # 基础分数
    if metadata.estimated_words > 1000: score += 0.2
    if ai_results.get("summary"): score += 0.15
    if ai_results.get("key_points"): score += 0.15
    return min(1.0, score)
```

## 🛠️ 部署指南

### 环境要求
```bash
# Python依赖
pip install fastapi uvicorn pydantic sqlmodel
pip install beautifulsoup4 markdownify markdown
pip install jinja2 aiohttp

# 可选依赖
pip install jieba  # 中文分词 (用于更好的标签生成)
```

### 启动服务
```bash
# 开发环境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 生产环境  
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker部署
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📈 监控和日志

### 关键指标
- 处理吞吐量 (请求/秒)  
- 平均处理时间
- AI任务成功率
- 内容质量评分分布
- 错误率和类型统计

### 日志记录
```python
logger.info(f"预处理完成: {content_id}, 耗时: {processing_time:.2f}s")
logger.error(f"预处理失败: {content_id}, 错误: {str(e)}")
```

## 🔧 故障排除

### 常见问题

**1. 模块导入错误**
```bash
# 确保PYTHONPATH正确设置
export PYTHONPATH="${PYTHONPATH}:/path/to/nexus/backend"
```

**2. AI服务调用失败**  
- 检查ChatService配置
- 验证API密钥和endpoint
- 确认网络连接

**3. 内容解析错误**
- 验证输入内容格式
- 检查内容长度限制
- 确认字符编码

**4. 分段质量问题**
- 调整分段参数
- 选择合适的分段策略
- 检查内容结构

---

**文档版本**: v1.0  
**更新日期**: 2024-06-16  
**维护者**: 预处理系统开发组 