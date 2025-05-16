import '@testing-library/jest-dom';

// 模拟@plasmohq/storage
jest.mock('@plasmohq/storage', () => {
  const StorageMock = jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockImplementation(() => Promise.resolve({})),
      set: jest.fn().mockImplementation(() => Promise.resolve()),
      remove: jest.fn().mockImplementation(() => Promise.resolve()),
      clear: jest.fn().mockImplementation(() => Promise.resolve()),
    };
  });
  
  return {
    Storage: StorageMock
  };
});

// 模拟浏览器API
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟fetch API
global.fetch = jest.fn();

// 模拟Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
} as unknown as typeof chrome;

// 模拟在线状态
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// 清理测试间的模拟
beforeEach(() => {
  jest.clearAllMocks();
}); 