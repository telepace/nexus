import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { TimeZoneProvider } from "@/lib/time-zone-context";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe("SettingsPanel", () => {
  it("应该正确渲染设置面板", () => {
    render(<SettingsPanel open={true} onClose={jest.fn()} />);

    // 检查标题
    expect(screen.getByText("设置")).toBeInTheDocument();

    // 检查默认选中的“个人资料”选项卡内容
    expect(
      screen.getByRole("tab", { name: /个人资料/i, selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /个人资料/i, level: 3 }),
    ).toBeInTheDocument();
    // "偏好设置" and "关于 Nexus" tabs/sections don't exist in the current component.
  });

  it("应该在关闭状态下不渲染内容", () => {
    const { container } = render(
      <SettingsPanel open={false} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toHaveClass("hidden");
  });

  it("点击关闭按钮应该调用关闭回调", () => {
    const mockClose = jest.fn();
    render(<SettingsPanel open={true} onClose={mockClose} />);

    const closeButton = screen.getByRole("button", { name: /关闭/i });
    // 点击关闭按钮
    act(() => {
      fireEvent.click(closeButton);
    });

    // 验证回调被调用
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("应该正确切换不同设置选项卡", () => {
    render(<SettingsPanel open={true} onClose={jest.fn()} />);

    // 默认显示账户信息
    expect(screen.getByText("账户信息")).toBeInTheDocument();

    // 点击偏好设置选项卡
    fireEvent.click(screen.getByRole("tab", { name: /偏好设置/i }));

    // 检查主题选项
    expect(screen.getByText("主题")).toBeInTheDocument();
    expect(screen.getByText("语言选择")).toBeInTheDocument();

    // 点击关于选项卡
    fireEvent.click(screen.getByRole("tab", { name: /关于 Nexus/i }));

    // 检查关于内容
    expect(screen.getByText("版本")).toBeInTheDocument();
    expect(screen.getByText("隐私协议")).toBeInTheDocument();
    expect(screen.getByText("用户协议")).toBeInTheDocument();
  });
});
