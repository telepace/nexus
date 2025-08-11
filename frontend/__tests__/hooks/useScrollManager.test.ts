import { renderHook, act } from "@testing-library/react";
import { useScrollManager } from "@/hooks/useScrollManager";

// Mock timers
jest.useFakeTimers();

// Mock scrollTo and scrollIntoView
const mockScrollTo = jest.fn();
const mockScrollIntoView = jest.fn();

// Mock HTMLElement methods
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: mockScrollTo,
  writable: true
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  writable: true
});

describe("useScrollManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe("用户滚动意图检测", () => {
    test("应该检测到用户滚动", () => {
      const { result } = renderHook(() => useScrollManager());

      // 初始状态
      expect(result.current.userHasScrolled).toBe(false);
      expect(result.current.isUserScrolling).toBe(false);

      // 模拟滚动事件
      const mockEvent = {
        target: {
          scrollTop: 100,
        }
      } as any;

      act(() => {
        result.current.handleScroll(mockEvent);
      });

      expect(result.current.userHasScrolled).toBe(true);
      expect(result.current.isUserScrolling).toBe(true);

      // 150ms后应该停止滚动状态
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.isUserScrolling).toBe(false);
      expect(result.current.userHasScrolled).toBe(true); // 保持记录
    });

    test("应该能够重置滚动意图", () => {
      const { result } = renderHook(() => useScrollManager());

      // 先设置滚动状态
      const mockEvent = {
        target: { scrollTop: 100 }
      } as any;

      act(() => {
        result.current.handleScroll(mockEvent);
      });

      expect(result.current.userHasScrolled).toBe(true);

      // 重置滚动意图
      act(() => {
        result.current.resetUserScrollIntent();
      });

      expect(result.current.userHasScrolled).toBe(false);
      expect(result.current.isUserScrolling).toBe(false);
    });
  });

  describe("滚动策略计算", () => {
    test("Preview模式应该保持滚动位置", () => {
      const { result } = renderHook(() => useScrollManager());

      // 模拟用户已滚动的Preview场景
      const scenario = {
        variant: "preview" as const,
        scene: "preview" as const,
        contentChanged: true,
        userHasScrolled: true,
        hasNewContent: false,
      };

      const strategy = result.current.getScrollStrategy(scenario);
      expect(strategy).toBe("preserve");
    });

    test("全屏模式应该智能滚动", () => {
      const { result } = renderHook(() => useScrollManager());

      const scenario = {
        variant: "fullscreen" as const,
        scene: "reader" as const,
        contentChanged: true,
        userHasScrolled: false,
        hasNewContent: false,
      };

      const strategy = result.current.getScrollStrategy(scenario);
      expect(strategy).toBe("top");
    });

    test("有新内容时应该滚动到底部", () => {
      const { result } = renderHook(() => useScrollManager());

      const scenario = {
        variant: "fullscreen" as const,
        scene: "reader" as const,
        contentChanged: false,
        userHasScrolled: false,
        hasNewContent: true,
      };

      const strategy = result.current.getScrollStrategy(scenario);
      expect(strategy).toBe("bottom");
    });
  });

  describe("滚动执行", () => {
    test("应该执行滚动到顶部", () => {
      const { result } = renderHook(() => useScrollManager());
      
      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      act(() => {
        result.current.executeScroll(mockContainer, "top");
        jest.advanceTimersByTime(100); // 默认防抖时间
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });

    test("应该执行滚动到底部", () => {
      const { result } = renderHook(() => useScrollManager());
      
      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      act(() => {
        result.current.executeScroll(mockContainer, "bottom");
        jest.advanceTimersByTime(100);
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 500, // scrollHeight - clientHeight
        behavior: "smooth"
      });
    });

    test("用户滚动后不应该强制滚动", () => {
      const { result } = renderHook(() => useScrollManager());
      
      // 先模拟用户滚动
      act(() => {
        result.current.handleScroll({
          target: { scrollTop: 100 }
        } as any);
      });

      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      act(() => {
        result.current.executeScroll(mockContainer, "top", { force: false });
        jest.advanceTimersByTime(100);
      });

      // 不应该执行滚动，因为用户已经滚动过
      expect(mockScrollTo).not.toHaveBeenCalled();
    });

    test("强制模式应该忽略用户滚动状态", () => {
      const { result } = renderHook(() => useScrollManager());
      
      // 先模拟用户滚动
      act(() => {
        result.current.handleScroll({
          target: { scrollTop: 100 }
        } as any);
      });

      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      act(() => {
        result.current.executeScroll(mockContainer, "top", { force: true });
        jest.advanceTimersByTime(100);
      });

      // 强制模式下应该执行滚动
      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });
  });

  describe("智能滚动", () => {
    test("应该根据场景选择正确的策略并执行", () => {
      const { result } = renderHook(() => useScrollManager());
      
      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      const scenario = {
        variant: "preview" as const,
        scene: "preview" as const,
        contentChanged: true,
        userHasScrolled: false,
        hasNewContent: false,
      };

      act(() => {
        result.current.smartScroll(mockContainer, scenario);
        jest.advanceTimersByTime(100);
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });
  });

  describe("配置选项", () => {
    test("应该支持自定义防抖时间", () => {
      const { result } = renderHook(() => 
        useScrollManager({ debounceMs: 200 })
      );
      
      const mockContainer = {
        current: {
          scrollTo: mockScrollTo,
          scrollHeight: 1000,
          clientHeight: 500,
        }
      } as any;

      act(() => {
        result.current.executeScroll(mockContainer, "top");
        jest.advanceTimersByTime(100); // 小于自定义防抖时间
      });

      // 不应该执行，因为时间不够
      expect(mockScrollTo).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100); // 总共200ms
      });

      // 现在应该执行
      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });

    test("应该支持禁用用户意图检测", () => {
      const { result } = renderHook(() => 
        useScrollManager({ enableUserIntentDetection: false })
      );

      const mockEvent = {
        target: { scrollTop: 100 }
      } as any;

      act(() => {
        result.current.handleScroll(mockEvent);
      });

      // 禁用时不应该检测到滚动
      expect(result.current.userHasScrolled).toBe(false);
      expect(result.current.isUserScrolling).toBe(false);
    });
  });
});