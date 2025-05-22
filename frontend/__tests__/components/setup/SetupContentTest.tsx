import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";
import { SetupContent } from "@/components/setup/SetupContent";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// 模拟useSearchParams hook的实现
let mockSearchParams = new (class {
  params: Record<string, string>;
  
  constructor() {
    this.params = {
      plugin_id: "test-plugin-id",
      extension_callback: "http://localhost:3000/callback",
    };
  }
  get = jest.fn((param) => this.params[param] || null);
  has = jest.fn((param) => !!this.params[param]);
  getAll = jest.fn(() => []);
  entries = jest.fn(() => Object.entries(this.params));
  keys = jest.fn(() => Object.keys(this.params));
  values = jest.fn(() => Object.values(this.params));
  toString = jest.fn(() => "");
  forEach = jest.fn();
})();

// 模拟next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => mockSearchParams),
  usePathname: jest.fn(() => "/setup"),
}));

// 模拟Auth Hook
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(() => ({
    user: {
      token: "fake-token",
      name: "Test User",
      email: "test@example.com",
    },
    isLoading: false,
  })),
}));

// 模拟ExtensionLauncher组件
jest.mock("@/components/setup/ExtensionLauncher", () => ({
  ExtensionLauncher: ({ onSidebarOpened }: { onSidebarOpened: () => void }) => (
    <div data-testid="extension-launcher">
      浏览器侧边栏启动器
      <button onClick={onSidebarOpened}>打开侧边栏</button>
    </div>
  ),
}));

// 模拟extension-utils
jest.mock("@/lib/extension-utils", () => ({
  getExtensionPluginId: jest.fn().mockResolvedValue("test-plugin-id"),
  saveTokenToExtension: jest.fn().mockResolvedValue(true),
  isExtensionInstalled: jest.fn().mockResolvedValue(true),
  openExtensionTab: jest.fn().mockResolvedValue(true),
  openSidepanel: jest.fn().mockResolvedValue(true),
}));

describe("SetupContent", () => {
  beforeEach(() => {
    mockSearchParams = new (class {
      params: Record<string, string>;
      
      constructor() {
        this.params = {
          plugin_id: "test-plugin-id",
          extension_callback: "http://localhost:3000/callback",
        };
      }
      get = jest.fn((param) => this.params[param] || null);
      has = jest.fn((param) => !!this.params[param]);
      getAll = jest.fn(() => []);
      entries = jest.fn(() => Object.entries(this.params));
      keys = jest.fn(() => Object.keys(this.params));
      values = jest.fn(() => Object.values(this.params));
      toString = jest.fn(() => "");
      forEach = jest.fn();
    })();

    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    });
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        token: "fake-token",
        name: "Test User",
        email: "test@example.com",
      },
      isLoading: false,
    });
  });

  it("应该正确渲染第一步的内容", () => {
    render(<SetupContent />);

    expect(screen.getByText("欢迎使用 Nexus")).toBeInTheDocument();
    expect(screen.getByText("直观的用户界面")).toBeInTheDocument();
  });

  it("应该能导航到下一步", () => {
    render(<SetupContent />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    // 使用 queryAllByText 获取所有匹配的元素，然后检查 h3 标题
    const headings = screen.queryAllByText("个性化设置");
    const settingsHeading = headings.find(
      (el) => el.tagName.toLowerCase() === "h3",
    );
    expect(settingsHeading).toBeInTheDocument();
  });

  it("应该在第二步显示设置选项", () => {
    render(<SetupContent />);

    // 导航到第二步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    expect(screen.getByText("暗色模式")).toBeInTheDocument();
    expect(screen.getByText("通知")).toBeInTheDocument();
    expect(screen.getByText("数据分析")).toBeInTheDocument();
  });

  it("应该能够从第二步返回第一步", () => {
    render(<SetupContent />);

    // 导航到第二步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    // 返回第一步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /上一步/i }));
    });

    const headings = screen.queryAllByText("欢迎使用 Nexus");
    const welcomeHeading = headings.find(
      (el) => el.tagName.toLowerCase() === "h3",
    );
    expect(welcomeHeading).toBeInTheDocument();
  });

  it("应该能导航到最后一步并显示完成信息", () => {
    render(<SetupContent />);

    // 导航到第二步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    // 导航到第三步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    const headings = screen.queryAllByText("设置完成！");
    const completeHeading = headings.find(
      (el) => el.tagName.toLowerCase() === "h3",
    );
    expect(completeHeading).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /完成/i })).toBeInTheDocument();
  });

  it("应该在最后一步显示浏览器侧边栏启动器", () => {
    render(<SetupContent />);

    // 导航到第二步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    // 导航到第三步
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    });

    expect(screen.getByTestId("extension-launcher")).toBeInTheDocument();
    expect(screen.getByText("启用浏览器侧边栏")).toBeInTheDocument();
  });
});
