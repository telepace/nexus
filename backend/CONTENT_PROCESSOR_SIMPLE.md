# Nexus 内容处理器 - 简单配置

## 🎯 一个配置搞定

现在只需要一个配置项就能选择内容处理器：

```env
CONTENT_PROCESSOR=readability
```

## 📋 可选的处理器

| 处理器 | 类型 | 质量 | 需要API Key | 说明 |
|--------|------|------|-------------|------|
| `jina` | 商业API | 最高 | ✅ 需要 | 专业内容提取服务 |
| `firecrawl` | 商业API | 高 | ✅ 需要 | 高质量网页抓取 |
| `scrapingbee` | 商业API | 中等 | ✅ 需要 | 支持JS渲染 |
| `readability` | 免费库 | 基础 | ❌ 不需要 | BeautifulSoup提取 |
| `markitdown` | 免费库 | 兜底 | ❌ 不需要 | Microsoft开源工具 |

## 🚀 快速配置

### 方法1: 使用配置脚本

```bash
# 设置为免费处理器
python backend/scripts/quick_config.py --processor readability

# 设置为Jina（需要API Key）
python backend/scripts/quick_config.py --processor jina

# 查看当前配置
python backend/scripts/quick_config.py --show-current

# 测试当前配置
python backend/scripts/quick_config.py --test
```

### 方法2: 直接修改.env文件

在根目录的 `.env` 文件中添加或修改：

```env
# 选择处理器
CONTENT_PROCESSOR=readability

# 如果使用API处理器，需要配置对应的API Key
JINA_API_KEY=your_jina_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
SCRAPINGBEE_API_KEY=your_scrapingbee_api_key_here
```

## 🔄 智能回退

如果选择的处理器不可用（比如没有API Key），系统会自动回退到免费方案：

1. 首选处理器不可用
2. 自动尝试 `readability` 处理器
3. 如果还不可用，最后使用 `markitdown` 处理器

## 📊 获取API Key

### Jina AI
- 网站: https://cloud.jina.ai/
- 充值: https://cloud.jina.ai/billing
- 质量: 最高，专业内容提取

### Firecrawl
- 网站: https://firecrawl.dev/
- 质量: 高，支持复杂网页

### ScrapingBee
- 网站: https://www.scrapingbee.com/
- 质量: 中等，支持JS渲染

## 🛠️ 故障排除

### 常见问题

1. **处理器不可用**
   - 检查API Key是否正确配置
   - 检查账户余额是否充足
   - 使用免费处理器作为备选

2. **内容处理失败**
   - 检查网络连接
   - 确认目标URL可访问
   - 查看日志获取详细错误信息

3. **配置不生效**
   - 确认修改的是根目录的 `.env` 文件
   - 重启应用以加载新配置
   - 使用测试命令验证配置

### 测试配置

```bash
# 从根目录运行
python backend/scripts/quick_config.py --test
```

## 📝 配置文件位置

- **正确位置**: `/path/to/nexus/.env` (根目录)
- **错误位置**: `/path/to/nexus/backend/.env` (已删除)

确保所有配置都在根目录的 `.env` 文件中，方便统一维护。 