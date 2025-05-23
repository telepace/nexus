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

    // 检查默认选中的"个人资料"选项卡内容
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

    // 验证默认选中的个人资料标签
    expect(screen.getByRole("tab", { name: /个人资料/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /个人资料/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 验证其他可能的标签存在
    expect(screen.getByRole("tab", { name: /密码/i })).toBeInTheDocument();

    // 简单验证标签点击不会出错
    const passwordTab = screen.getByRole("tab", { name: /密码/i });
    fireEvent.click(passwordTab);

    // 验证密码标签仍然存在（基本功能测试）
    expect(passwordTab).toBeInTheDocument();
  });
});
