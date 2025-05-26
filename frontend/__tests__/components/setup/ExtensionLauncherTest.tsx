import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExtensionLauncher } from "@/components/setup/ExtensionLauncher";

// 模拟扩展工具函数
jest.mock("@/lib/extension-utils", () => ({
  isExtensionInstalled: jest.fn().mockResolvedValue(true),
  openSidebar: jest.fn().mockResolvedValue(true),
  isSidebarSupported: jest.fn().mockReturnValue(true),
}));

describe("ExtensionLauncher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("应该正确渲染组件", async () => {
    render(<ExtensionLauncher />);

    expect(await screen.findByText("浏览器扩展")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /打开 Nexus 侧边栏/i }),
    ).toBeInTheDocument();
  });

  it("应该在扩展已安装时显示正确消息", async () => {
    const { isExtensionInstalled } = require("@/lib/extension-utils");
    isExtensionInstalled.mockResolvedValue(true); // Ensure mock is set *before* rendering

    await act(async () => {
      render(<ExtensionLauncher />);
      // Let findByText handle the waiting outside of this act block,
      // or ensure any promises that update state are awaited *inside* this block.
      // For example, if isExtensionInstalled itself returned a promise that was
      // not handled by the component's useEffect in a way that testing-library's
      // automatic waiting picks up, we might need to help it.
      // However, findByText should typically cover this.
    });
    // Use findByText here, it has its own built-in await/retry mechanism.
    expect(await screen.findByText("已安装 Nexus 扩展")).toBeInTheDocument();
  });

  it("应该在扩展未安装时显示警告消息", async () => {
    const { isExtensionInstalled } = require("@/lib/extension-utils");
    isExtensionInstalled.mockResolvedValue(false); // Ensure mock is set *before* rendering

    await act(async () => {
      render(<ExtensionLauncher />);
    });
    expect(await screen.findByText("未检测到 Nexus 扩展")).toBeInTheDocument();
  });

  it("应该在点击按钮时尝试打开侧边栏", async () => {
    const { openSidebar } = require("@/lib/extension-utils");
    openSidebar.mockResolvedValue(true);

    render(<ExtensionLauncher />);

    // 等待扩展检查完成
    const button = await screen.findByRole("button", {
      name: /打开 Nexus 侧边栏/i,
    });
    await act(async () => {
      fireEvent.click(button);
      expect(openSidebar).toHaveBeenCalled();
    });
  });
});
