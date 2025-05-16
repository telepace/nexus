import { Storage } from "@plasmohq/storage"
import type { WebHistory } from "./interfaces"

export const emptyArr: any[] = []

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

export const webhistoryToLangChainDocument = (
  tabsessionId: number,
  tabHistory: any[]
): any[] => {
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
        VisitedWebPageReffererURL: item.reffererUrl || "",
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

export const extractMainContent = (html: string): string => {
  try {
    // Create a DOM parser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Remove unwanted elements
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer', 
      'aside', 'iframe', 'noscript', 'svg', 'form'
    ]
    
    elementsToRemove.forEach(tag => {
      const elements = doc.getElementsByTagName(tag)
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode?.removeChild(elements[i])
      }
    })
    
    // Try to find main content area
    const contentSelectors = [
      'main', 
      'article',
      'div[role="main"]',
      'div.content', 
      'div.main-content',
      '#content',
      '#main'
    ]
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element && element.textContent && element.textContent.trim().length > 200) {
        return element.textContent.trim()
      }
    }
    
    // Fallback to body content
    return doc.body.textContent?.trim() || 'No content extracted'
  } catch (error) {
    console.error('Error extracting content:', error)
    return 'Error extracting content'
  }
} 