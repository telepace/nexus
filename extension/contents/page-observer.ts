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

  constructor() {
    this.setupMessageListener();
    this.setupContentObserver();
    console.log('Nexus Page Observer initialized - Non-invasive mode');
  }

  // 设置消息监听器
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('nexus-navigation'));
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
        
        // 通知background脚本页面内容已更新
        chrome.runtime.sendMessage({
          type: 'PAGE_CONTENT_UPDATED',
          data: pageData
        }).catch(() => {
          // 忽略连接错误（background可能未运行）
        });
      }
    } catch (error) {
      console.error('Content extraction failed:', error);
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
        const text = contentEl.textContent || '';
        if (text.length > 200) {
          return this.cleanText(text);
        }
      }
    }
    
    // 如果没找到，使用整个body
    return this.cleanText(element.textContent || '');
  }

  // 清理文本
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // 合并空白字符
      .replace(/\n\s*\n/g, '\n')      // 移除多余换行
      .trim()
      .substring(0, 50000);           // 限制长度
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
  private handleSavePage(sendResponse: (response: any) => void) {
    try {
      const pageData = this.extractPageData();
      
      // 通知background处理保存
      chrome.runtime.sendMessage({
        type: 'PROCESS_SAVE_PAGE',
        data: pageData
      }).then(response => {
        sendResponse(response);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  // 处理摘要请求
  private handleSummarizePage(sendResponse: (response: any) => void) {
    try {
      const pageData = this.extractPageData();
      
      // 通知background处理摘要
      chrome.runtime.sendMessage({
        type: 'PROCESS_SUMMARIZE_PAGE',
        data: pageData
      }).then(response => {
        sendResponse(response);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
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
}

// 初始化页面观察器
new PageObserver(); 