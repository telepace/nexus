import { initQueues, initWebHistory, toIsoString, webhistoryToLangChainDocument } from '~/utils/commons';
import { Storage } from "@plasmohq/storage";

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

describe('Commons Utilities', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
  });
  
  describe('initQueues', () => {
    it('should initialize queues when they do not exist', async () => {
      // 模拟storage.get返回undefined
      mockStorageInstance.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
      
      await initQueues(123);
      
      // 验证storage.set被正确调用
      expect(mockStorageInstance.set).toHaveBeenCalledWith("urlQueueList", {
        urlQueueList: [{ tabsessionId: 123, urlQueue: [] }]
      });
      expect(mockStorageInstance.set).toHaveBeenCalledWith("timeQueueList", {
        timeQueueList: [{ tabsessionId: 123, timeQueue: [] }]
      });
    });
    
    it('should add tab to existing queues when they exist but tab is not in queues', async () => {
      // 模拟storage.get返回已存在的队列
      mockStorageInstance.get
        .mockResolvedValueOnce({
          urlQueueList: [{ tabsessionId: 456, urlQueue: [] }]
        })
        .mockResolvedValueOnce({
          timeQueueList: [{ tabsessionId: 456, timeQueue: [] }]
        });
      
      await initQueues(123);
      
      // 验证是否添加了新的tab
      expect(mockStorageInstance.set).toHaveBeenCalledWith("urlQueueList", {
        urlQueueList: [
          { tabsessionId: 456, urlQueue: [] },
          { tabsessionId: 123, urlQueue: [] }
        ]
      });
      expect(mockStorageInstance.set).toHaveBeenCalledWith("timeQueueList", {
        timeQueueList: [
          { tabsessionId: 456, timeQueue: [] },
          { tabsessionId: 123, timeQueue: [] }
        ]
      });
    });
  });
  
  describe('initWebHistory', () => {
    it('should initialize web history when it does not exist', async () => {
      // 模拟storage.get返回undefined
      mockStorageInstance.get.mockResolvedValueOnce(undefined);
      
      await initWebHistory(123);
      
      // 验证storage.set被正确调用
      expect(mockStorageInstance.set).toHaveBeenCalledWith("webhistory", { 
        webhistory: [] 
      });
    });
    
    it('should add tab to existing web history when it exists but tab is not in history', async () => {
      // 模拟storage.get返回已存在的历史记录
      mockStorageInstance.get.mockResolvedValueOnce({
        webhistory: [{ tabsessionId: 456, tabHistory: [] }]
      });
      
      await initWebHistory(123);
      
      // 验证是否添加了新的tab
      expect(mockStorageInstance.set).toHaveBeenCalledWith("webhistory", {
        webhistory: [
          { tabsessionId: 456, tabHistory: [] },
          { tabsessionId: 123, tabHistory: [] }
        ]
      });
    });
  });
  
  describe('toIsoString', () => {
    it('should format date to ISO string with timezone', () => {
      // 创建一个固定的日期用于测试
      const testDate = new Date('2023-05-15T12:30:45Z');
      
      // 获取预期的时区偏移
      const tzo = -testDate.getTimezoneOffset();
      const dif = tzo >= 0 ? "+" : "-";
      const pad = (num: number) => (num < 10 ? "0" : "") + num;
      
      // 计算预期结果
      const expected = 
        "2023-05-15T" +
        pad(testDate.getHours()) + ":" +
        pad(testDate.getMinutes()) + ":" +
        pad(testDate.getSeconds()) +
        dif +
        pad(Math.floor(Math.abs(tzo) / 60)) + ":" +
        pad(Math.abs(tzo) % 60);
      
      expect(toIsoString(testDate)).toBe(expected);
    });
  });
  
  describe('webhistoryToLangChainDocument', () => {
    it('should convert web history to LangChain document format', () => {
      const tabId = 123;
      const tabHistory = [
        {
          url: 'https://example.com',
          title: 'Example Page',
          entryTime: 1683980400000, // 2023-05-13T12:00:00Z
          reffererUrl: 'https://referrer.com',
          duration: 5000,
          pageContentMarkdown: '# Example Content'
        }
      ];
      
      const result = webhistoryToLangChainDocument(tabId, tabHistory);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0]).toHaveProperty('pageContent');
      
      expect(result[0].metadata).toEqual({
        BrowsingSessionId: '123',
        VisitedWebPageURL: 'https://example.com',
        VisitedWebPageTitle: 'Example Page',
        VisitedWebPageDateWithTimeInISOString: expect.any(String),
        VisitedWebPageReffererURL: 'https://referrer.com',
        VisitedWebPageVisitDurationInMilliseconds: 5000
      });
      
      expect(result[0].pageContent).toBe('# Example Content');
    });
  });
}); 