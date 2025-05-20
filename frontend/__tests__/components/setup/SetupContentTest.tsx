import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SetupContent } from "@/components/setup/SetupContent";

// 模拟next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// 模拟ExtensionLauncher组件
jest.mock("@/components/setup/ExtensionLauncher", () => ({
  ExtensionLauncher: () => (
    <div data-testid="extension-launcher">浏览器侧边栏启动器</div>
  ),
}));

describe("SetupContent", () => {
  it("应该正确渲染第一步的内容", () => {
    render(<SetupContent />);

    expect(screen.getByText("欢迎使用 Nexus")).toBeInTheDocument();
    expect(screen.getByText("直观的用户界面")).toBeInTheDocument();
  });

  it("应该能导航到下一步", () => {
    render(<SetupContent />);

    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    expect(screen.getByText("个性化设置")).toBeInTheDocument();
  });

  it("应该在第二步显示设置选项", () => {
    render(<SetupContent />);

    // 导航到第二步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    expect(screen.getByText("暗色模式")).toBeInTheDocument();
    expect(screen.getByText("通知")).toBeInTheDocument();
    expect(screen.getByText("数据分析")).toBeInTheDocument();
  });

  it("应该能够从第二步返回第一步", () => {
    render(<SetupContent />);

    // 导航到第二步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    // 返回第一步
    fireEvent.click(screen.getByRole("button", { name: /上一步/i }));

    expect(screen.getByText("欢迎使用 Nexus")).toBeInTheDocument();
  });

  it("应该能导航到最后一步并显示完成信息", () => {
    render(<SetupContent />);

    // 导航到第二步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    // 导航到第三步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    expect(screen.getByText("设置完成！")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /完成/i })).toBeInTheDocument();
  });

  it("应该在最后一步显示浏览器侧边栏启动器", () => {
    render(<SetupContent />);

    // 导航到第二步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    // 导航到第三步
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    expect(screen.getByTestId("extension-launcher")).toBeInTheDocument();
    expect(screen.getByText("启用浏览器侧边栏")).toBeInTheDocument();
  });
});
