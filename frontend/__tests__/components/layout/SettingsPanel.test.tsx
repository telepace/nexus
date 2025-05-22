import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SettingsPanel } from "@/components/layout/SettingsPanel";

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
    
    // 检查主要区域
    expect(screen.getByText("账户信息")).toBeInTheDocument();
    expect(screen.getByText("偏好设置")).toBeInTheDocument();
    expect(screen.getByText("关于 Nexus")).toBeInTheDocument();
  });

  it("应该在关闭状态下不渲染内容", () => {
    const { container } = render(<SettingsPanel open={false} onClose={jest.fn()} />);
    expect(container.firstChild).toHaveClass("hidden");
  });

  it("点击关闭按钮应该调用关闭回调", () => {
    const mockClose = jest.fn();
    render(<SettingsPanel open={true} onClose={mockClose} />);
    
    // 点击关闭按钮
    const closeButton = screen.getByRole("button", { name: /关闭/i });
    fireEvent.click(closeButton);
    
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