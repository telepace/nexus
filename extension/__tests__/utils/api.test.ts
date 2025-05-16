import { saveClipping, getRecentClippings, getAIInsight, login, logout } from '../../utils/api';
import { Storage } from '@plasmohq/storage';
import type { ClippedItem, UserProfile } from '../../utils/interfaces';

// 模拟Storage和fetch
jest.mock('@plasmohq/storage');
global.fetch = jest.fn();

describe('API Utility Functions', () => {
  const API_BASE_URL = 'https://api.nexus-app.com';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟Storage实现
    (Storage as jest.Mock).mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    }));
  });

  describe('saveClipping', () => {
    const mockClipping = {
      title: 'Test Article',
      content: 'This is test content',
      url: 'https://example.com/test',
      timestamp: 1234567890,
      status: 'unread' as const
    };

    it('should save clipping to API when online', async () => {
      // 模拟Storage.get返回用户数据
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockImplementation((key) => {
        if (key === 'userProfile') {
          return Promise.resolve({ token: 'test-token' });
        }
        return Promise.resolve(null);
      });
      
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // 模拟成功的API响应
      const mockResponse = { ...mockClipping, id: 'server-id-123' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await saveClipping(mockClipping);
      
      // 验证fetch被调用且参数正确
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/clippings`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockClipping)
        })
      );
      
      // 验证返回结果
      expect(result).toEqual(mockResponse);
    });

    it('should save clipping to local storage when offline', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce([]);
      
      // 模拟chrome.runtime.sendMessage
      chrome.runtime.sendMessage = jest.fn();
      
      const result = await saveClipping(mockClipping);
      
      // 验证没有调用fetch
      expect(global.fetch).not.toHaveBeenCalled();
      
      // 验证调用了Storage.set保存到本地
      expect(mockInstance.set).toHaveBeenCalledWith(
        'pendingClippings',
        [expect.objectContaining({ 
          ...mockClipping,
          id: expect.stringContaining('temp_')
        })]
      );
      
      // 验证更新了徽章计数
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'updateBadgeCount' });
      
      // 验证返回了带临时ID的对象
      expect(result).toHaveProperty('id');
      expect(result.id).toContain('temp_');
    });
    
    it('should handle API errors appropriately', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockImplementation((key) => {
        if (key === 'userProfile') {
          return Promise.resolve({ token: 'test-token' });
        }
        if (key === 'pendingClippings') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });
      
      // 模拟API错误
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });
      
      const result = await saveClipping(mockClipping);
      
      // 验证调用了fetch
      expect(global.fetch).toHaveBeenCalled();
      
      // 验证错误处理 - 保存到本地
      expect(mockInstance.set).toHaveBeenCalledWith(
        'pendingClippings',
        [expect.objectContaining({ 
          ...mockClipping,
          id: expect.stringContaining('temp_')
        })]
      );
      
      // 验证返回了带临时ID的对象
      expect(result).toHaveProperty('id');
      expect(result.id).toContain('temp_');
    });
  });

  describe('getRecentClippings', () => {
    it('should fetch clippings from API when online', async () => {
      // 模拟在线状态和认证
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce({ token: 'test-token' });
      
      // 模拟API响应
      const mockClippings = [
        { id: '1', title: 'Test 1', content: 'Content 1', url: 'https://test.com/1', timestamp: 123456789, status: 'unread' },
        { id: '2', title: 'Test 2', content: 'Content 2', url: 'https://test.com/2', timestamp: 123456790, status: 'reading' }
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockClippings)
      });
      
      const result = await getRecentClippings(2);
      
      // 验证调用了API
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/clippings?limit=2`,
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
      
      // 验证结果
      expect(result).toEqual(mockClippings);
    });
    
    it('should return pending clippings when offline', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // 模拟本地存储的clippings
      const mockPendingClippings = [
        { id: 'temp_1', title: 'Offline 1', content: 'Content 1', url: 'https://test.com/1', timestamp: 123456789, status: 'unread' },
        { id: 'temp_2', title: 'Offline 2', content: 'Content 2', url: 'https://test.com/2', timestamp: 123456790, status: 'unread' }
      ];
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockImplementation((key) => {
        if (key === 'pendingClippings') {
          return Promise.resolve(mockPendingClippings);
        }
        return Promise.resolve(null);
      });
      
      const result = await getRecentClippings(1);
      
      // 验证没有调用API
      expect(global.fetch).not.toHaveBeenCalled();
      
      // 验证返回了本地存储的数据
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPendingClippings[0]);
    });
    
    it('should handle API errors gracefully', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockImplementation((key) => {
        if (key === 'userProfile') {
          return Promise.resolve({ token: 'test-token' });
        }
        if (key === 'pendingClippings') {
          return Promise.resolve([{ id: 'local-1', title: 'Local', content: 'Local content', url: 'https://local.com', timestamp: 123456789, status: 'unread' }]);
        }
        return Promise.resolve(null);
      });
      
      // 模拟API错误
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });
      
      const result = await getRecentClippings(5);
      
      // 验证调用了API
      expect(global.fetch).toHaveBeenCalled();
      
      // 验证返回了本地存储的数据
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('local-1');
    });
  });

  describe('getAIInsight', () => {
    const testContent = 'This is test content for AI processing';
    
    it('should request AI insights successfully', async () => {
      // 模拟在线状态和认证
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce({ token: 'test-token' });
      
      // 模拟API响应
      const mockResponse = {
        type: 'summary',
        content: 'AI generated summary',
        sourceText: testContent,
        timestamp: Date.now()
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await getAIInsight('summary', testContent);
      
      // 验证调用了正确的API
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/ai/summary`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: testContent })
        })
      );
      
      // 验证结果
      expect(result).toEqual(mockResponse);
    });
    
    it('should handle options in AI requests', async () => {
      // 模拟在线状态和认证
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce({ token: 'test-token' });
      
      // 模拟API响应
      const mockResponse = {
        type: 'translation',
        content: '测试内容的翻译',
        sourceText: testContent,
        timestamp: Date.now()
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const options = { targetLanguage: 'zh-CN' };
      const result = await getAIInsight('translation', testContent, options);
      
      // 验证调用了正确的API并包含选项
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/ai/translation`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: testContent, targetLanguage: 'zh-CN' })
        })
      );
      
      // 验证结果
      expect(result).toEqual(mockResponse);
    });
    
    it('should return fallback response when offline', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const result = await getAIInsight('summary', testContent);
      
      // 验证没有调用API
      expect(global.fetch).not.toHaveBeenCalled();
      
      // 验证返回了离线状态消息
      expect(result.type).toBe('summary');
      expect(result.content).toContain('离线状态');
      expect(result.sourceText).toBe(testContent);
    });
  });

  describe('login', () => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    it('should login successfully and store user profile', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // 模拟API响应
      const mockUserProfile = {
        id: 'user123',
        name: 'Test User',
        email: testEmail,
        isAuthenticated: true,
        token: 'jwt-token-123',
        tokenExpiry: Date.now() + 3600000 // 1小时后过期
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserProfile)
      });
      
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      
      const result = await login(testEmail, testPassword);
      
      // 验证调用了登录API
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: testEmail, password: testPassword })
        })
      );
      
      // 验证存储了用户资料
      expect(mockInstance.set).toHaveBeenCalledWith('userProfile', mockUserProfile);
      
      // 验证返回了用户资料
      expect(result).toEqual(mockUserProfile);
    });
    
    it('should throw error when login fails', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // 模拟API错误
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });
      
      // 验证登录失败抛出错误
      await expect(login(testEmail, testPassword)).rejects.toThrow('登录失败');
    });
    
    it('should throw error when offline', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // 验证离线状态抛出错误
      await expect(login(testEmail, testPassword)).rejects.toThrow('离线状态');
    });
  });

  describe('logout', () => {
    it('should call logout API and remove user profile when online', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // 模拟认证头
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce({ token: 'test-token' });
      
      // 模拟API响应
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });
      
      await logout();
      
      // 验证调用了登出API
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/auth/logout`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers)
        })
      );
      
      // 验证移除了用户资料
      expect(mockInstance.remove).toHaveBeenCalledWith('userProfile');
    });
    
    it('should still remove user profile when offline', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      
      await logout();
      
      // 验证没有调用API
      expect(global.fetch).not.toHaveBeenCalled();
      
      // 验证仍然移除了用户资料
      expect(mockInstance.remove).toHaveBeenCalledWith('userProfile');
    });
    
    it('should handle API errors gracefully', async () => {
      // 模拟在线状态
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      // 模拟认证头
      const mockInstance = (Storage as jest.Mock).mock.instances[0];
      mockInstance.get.mockResolvedValueOnce({ token: 'test-token' });
      
      // 模拟API错误
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await logout();
      
      // 验证尝试调用了API
      expect(global.fetch).toHaveBeenCalled();
      
      // 验证仍然移除了用户资料
      expect(mockInstance.remove).toHaveBeenCalledWith('userProfile');
    });
  });
}); 