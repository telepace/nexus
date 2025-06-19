# Jina AI 集成说明

## 概述

Nexus 现在支持使用 Jina AI 的 Reader API 来处理 URL 内容。Jina AI 提供了高质量的网页内容提取和 Markdown 转换服务，并支持智能移除页面中的导航、广告等无关元素。

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

Jina Processor 会向 `https://r.jina.ai/` 发送 GET 请求，并自动移除页面中的无关元素：

```bash
curl "https://r.jina.ai/https://example.com" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Remove-Selector: header, nav, footer, .sidebar, .navigation"
```

### 智能内容过滤

通过 `X-Remove-Selector` 头部，系统会自动移除以下页面元素：

- **导航元素**: `header`, `nav`, `.navbar`, `.navigation`, `.menu`
- **页脚信息**: `footer`, `.site-footer`, `.footer-wrapper`
- **侧边栏**: `.sidebar`, `.doc-sidebar`
- **辅助信息**: `.breadcrumb`, `.pagination`, `.toc`, `.table-of-contents`
- **版权和选择器**: `.copyright`, `.version-selector`, `.language-selector`
- **广告和推广**: `.ads`, `.advertisement`, `.banner`, `.promotion`
- **社交和评论**: `.social-share`, `.comments`, `.related-posts`, `.recommended`
- **弹窗和覆盖层**: `.popup`, `.modal`, `.overlay`

### 返回格式

Jina AI 直接返回清洁的 Markdown 格式内容，已移除所有无关元素。

## 功能特性

### 1. 智能内容提取

- 自动识别和提取页面主要内容
- 移除导航、广告、侧边栏等干扰元素
- 保留文章结构和格式

### 2. 自动标题提取

- 从 Markdown 内容中自动提取 H1 标题
- 如果没有找到标题，使用 URL 的域名作为标题

### 3. 增强的元数据记录

处理结果包含以下元数据：

```json
{
  "source_url": "https://example.com",
  "processed_at": "2024-01-01T12:00:00Z",
  "processor": "jina",
  "content_type": "url",
  "selectors_removed": true,
  "jina_api_version": "r.jina.ai"
}
```

### 4. 存储集成

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
- 智能内容过滤提高内容质量

## 最佳实践

### 1. API Key 安全

- 不要在代码中硬编码 API Key
- 使用环境变量管理敏感信息
- 定期轮换 API Key

### 2. 内容质量优化

- 利用 X-Remove-Selector 获得更清洁的内容
- 根据网站特点调整选择器配置
- 监控提取内容的质量

### 3. 错误处理

- 实现适当的重试机制
- 监控 API 调用失败率
- 设置合理的超时时间

### 4. 成本控制

- 监控 API 使用量
- 考虑缓存策略减少重复调用
- 评估 Jina vs MarkItDown 的成本效益

## 故障排除

### 检查配置

```bash
# 检查环境变量
echo $JINA_API_KEY

# 测试 API 连接（新的 GET 方式）
curl "https://r.jina.ai/https://example.com" \
  -H "Authorization: Bearer $JINA_API_KEY" \
  -H "X-Remove-Selector: header, nav, footer, .sidebar, .navigation"
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
- 已集成智能内容过滤功能
- 定期检查 API 更新和变更
- 测试新版本的兼容性

### 配置更新

如需更新配置，修改 `.env` 文件后重启服务：

```bash
docker compose restart backend
```

### 自定义选择器

如需为特定网站自定义移除的元素选择器，可以在代码中修改 `X-Remove-Selector` 头部的值。

## 优势对比

### Jina AI vs 传统爬虫

| 特性 | Jina AI | 传统爬虫 |
|------|---------|----------|
| 内容质量 | 智能提取，去除噪音 | 需要手动清理 |
| 速度 | 优化的云服务 | 依赖本地资源 |
| 维护成本 | 低，API 服务 | 高，需要维护爬虫规则 |
| 反爬虫处理 | 内置处理 | 需要自行解决 |
| 内容格式 | 统一 Markdown | 需要格式转换 |

### 使用建议

- 对于重要内容或需要高质量提取的场景，优先使用 Jina AI
- 对于内部文档或简单页面，可以使用 MarkItDown 作为备选
- 定期监控两种方案的效果，根据实际情况调整策略 