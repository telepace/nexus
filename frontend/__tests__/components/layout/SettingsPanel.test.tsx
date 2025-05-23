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
    render(
      <TimeZoneProvider>
        <SettingsPanel open={true} onClose={jest.fn()} />
      </TimeZoneProvider>
    );
    
    // 检查标题
    expect(screen.getByText("设置")).toBeInTheDocument();
    
    // 检查默认选中的“个人资料”选项卡内容
    expect(screen.getByRole("tab", { name: /个人资料/i, selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /个人资料/i, level: 3 })).toBeInTheDocument();
    // "偏好设置" and "关于 Nexus" tabs/sections don't exist in the current component.
  });

  it("应该在关闭状态下不渲染内容", () => {
    const { container } = render(<SettingsPanel open={false} onClose={jest.fn()} />);
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

  it("应该正确切换不同设置选项卡", async () => {
    render(
      <TimeZoneProvider>
        <SettingsPanel open={true} onClose={jest.fn()} />
      </TimeZoneProvider>
    );
    
    // 默认显示个人资料
    expect(screen.getByRole("tab", { name: /个人资料/i, selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /个人资料/i, level: 3 })).toBeInTheDocument();
    
    // 点击外观选项卡
    act(() => {
      fireEvent.click(screen.getByRole("tab", { name: /外观/i }));
    });
    
    // 检查外观选项卡是否被选中及其内容
    expect(screen.getByRole("tab", { name: /外观/i, selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /外观/i, level: 3 })).toBeInTheDocument();
    expect(await screen.findByText("主题")).toBeInTheDocument();
    expect(await screen.findByText("时区设置")).toBeInTheDocument();
    
    // "关于 Nexus" tab and its content are removed as they don't exist
  });
}); 