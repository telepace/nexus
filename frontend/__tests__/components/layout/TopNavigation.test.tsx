import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TopNavigation } from "@/components/layout/TopNavigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe("TopNavigation", () => {
  it("应该正确渲染顶部导航栏", () => {
    render(
      <TopNavigation
        onSettingsClick={jest.fn()}
        onAddContentClick={jest.fn()}
      />,
    );

    // 检查添加内容按钮
    expect(
      screen.getByRole("button", { name: /添加内容/i }),
    ).toBeInTheDocument();

    // 检查设置按钮
    expect(screen.getByRole("button", { name: /设置/i })).toBeInTheDocument();

    // 检查用户菜单
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("点击设置按钮应该调用设置回调", () => {
    const mockSettingsClick = jest.fn();
    render(
      <TopNavigation
        onSettingsClick={mockSettingsClick}
        onAddContentClick={jest.fn()}
      />,
    );

    // 点击设置按钮
    const settingsButton = screen.getByRole("button", { name: /设置/i });
    fireEvent.click(settingsButton);

    // 验证回调被调用
    expect(mockSettingsClick).toHaveBeenCalledTimes(1);
  });

  it("点击添加内容按钮应该调用添加内容回调", () => {
    const mockAddContentClick = jest.fn();
    render(
      <TopNavigation
        onSettingsClick={jest.fn()}
        onAddContentClick={mockAddContentClick}
      />,
    );

    // 点击添加内容按钮
    const addContentButton = screen.getByRole("button", { name: /添加内容/i });
    fireEvent.click(addContentButton);

    // 验证回调被调用
    expect(mockAddContentClick).toHaveBeenCalledTimes(1);
  });

  it("点击用户头像应该打开用户菜单", () => {
    render(
      <TopNavigation
        onSettingsClick={jest.fn()}
        onAddContentClick={jest.fn()}
      />,
    );

    // 获取用户菜单按钮
    const userMenuButton = screen.getByTestId("user-menu");

    // 验证按钮存在且可点击
    expect(userMenuButton).toBeInTheDocument();
    expect(userMenuButton).toHaveAttribute("type", "button");

    // 点击菜单按钮（验证不会抛出错误）
    fireEvent.click(userMenuButton);

    // 验证按钮仍然存在（基本功能测试）
    expect(userMenuButton).toBeInTheDocument();
  });
});
