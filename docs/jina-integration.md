# Jina AI 集成说明

## 概述

Nexus 现在支持使用 Jina AI 的 Reader API 来处理 URL 内容。Jina AI 提供了高质量的网页内容提取和 Markdown 转换服务。

## 配置

### 1. 获取 Jina API Key

1. 访问 [Jina AI](https://jina.ai/) 官网
2. 注册账户并获取 API Key
3. 将 API Key 添加到环境变量中

### 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# Jina AI Configuration
JINA_API_KEY=jina_your_api_key_here
```

## 工作原理

### 处理优先级

当配置了 `JINA_API_KEY` 时，系统会按以下优先级处理 URL：

1. **Jina Processor** - 如果配置了 API Key，优先使用 Jina AI 处理 URL
2. **MarkItDown Processor** - 作为备用方案，使用 Microsoft MarkItDown 处理

### API 调用

Jina Processor 会向 `https://r.jina.ai/` 发送 POST 请求：

```bash
curl "https://r.jina.ai/" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 返回格式

Jina AI 直接返回 Markdown 格式的内容，无需额外转换。

## 功能特性

### 1. 自动标题提取

- 从 Markdown 内容中自动提取 H1 标题
- 如果没有找到标题，使用 URL 的域名作为标题

### 2. 元数据记录

处理结果包含以下元数据：

```json
{
  "source_url": "https://example.com",
  "processed_at": "2024-01-01T12:00:00Z",
  "processor": "jina",
  "content_type": "url"
}
```

### 3. 存储集成

- 自动将处理后的 Markdown 内容存储到 R2/S3
- 创建相应的 ContentAsset 记录
- 生成内容分段用于高效渲染

## 测试

### 运行集成测试

```bash
cd backend
python test_jina_integration.py
```

### 运行单元测试

```bash
cd backend
pytest app/tests/test_content_processors.py::TestJinaProcessor -v
```

## 错误处理

### 常见错误

1. **API Key 未配置**
   ```
   错误: Jina API key not configured
   解决: 在 .env 文件中设置 JINA_API_KEY
   ```

2. **API 调用失败**
   ```
   错误: Jina API request failed: 401 Unauthorized
   解决: 检查 API Key 是否正确
   ```

3. **网络超时**
   ```
   错误: Jina API request failed: timeout
   解决: 检查网络连接，Jina API 调用超时时间为 60 秒
   ```

### 降级处理

如果 Jina API 调用失败，系统会自动降级到 MarkItDown 处理器，确保 URL 处理功能的可用性。

## 监控和日志

### 日志输出

处理过程中会输出详细的日志信息：

```
🔄 正在上传Markdown文件到R2: processed/markdown/{content_id}.md
✅ Markdown文件上传成功: processed/markdown/{content_id}.md
🔄 正在创建内容分段...
✅ 创建了 5 个内容分段
```

### 性能监控

- Jina API 调用时间通常在 5-30 秒
- 处理结果会缓存在数据库中
- R2 存储提供快速访问

## 最佳实践

### 1. API Key 安全

- 不要在代码中硬编码 API Key
- 使用环境变量管理敏感信息
- 定期轮换 API Key

### 2. 错误处理

- 实现适当的重试机制
- 监控 API 调用失败率
- 设置合理的超时时间

### 3. 成本控制

- 监控 API 使用量
- 考虑缓存策略减少重复调用
- 评估 Jina vs MarkItDown 的成本效益

## 故障排除

### 检查配置

```bash
# 检查环境变量
echo $JINA_API_KEY

# 测试 API 连接
curl "https://r.jina.ai/" \
  -H "Authorization: Bearer $JINA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 查看日志

```bash
# 查看后端日志
docker compose logs backend

# 查看处理状态
# 在数据库中检查 content_items 表的 processing_status 字段
```

## 更新和维护

### 版本兼容性

- 当前支持 Jina AI Reader API v1
- 定期检查 API 更新和变更
- 测试新版本的兼容性

### 配置更新

如需更新配置，修改 `.env` 文件后重启服务：

```bash
docker compose restart backend
``` 