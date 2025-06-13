import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 页面数据接口
interface PageData {
  title: string;
  url: string;
  content: string;
  metadata: {
    timestamp: number;
    readingTime: number;
    wordCount: number;
    language: string;
    contentType: 'article' | 'webpage' | 'social' | 'unknown';
  };
}

// 完全无侵入的页面观察器
class PageObserver {
  private lastExtractedContent: string = '';
  private extractionTimeout: NodeJS.Timeout | null = null;
  private isExtensionConnected: boolean = true;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMessageListener();
    this.setupContentObserver();
    this.setupConnectionMonitor();
    console.log('Nexus Page Observer initialized - Non-invasive mode');
  }

  // 设置连接监控
  private setupConnectionMonitor() {
    // 每10秒检查一次扩展连接状态
    this.connectionCheckInterval = setInterval(() => {
      this.checkExtensionConnection();
    }, 10000);

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
      }
      if (this.extractionTimeout) {
        clearTimeout(this.extractionTimeout);
      }
    });
  }

  // 检查扩展连接状态
  private async checkExtensionConnection(): Promise<boolean> {
    try {
      // 尝试发送一个简单的ping消息
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      if (!this.isExtensionConnected) {
        console.log('Extension connection restored');
        this.isExtensionConnected = true;
      }
      return true;
    } catch (error) {
      if (this.isExtensionConnected) {
        console.log('Extension connection lost:', error);
        this.isExtensionConnected = false;
      }
      return false;
    }
  }

  // 安全的消息发送方法（带重试机制）
  private async sendMessageSafely(message: any, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 先检查扩展连接状态
        const isConnected = await this.checkExtensionConnection();
        if (!isConnected && attempt < maxRetries) {
          console.log(`Message sending attempt ${attempt}/${maxRetries} failed: Extension not connected`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
          continue;
        }

        return await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Runtime error'));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        console.log(`Message sending attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to notify background: ${error.message}`);
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // 设置消息监听器
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 处理ping消息
      if (message.type === 'PING') {
        sendResponse({ success: true, pong: true });
        return false;
      }

      switch (message.type) {
        case 'EXTRACT_CONTENT':
          this.handleExtractContent(sendResponse);
          return true; // 保持消息通道开放

        case 'SAVE_PAGE':
          this.handleSavePage(sendResponse);
          return true;

        case 'SUMMARIZE_PAGE':
          this.handleSummarizePage(sendResponse);
          return true;

        case 'GET_PAGE_STATUS':
          this.handleGetPageStatus(sendResponse);
          return true;

        case 'HISTORY_STATE_CHANGED':
          this.handleHistoryStateChanged(message);
          return false;

        default:
          return false;
      }
    });
  }

  // 设置内容观察器（用于检测页面变化）
  private setupContentObserver() {
    // 监听页面加载完成
    if (document.readyState === 'complete') {
      this.scheduleContentExtraction();
    } else {
      window.addEventListener('load', () => {
        this.scheduleContentExtraction();
      });
    }

    // 监听DOM变化（适用于SPA）
    const observer = new MutationObserver((mutations) => {
      // 只在有实质性变化时重新提取
      const hasSignificantChange = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE && 
          (node as Element).tagName !== 'SCRIPT'
        )
      );

      if (hasSignificantChange) {
        this.scheduleContentExtraction();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 监听历史状态变化（SPA导航）
    window.addEventListener('popstate', () => {
      this.scheduleContentExtraction();
    });

    // 监听pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('nexus-navigation'));
      // 简单通知background script页面状态已更新
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'HISTORY_STATE_UPDATED',
          data: {
            url: window.location.href,
            action: 'pushState'
          }
        }).catch((error) => {
          // 静默处理连接错误
          console.log('[PageObserver] History state update message failed (pushState):', error.message);
        });
      }, 100); // 小延迟确保页面状态稳定
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('nexus-navigation'));
      // 简单通知background script页面状态已更新
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'HISTORY_STATE_UPDATED',
          data: {
            url: window.location.href,
            action: 'replaceState'
          }
        }).catch((error) => {
          // 静默处理连接错误
          console.log('[PageObserver] History state update message failed (replaceState):', error.message);
        });
      }, 100); // 小延迟确保页面状态稳定
    };

    window.addEventListener('nexus-navigation', () => {
      this.scheduleContentExtraction();
    });
  }

  // 延迟内容提取（防抖）
  private scheduleContentExtraction() {
    if (this.extractionTimeout) {
      clearTimeout(this.extractionTimeout);
    }

    this.extractionTimeout = setTimeout(() => {
      this.extractAndNotify();
    }, 1500); // 1.5秒延迟确保内容稳定
  }

  // 提取并通知background
  private async extractAndNotify() {
    try {
      const pageData = this.extractPageData();
      
      // 只在内容有显著变化时才通知
      if (this.hasSignificantContentChange(pageData.content)) {
        this.lastExtractedContent = pageData.content;
        
        // 使用安全的消息发送方法
        try {
          await this.sendMessageSafely({
            type: 'PAGE_CONTENT_UPDATED',
            data: pageData
          });
          console.log('[PageObserver] Successfully notified background of content update');
        } catch (error) {
          // 静默处理连接错误，避免在控制台产生过多噪音
          if (error.message.includes('Extension context invalidated') || 
              error.message.includes('message port closed') ||
              error.message.includes('runtime.lastError')) {
            console.log('[PageObserver] Extension connection lost, this is normal during page navigation');
          } else {
            console.warn('[PageObserver] Failed to notify background:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('[PageObserver] Content extraction failed:', error);
    }
  }

  // 检查内容是否有显著变化
  private hasSignificantContentChange(newContent: string): boolean {
    if (!this.lastExtractedContent) return true;
    
    const similarity = this.calculateSimilarity(this.lastExtractedContent, newContent);
    return similarity < 0.8; // 80%相似度阈值
  }

  // 计算文本相似度（简单版本）
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // 完全只读的内容提取
  private extractPageData(): PageData {
    // 克隆body以避免任何DOM修改
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    
    // 在克隆上进行清理
    this.cleanClonedContent(bodyClone);
    
    const content = this.extractMainContent(bodyClone);
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 假设200字/分钟
    
    return {
      title: document.title,
      url: window.location.href,
      content,
      metadata: {
        timestamp: Date.now(),
        readingTime,
        wordCount,
        language: this.detectLanguage(content),
        contentType: this.detectContentType()
      }
    };
  }

  // 清理克隆的内容
  private cleanClonedContent(element: HTMLElement) {
    // 移除脚本、样式、注释等
    const unwantedElements = element.querySelectorAll(
      'script, style, noscript, iframe, object, embed, audio, video, canvas, svg'
    );
    unwantedElements.forEach(el => el.remove());

    // 移除隐藏元素
    const hiddenElements = element.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
    hiddenElements.forEach(el => el.remove());
  }

  // 提取主要内容
  private extractMainContent(element: HTMLElement): string {
    const contentSelectors = [
      'main', 'article', '[role="main"]',
      '.content', '.post-content', '.entry-content', '.article-content',
      '#content', '#main', '.main-content'
    ];
    
    // 尝试找到主要内容区域
    for (const selector of contentSelectors) {
      const contentEl = element.querySelector(selector);
      if (contentEl) {
        const markdownContent = this.convertToMarkdown(contentEl);
        if (markdownContent.length > 200) {
          return markdownContent;
        }
      }
    }
    
    // 如果没找到，使用整个body
    return this.convertToMarkdown(element);
  }

  // 将HTML转换为Markdown格式
  private convertToMarkdown(element: HTMLElement): string {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      null
    );

    let markdown = '';
    let node: Node | null;
    const headingStack: number[] = [];
    
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          markdown += text + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        const tagName = elem.tagName.toLowerCase();
        
        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const level = parseInt(tagName.charAt(1));
            markdown += '\n' + '#'.repeat(level) + ' ' + elem.textContent?.trim() + '\n\n';
            break;
            
          case 'p':
            markdown += '\n' + elem.textContent?.trim() + '\n\n';
            break;
            
          case 'br':
            markdown += '\n';
            break;
            
          case 'strong':
          case 'b':
            markdown += '**' + elem.textContent?.trim() + '**';
            break;
            
          case 'em':
          case 'i':
            markdown += '*' + elem.textContent?.trim() + '*';
            break;
            
          case 'code':
            markdown += '`' + elem.textContent?.trim() + '`';
            break;
            
          case 'pre':
            markdown += '\n```\n' + elem.textContent?.trim() + '\n```\n\n';
            break;
            
          case 'blockquote':
            const quoteText = elem.textContent?.trim().split('\n').map(line => '> ' + line).join('\n');
            markdown += '\n' + quoteText + '\n\n';
            break;
            
          case 'ul':
          case 'ol':
            // 列表处理在li中完成
            break;
            
          case 'li':
            const isOrdered = elem.parentElement?.tagName.toLowerCase() === 'ol';
            const marker = isOrdered ? '1. ' : '- ';
            markdown += marker + elem.textContent?.trim() + '\n';
            break;
            
          case 'a':
            const href = elem.getAttribute('href');
            const linkText = elem.textContent?.trim();
            if (href && linkText) {
              markdown += `[${linkText}](${href})`;
            }
            break;
            
          case 'img':
            const src = elem.getAttribute('src');
            const alt = elem.getAttribute('alt') || '图片';
            if (src) {
              markdown += `![${alt}](${src})`;
            }
            break;
        }
      }
    }
    
    return this.cleanMarkdown(markdown);
  }

  // 清理Markdown文本
  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n')        // 移除多余的空行
      .replace(/\s+$/gm, '')            // 移除行尾空格
      .replace(/^\s+/gm, '')            // 移除行首空格
      .trim()
      .substring(0, 50000);             // 限制长度
  }

  // 检测语言（简单版本）
  private detectLanguage(text: string): string {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;
    
    if (chineseChars / totalChars > 0.3) return 'zh';
    return 'en';
  }

  // 检测内容类型
  private detectContentType(): 'article' | 'webpage' | 'social' | 'unknown' {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    // 社交媒体
    if (/twitter|facebook|instagram|linkedin|weibo|zhihu/.test(hostname)) {
      return 'social';
    }
    
    // 文章标识
    if (document.querySelector('article') || 
        /\/article\/|\/post\/|\/blog\//.test(url) ||
        document.querySelector('[itemtype*="Article"]')) {
      return 'article';
    }
    
    return 'webpage';
  }

  // 处理内容提取请求
  private handleExtractContent(sendResponse: (response: any) => void) {
    try {
      const pageData = this.extractPageData();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  // 处理保存页面请求
  private async handleSavePage(sendResponse: (response: any) => void) {
    try {
      const pageData = this.extractPageData();
      
      // 使用安全的消息发送方法
      const response = await this.sendMessageSafely({
        type: 'PROCESS_SAVE_PAGE',
        data: pageData
      });
      
      sendResponse(response);
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message || 'Extension connection error'
      });
    }
  }

  // 处理摘要请求
  private async handleSummarizePage(sendResponse: (response: any) => void) {
    try {
      const pageData = this.extractPageData();
      
      // 使用安全的消息发送方法
      const response = await this.sendMessageSafely({
        type: 'PROCESS_SUMMARIZE_PAGE',
        data: pageData
      });
      
      sendResponse(response);
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message || 'Extension connection error'
      });
    }
  }

  // 处理页面状态请求
  private handleGetPageStatus(sendResponse: (response: any) => void) {
    const pageData = this.extractPageData();
    sendResponse({
      success: true,
      data: {
        title: pageData.title,
        url: pageData.url,
        metadata: pageData.metadata,
        hasContent: pageData.content.length > 100
      }
    });
  }

  // 处理历史状态变更通知
  private handleHistoryStateChanged(message: any) {
    console.log('[PageObserver] History state changed:', message.url);
    
    // 如果URL发生了变化，重新提取内容
    if (message.url && message.url !== window.location.href) {
      this.scheduleContentExtraction();
    }
  }
}

// 初始化页面观察器
new PageObserver(); 