// 导入jest-dom扩展
require('@testing-library/jest-dom');

// Mock browser.storage API
global.chrome = {
  tabs: {
    onCreated: {
      addListener: jest.fn()
    },
    onUpdated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn().mockResolvedValue([{ result: {} }])
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
}; 