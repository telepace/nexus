import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePathname } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
  });

  it("应该正确渲染展开状态的侧边栏", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={jest.fn()} />);

    // 检查导航项是否存在
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();

    // 检查折叠按钮
    const collapseButton = screen.getByRole("button", { name: /折叠侧边栏/i });
    expect(collapseButton).toBeInTheDocument();
  });

  it("应该正确渲染折叠状态的侧边栏", () => {
    render(<Sidebar collapsed={true} onToggleCollapse={jest.fn()} />);

    // 在折叠状态下，文本内容应该隐藏，只有图标可见
    expect(screen.queryByText("Dashboard")).not.toBeVisible();
    expect(screen.queryByText("Prompts")).not.toBeVisible();

    // 但图标应该仍然可见
    expect(screen.getByLabelText("Dashboard")).toBeInTheDocument();
    expect(screen.getByLabelText("Prompts")).toBeInTheDocument();

    // 检查展开按钮
    const expandButton = screen.getByRole("button", { name: /展开侧边栏/i });
    expect(expandButton).toBeInTheDocument();
  });

  it("点击折叠按钮应该调用折叠回调", () => {
    const mockToggle = jest.fn();
    render(<Sidebar collapsed={false} onToggleCollapse={mockToggle} />);

    // 点击折叠按钮
    const collapseButton = screen.getByRole("button", { name: /折叠侧边栏/i });
    fireEvent.click(collapseButton);

    // 验证回调被调用
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("应该高亮显示当前路径对应的导航项", () => {
    (usePathname as jest.Mock).mockReturnValue("/prompts");
    render(<Sidebar collapsed={false} onToggleCollapse={jest.fn()} />);

    // 获取所有导航链接
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const promptsLink = screen.getByText("Prompts").closest("a");

    // 验证Prompts链接具有高亮类
    expect(promptsLink).toHaveClass("text-primary");
    expect(dashboardLink).not.toHaveClass("text-primary");
  });
});
