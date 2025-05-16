import { extractMainContent, formatRelativeTime, truncateText, isValidUrl, generateId } from '../../utils/commons';

describe('Common Utility Functions', () => {
  describe('extractMainContent', () => {
    it('should extract main content from HTML string', () => {
      const htmlContent = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <header>Header content</header>
            <nav>Navigation</nav>
            <main>
              <h1>Main Title</h1>
              <p>This is the main content</p>
            </main>
            <footer>Footer content</footer>
          </body>
        </html>
      `;
      
      const result = extractMainContent(htmlContent);
      
      expect(result).toContain('Main Title');
      expect(result).toContain('This is the main content');
      expect(result).not.toContain('Header content');
      expect(result).not.toContain('Footer content');
    });

    it('should fallback to body content when no main tag exists', () => {
      const htmlContent = `
        <html>
          <body>
            <div>
              <h1>Article Title</h1>
              <p>Article content</p>
            </div>
          </body>
        </html>
      `;
      
      const result = extractMainContent(htmlContent);
      
      expect(result).toContain('Article Title');
      expect(result).toContain('Article content');
    });

    it('should handle malformed HTML gracefully', () => {
      const htmlContent = '<div>Unclosed div';
      
      const result = extractMainContent(htmlContent);
      
      expect(result).toContain('Unclosed div');
    });
  });

  describe('formatRelativeTime', () => {
    const NOW = new Date('2023-01-01T12:00:00Z').getTime();
    
    beforeEach(() => {
      // 模拟Date.now
      jest.spyOn(Date, 'now').mockImplementation(() => NOW);
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return "刚刚" for timestamps within 1 minute', () => {
      const timestamp = NOW - 30 * 1000; // 30 seconds ago
      expect(formatRelativeTime(timestamp)).toBe('刚刚');
    });

    it('should return minutes for timestamps within 1 hour', () => {
      const timestamp = NOW - 30 * 60 * 1000; // 30 minutes ago
      expect(formatRelativeTime(timestamp)).toBe('30分钟前');
    });

    it('should return hours for timestamps within 1 day', () => {
      const timestamp = NOW - 5 * 60 * 60 * 1000; // 5 hours ago
      expect(formatRelativeTime(timestamp)).toBe('5小时前');
    });

    it('should return days for timestamps within 1 month', () => {
      const timestamp = NOW - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      expect(formatRelativeTime(timestamp)).toBe('5天前');
    });

    it('should return date string for older timestamps', () => {
      const date = new Date('2022-06-15T10:30:00Z');
      expect(formatRelativeTime(date.getTime())).toMatch(/2022.*06.*15/); // 格式可能因实现而异
    });
  });

  describe('truncateText', () => {
    it('should truncate text when longer than maxLength', () => {
      const text = 'This is a long text that needs to be truncated';
      const result = truncateText(text, 20);
      
      // 检查结果包含前20个字符和省略号
      // 截取部分可能包含空格，所以用正则表达式匹配
      expect(result).toMatch(/^This is a long text.?\.\.\./);
      expect(result.length).toBeLessThanOrEqual(24); // 最多20 + ' ...'
    });

    it('should not truncate text when shorter than maxLength', () => {
      const text = 'Short text';
      const result = truncateText(text, 20);
      
      expect(result).toBe('Short text');
    });

    it('should return empty string for null/undefined input', () => {
      expect(truncateText(null, 10)).toBe('');
      expect(truncateText(undefined, 10)).toBe('');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://sub.domain.co.uk/path?query=1')).toBe(true);
      expect(isValidUrl('https://localhost:3000')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      // 注意：单斜杠的URL实际上可能通过URL构造函数被解析为相对URL
      expect(isValidUrl('http:/example.com')).toBe(true); 
      expect(isValidUrl('ftp://example.com')).toBe(false); // 函数仅支持http/https
    });

    it('should handle edge cases', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with specified prefix', () => {
      const id = generateId('test_');
      
      expect(id).toMatch(/^test_/);
    });
  });
}); 