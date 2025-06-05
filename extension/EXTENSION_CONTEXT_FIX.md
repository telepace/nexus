# Extension Context Invalidated 错误修复方案

## 问题描述

在使用 Nexus 浏览器扩展时，可能会遇到以下错误：

```
Content extraction failed: Error: Extension context invalidated.
```

这个错误通常发生在以下情况：

1. **扩展重新加载** - 开发过程中扩展被重新加载
2. **Service Worker 休眠** - Chrome 让不活跃的 service worker 进入休眠状态
3. **长时间运行** - 页面长期打开，扩展上下文被浏览器清理
4. **消息传递失败** - 异步消息处理时上下文丢失

## 解决方案

### 1. 连接状态监控

我们在 `page-observer.ts` 中添加了连接状态监控机制：

```typescript
// 每10秒检查一次扩展连接状态
private connectionCheckInterval: NodeJS.Timeout | null = null;

private setupConnectionMonitor() {
  this.connectionCheckInterval = setInterval(() => {
    this.checkExtensionConnection();
  }, 10000);
}
```

### 2. 心跳检测

通过 PING/PONG 机制检测扩展是否活跃：

```typescript
// 内容脚本发送 PING
chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
  // 检查响应
});

// Background 脚本响应 PONG
if (request.type === 'PING') {
  sendResponse({ success: true, pong: true, timestamp: Date.now() });
  return false;
}
```

### 3. 安全消息发送

实现了带重试机制的安全消息发送：

```typescript
private async sendMessageSafely(message: any, maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 先检查连接状态
      const isConnected = await this.checkExtensionConnection();
      if (!isConnected) {
        throw new Error('Extension context invalidated');
      }

      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            this.isExtensionConnected = false;
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('All message sending attempts failed');
}
```

### 4. 错误处理增强

在所有消息处理中添加了统一的错误捕获：

```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ... 各种消息处理
  
  if (request.type === 'PROCESS_SAVE_PAGE') {
    handleSavePageRequest(request.data).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // ... 其他处理
});
```

## 使用方法

### 开发环境测试

运行连接测试脚本：

```javascript
// 在浏览器控制台中执行
// 加载 test-connection.js 来测试连接稳定性
```

### 生产环境监控

扩展会自动：

1. 每10秒检查连接状态
2. 在消息发送失败时自动重试（最多3次）
3. 提供友好的错误消息而不是崩溃
4. 在连接恢复时自动重新连接

## 预防措施

### 1. 开发时

- 尽量减少扩展重新加载的频率
- 使用 `--disable-web-security` 标志进行开发（仅开发环境）
- 定期清理浏览器缓存

### 2. 生产环境

- 确保扩展代码没有内存泄漏
- 合理设置消息超时时间
- 监控扩展性能指标

## 故障排除

如果仍然遇到连接问题：

1. **检查扩展权限** - 确保在 manifest.json 中有正确的权限
2. **重新安装扩展** - 完全卸载后重新安装
3. **清除浏览器数据** - 清除与扩展相关的存储数据
4. **检查 CSP 策略** - 确保内容安全策略允许必要的连接

## 监控和调试

在开发者工具中查看：

```javascript
// 检查扩展状态
chrome.runtime.sendMessage({ type: 'PING' }, console.log);

// 查看错误日志
console.log('Extension errors:', chrome.runtime.lastError);

// 检查连接状态
chrome.management.get(chrome.runtime.id, console.log);
```

## 相关文件

- `extension/contents/page-observer.ts` - 主要修复代码
- `extension/background.ts` - 消息处理增强
- `extension/test-connection.js` - 连接测试脚本
- `extension/package.json` - 扩展配置

## 总结

通过实施这些修复措施，"Extension context invalidated" 错误应该得到显著改善。系统现在具有：

- 自动连接检测和恢复
- 消息发送重试机制
- 更好的错误处理和用户反馈
- 全面的调试和监控工具

如果问题仍然存在，请检查浏览器版本兼容性和扩展权限配置。 