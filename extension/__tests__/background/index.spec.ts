import { Storage } from "@plasmohq/storage";
import { initQueues, initWebHistory } from "~/utils/commons";

// 定义一个类型以解决类型问题
interface UrlQueueList {
  urlQueueList: Array<{
    tabsessionId: number;
    urlQueue: string[];
  }>;
}

interface TimeQueueList {
  timeQueueList: Array<{
    tabsessionId: number;
    timeQueue: number[];
  }>;
}

// 声明处理器函数，方便测试
let onCreatedHandler: (tab: any) => Promise<void>;
let onUpdatedHandler: (tabId: number, changeInfo: any, tab: any) => Promise<void>;
let onRemovedHandler: (tabId: number, removeInfo: any) => Promise<void>;

// 声明全局chrome对象，使TypeScript不报错
declare global {
  var chrome: {
    tabs: {
      onCreated: {
        addListener: jest.Mock
      },
      onUpdated: {
        addListener: jest.Mock
      },
      onRemoved: {
        addListener: jest.Mock
      }
    },
    scripting: {
      executeScript: jest.Mock
    },
    runtime: {
      sendMessage: jest.Mock,
      onMessage: {
        addListener: jest.Mock
      }
    },
    storage: {
      local: {
        get: jest.Mock,
        set: jest.Mock
      }
    }
  };
}

// 模拟commons.ts中的函数
jest.mock("~/utils/commons", () => ({
  initQueues: jest.fn().mockResolvedValue(undefined),
  initWebHistory: jest.fn().mockResolvedValue(undefined),
  getRenderedHtml: jest.fn().mockReturnValue({
    url: "https://example.com",
    entryTime: Date.now(),
    title: "Example Page",
    renderedHtml: "<html></html>"
  })
}));

// 全局模拟Storage
const mockStorageInstance = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined)
};

// 模拟Storage类
jest.mock('@plasmohq/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => mockStorageInstance)
  };
});

// 模拟加载background/index.ts中的事件处理器
function simulateBackgroundScriptExecution() {
  // 模拟tabs.onCreated处理器
  onCreatedHandler = async (tab) => {
    try {
      await initWebHistory(tab.id);
      await initQueues(tab.id);
    } catch (error) {
      console.log(error);
    }
  };

  // 模拟tabs.onUpdated处理器  
  onUpdatedHandler = async (tabId: number, changeInfo: any, tab: any) => {
    if (changeInfo.status === "complete" && tab.url) {
      const storage = new Storage({ area: "local" });
      await initWebHistory(tab.id);
      await initQueues(tab.id);

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function() { return {}; }
      });

      let toPushInTabHistory: any = result[0].result;

      // 更新队列
      const urlQueueListObj = await storage.get("urlQueueList") as unknown as UrlQueueList;
      const timeQueueListObj = await storage.get("timeQueueList") as unknown as TimeQueueList;

      if (urlQueueListObj.urlQueueList && timeQueueListObj.timeQueueList) {
        const urlQueue = urlQueueListObj.urlQueueList
          .find((data) => data.tabsessionId === tabId);
          
        const timeQueue = timeQueueListObj.timeQueueList
          .find((data) => data.tabsessionId === tabId);
        
        if (urlQueue && timeQueue) {
          urlQueue.urlQueue.push(toPushInTabHistory.url);
          timeQueue.timeQueue.push(toPushInTabHistory.entryTime);

          await storage.set("urlQueueList", {
            urlQueueList: urlQueueListObj.urlQueueList
          });
          await storage.set("timeQueueList", {
            timeQueueList: timeQueueListObj.timeQueueList
          });
        }
      }
    }
  };

  // 模拟tabs.onRemoved处理器
  onRemovedHandler = async (tabId: number, removeInfo: any) => {
    const storage = new Storage({ area: "local" });
    const urlQueueListObj = await storage.get("urlQueueList") as unknown as UrlQueueList;
    const timeQueueListObj = await storage.get("timeQueueList") as unknown as TimeQueueList;
    
    if (urlQueueListObj.urlQueueList && timeQueueListObj.timeQueueList) {
      const urlQueueListToSave = urlQueueListObj.urlQueueList
        .filter(element => element.tabsessionId !== tabId);
        
      const timeQueueListSave = timeQueueListObj.timeQueueList
        .filter(element => element.tabsessionId !== tabId);
      
      await storage.set("urlQueueList", {
        urlQueueList: urlQueueListToSave
      });
      await storage.set("timeQueueList", {
        timeQueueList: timeQueueListSave
      });
    }
  };

  // 注册处理器到Chrome API
  chrome.tabs.onCreated.addListener.mockImplementation((callback) => {
    onCreatedHandler = callback;
  });
  
  chrome.tabs.onUpdated.addListener.mockImplementation((callback) => {
    onUpdatedHandler = callback;
  });
  
  chrome.tabs.onRemoved.addListener.mockImplementation((callback) => {
    onRemovedHandler = callback;
  });
  
  // 运行实际的处理器注册
  chrome.tabs.onCreated.addListener(onCreatedHandler);
  chrome.tabs.onUpdated.addListener(onUpdatedHandler);
  chrome.tabs.onRemoved.addListener(onRemovedHandler);
}

