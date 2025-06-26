# 扩展流式API文档

## 概述

为浏览器插件提供流式摘要和要点生成服务，支持实时流式响应，优化用户体验。

## API 端点

### 1. 流式摘要生成

**端点**: `POST /api/v1/extension/summary/stream`

**描述**: 为浏览器插件提供流式摘要生成服务

**请求体**:
```json
{
  "text": "需要摘要的文本内容",
  "lang": "auto|zh|en",
  "max_tokens": 1024
}
```

**响应**: Server-Sent Events (SSE) 格式

```
data: {"delta": "**核心观点**：", "done": false}
data: {"delta": "本文主要讨论了...", "done": false}
data: {"done": true}
```

### 2. 流式要点提取

**端点**: `POST /api/v1/extension/keypoints/stream`

**描述**: 为浏览器插件提供流式要点提取服务

**请求体**:
```json
{
  "text": "需要提取要点的文本内容",
  "lang": "auto|zh|en", 
  "max_tokens": 1024
}
```

**响应**: Server-Sent Events (SSE) 格式

```
data: {"delta": "## 关键要点\n\n", "done": false}
data: {"delta": "- **要点1**: 核心概念...", "done": false}
data: {"done": true}
```

### 3. 并行分析

**端点**: `POST /api/v1/extension/analyze`

**描述**: 同时生成摘要和要点的优化接口

**请求体**:
```json
{
  "text": "需要分析的文本内容",
  "lang": "auto|zh|en",
  "max_tokens": 1024
}
```

**响应**: Server-Sent Events (SSE) 格式，包含 source 字段区分内容类型

```
data: {"delta": "**核心观点**：", "done": false, "source": "summary"}
data: {"delta": "## 关键要点\n\n", "done": false, "source": "keypoints"}
```

## 认证

所有接口都需要Bearer Token认证：

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 错误处理

### 认证错误 (401)
```json
{
  "detail": "Could not validate credentials"
}
```

### 验证错误 (422)
```json
{
  "detail": [
    {
      "loc": ["body", "text"],
      "msg": "文本内容不能为空",
      "type": "value_error"
    }
  ]
}
```

### 服务错误 (500)
```json
{
  "detail": "Failed to generate summary: ..."
}
```

## 客户端使用示例

### JavaScript/TypeScript

```typescript
// 使用 EventSource 接收流式数据
const streamApi = new EventSource('/api/v1/extension/summary/stream', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Your content here',
    lang: 'auto'
  })
});

streamApi.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.delta) {
    // 渲染增量内容
    appendContent(data.delta);
  }
  if (data.done) {
    // 流式完成
    streamApi.close();
  }
};
```

### 扩展端组件

```typescript
import { StreamContent } from './components/StreamContent';

function ExtensionPopup() {
  const [pageContent, setPageContent] = useState('');
  
  return (
    <div>
      <StreamContent 
        text={pageContent}
        autoStart={true}
        onComplete={(summary, keypoints) => {
          console.log('Generated:', { summary, keypoints });
        }}
      />
    </div>
  );
}
```

## 特性

1. **流式响应**: 实时逐步返回生成内容，提升用户体验
2. **语言检测**: 自动检测文本语言或手动指定
3. **并行处理**: 可同时获取摘要和要点
4. **错误处理**: 完善的错误处理和状态管理
5. **灵活配置**: 可调整最大token数等参数

## 部署与配置

### 后端服务

确保以下服务正确配置：

1. **LLM服务**: 配置 `LITELLM_PROXY_URL` 等相关环境变量
2. **认证服务**: 确保JWT认证正常工作
3. **数据库**: PostgreSQL连接正常

### 扩展端

1. 在扩展的 `manifest.json` 中添加API权限
2. 配置正确的API基础URL
3. 实现用户认证流程

## 性能优化

1. **并发控制**: 限制同时进行的请求数量
2. **缓存策略**: 对相同内容的结果进行缓存
3. **流式缓冲**: 合理控制流式响应的块大小
4. **超时设置**: 设置合理的请求超时时间

## 监控与日志

- 请求响应时间
- 错误率统计
- 用户使用量
- LLM调用成功率 