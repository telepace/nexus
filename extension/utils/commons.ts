import { Storage } from "@plasmohq/storage"
import type { WebHistory } from "./interfaces"

export const emptyArr: any[] = []
export const emptyObj: Record<string, any> = {}

export const getRenderedHtml = (): {
  renderedHtml: string;
  title: string;
  url: string;
  entryTime: number;
} => {
  return {
    renderedHtml: document.documentElement.outerHTML,
    title: document.title,
    url: window.location.href,
    entryTime: Date.now()
  }
}

interface TabHistoryItem {
  pageContentMarkdown?: string;
  url?: string;
  title?: string;
  entryTime: number;
  referrerUrl?: string;
  duration?: number;
}

interface LangChainDocument {
  pageContent: string;
  metadata: {
    BrowsingSessionId: number;
    VisitedWebPageURL: string;
    VisitedWebPageTitle: string;
    VisitedWebPageDateWithTimeInISOString: string;
    VisitedWebPageReferrerURL: string;
    VisitedWebPageVisitDurationInMilliseconds: number;
  };
}

export const webhistoryToLangChainDocument = (
  tabsessionId: number,
  tabHistory: TabHistoryItem[]
): LangChainDocument[] => {
  if (!tabHistory || tabHistory.length === 0) {
    return []
  }

  return tabHistory.map((item) => {
    // Create LangChain Document compatible format
    return {
      pageContent: item.pageContentMarkdown || "",
      metadata: {
        BrowsingSessionId: tabsessionId,
        VisitedWebPageURL: item.url || "",
        VisitedWebPageTitle: item.title || "No Title",
        VisitedWebPageDateWithTimeInISOString: new Date(item.entryTime).toISOString(),
        VisitedWebPageReferrerURL: item.referrerUrl || "",
        VisitedWebPageVisitDurationInMilliseconds: item.duration || 0
      }
    }
  })
}

export const initWebHistory = async (tabId: number): Promise<void> => {
  const storage = new Storage({ area: "local" })
  let urlQueueListObj: { urlQueueList: WebHistory[] } = await storage.get("urlQueueList")
  let timeQueueListObj: { timeQueueList: WebHistory[] } = await storage.get("timeQueueList")

  if (!urlQueueListObj || !urlQueueListObj.urlQueueList) {
    await storage.set("urlQueueList", { urlQueueList: [] })
    urlQueueListObj = { urlQueueList: [] }
  }

  if (!timeQueueListObj || !timeQueueListObj.timeQueueList) {
    await storage.set("timeQueueList", { timeQueueList: [] })
    timeQueueListObj = { timeQueueList: [] }
  }

  // check if tab already exists in history
  const tabExistsInUrlQueue = urlQueueListObj.urlQueueList.some(
    (item) => item.tabsessionId === tabId
  )
  const tabExistsInTimeQueue = timeQueueListObj.timeQueueList.some(
    (item) => item.tabsessionId === tabId
  )

  if (!tabExistsInUrlQueue) {
    urlQueueListObj.urlQueueList.push({
      tabsessionId: tabId,
      urlQueue: []
    })
    await storage.set("urlQueueList", urlQueueListObj)
  }

  if (!tabExistsInTimeQueue) {
    timeQueueListObj.timeQueueList.push({
      tabsessionId: tabId,
      timeQueue: []
    })
    await storage.set("timeQueueList", timeQueueListObj)
  }
}

export const initQueues = async (tabId: number): Promise<void> => {
  const storage = new Storage({ area: "local" })
  const urlQueueListObj: { urlQueueList: WebHistory[] } = await storage.get("urlQueueList")
  const timeQueueListObj: { timeQueueList: WebHistory[] } = await storage.get("timeQueueList")

  if (urlQueueListObj && timeQueueListObj) {
    const tabIndexInUrlQueue = urlQueueListObj.urlQueueList.findIndex(
      (item) => item.tabsessionId === tabId
    )
    const tabIndexInTimeQueue = timeQueueListObj.timeQueueList.findIndex(
      (item) => item.tabsessionId === tabId
    )

    if (tabIndexInUrlQueue !== -1) {
      urlQueueListObj.urlQueueList[tabIndexInUrlQueue].urlQueue = []
      await storage.set("urlQueueList", urlQueueListObj)
    }

    if (tabIndexInTimeQueue !== -1) {
      timeQueueListObj.timeQueueList[tabIndexInTimeQueue].timeQueue = []
      await storage.set("timeQueueList", timeQueueListObj)
    }
  }
}

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function extractMainContent(htmlContent: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Try to find content in a prioritized manner
    // 1. Look for main content containers
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '.post',
      '.article'
    ];
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        return element.innerHTML;
      }
    }
    
    // 2. Remove non-content elements
    const elementsToRemove = [
      'header',
      'footer',
      'nav',
      'aside',
      '.sidebar',
      '.ads',
      '.navigation',
      'style',
      'script'
    ];
    
    elementsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // 3. Return the cleaned body content
    return doc.body.innerHTML;
  } catch (error) {
    console.error('提取内容失败:', error);
    return htmlContent; // 返回原始HTML作为降级处理
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const month = day * 30;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`;
  } else {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 