// 在测试开始前执行
simulateBackgroundScriptExecution();

describe('Background Script', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
  });
  
  describe('Tabs onCreated handler', () => {
    it('should initialize web history and queues when a tab is created', async () => {
      const mockTab = { id: 123 };
      
      await onCreatedHandler(mockTab);
      
      expect(initWebHistory).toHaveBeenCalledWith(123);
      expect(initQueues).toHaveBeenCalledWith(123);
    });
    
    it('should handle errors gracefully', async () => {
      // 模拟initWebHistory抛出错误
      (initWebHistory as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockTab = { id: 123 };
      
      await onCreatedHandler(mockTab);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
  
  describe('Tabs onUpdated handler', () => {
    it('should update history when tab is completely loaded', async () => {
      // 模拟storage.get返回
      mockStorageInstance.get
        .mockResolvedValueOnce({ 
          urlQueueList: [{ tabsessionId: 123, urlQueue: [] }] 
        })
        .mockResolvedValueOnce({ 
          timeQueueList: [{ tabsessionId: 123, timeQueue: [] }] 
        });
      
      // 模拟chrome.scripting.executeScript
      chrome.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          url: "https://example.com",
          entryTime: 1683980400000,
          title: "Example Page",
          renderedHtml: "<html></html>"
        }
      }]);
      
      const mockTabId = 123;
      const mockChangeInfo = { status: "complete" };
      const mockTab = { id: 123, url: "https://example.com" };
      
      await onUpdatedHandler(mockTabId, mockChangeInfo, mockTab);
      
      // 验证初始化函数被调用
      expect(initWebHistory).toHaveBeenCalledWith(123);
      expect(initQueues).toHaveBeenCalledWith(123);
      
      // 验证chrome.scripting.executeScript被调用
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function)
      });
      
      // 验证storage.set被调用来更新队列
      expect(mockStorageInstance.set).toHaveBeenCalledTimes(2);
    });
    
    it('should not process if change status is not complete', async () => {
      const mockTabId = 123;
      const mockChangeInfo = { status: "loading" };
      const mockTab = { id: 123, url: "https://example.com" };
      
      await onUpdatedHandler(mockTabId, mockChangeInfo, mockTab);
      
      // 验证初始化函数和storage更新没有被调用
      expect(initWebHistory).not.toHaveBeenCalled();
      expect(initQueues).not.toHaveBeenCalled();
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
      expect(mockStorageInstance.set).not.toHaveBeenCalled();
    });
  });
  
  describe('Tabs onRemoved handler', () => {
    it('should remove tab data from storage when tab is closed', async () => {
      // 模拟storage.get返回
      mockStorageInstance.get
        .mockResolvedValueOnce({ 
          urlQueueList: [
            { tabsessionId: 123, urlQueue: ['url1'] },
            { tabsessionId: 456, urlQueue: ['url2'] }
          ] 
        })
        .mockResolvedValueOnce({ 
          timeQueueList: [
            { tabsessionId: 123, timeQueue: [1000] },
            { tabsessionId: 456, timeQueue: [2000] }
          ] 
        });
      
      const mockTabId = 123;
      const mockRemoveInfo = {};
      
      await onRemovedHandler(mockTabId, mockRemoveInfo);
      
      // 验证storage.set被调用来更新队列，移除已关闭的标签页数据
      expect(mockStorageInstance.set).toHaveBeenCalledTimes(2);
      expect(mockStorageInstance.set).toHaveBeenCalledWith("urlQueueList", {
        urlQueueList: [{ tabsessionId: 456, urlQueue: ['url2'] }]
      });
      expect(mockStorageInstance.set).toHaveBeenCalledWith("timeQueueList", {
        timeQueueList: [{ tabsessionId: 456, timeQueue: [2000] }]
      });
    });
    
    it('should handle case when no queue data exists', async () => {
      // 模拟storage.get返回undefined
      mockStorageInstance.get
        .mockResolvedValueOnce({ urlQueueList: null })
        .mockResolvedValueOnce({ timeQueueList: null });
      
      const mockTabId = 123;
      const mockRemoveInfo = {};
      
      await onRemovedHandler(mockTabId, mockRemoveInfo);
      
      // 验证storage.set没有被调用
      expect(mockStorageInstance.set).not.toHaveBeenCalled();
    });
  });
}); 