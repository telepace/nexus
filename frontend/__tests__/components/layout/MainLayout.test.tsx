import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import MainLayout from "@/components/layout/MainLayout";
import { usePathname } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

// Mock TopNavigation component
jest.mock("@/components/layout/TopNavigation", () => ({
  TopNavigation: ({ onSettingsClick, onAddContentClick }: any) => (
    <div data-testid="top-navigation">
      <button onClick={onSettingsClick}>Settings</button>
      <button onClick={onAddContentClick}>Add Content</button>
    </div>
  ),
}));

// Mock SettingsPanel component
jest.mock("@/components/layout/SettingsPanel", () => ({
  SettingsPanel: ({ open, onClose }: any) =>
    open ? <div data-testid="settings-panel">Settings Panel</div> : null,
}));

// Mock AddContentModal component
jest.mock("@/components/layout/AddContentModal", () => ({
  AddContentModal: ({ open, onClose }: any) =>
    open ? <div data-testid="add-content-modal">Add Content Modal</div> : null,
}));

describe("MainLayout", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
  });

  it("应该正确渲染MainLayout和所有子组件", () => {
    render(
      <MainLayout pageTitle="Test Page">
        <div data-testid="page-content">Page Content</div>
      </MainLayout>,
    );

    // 检查sidebar是否渲染
    expect(screen.getByAltText("Nexus Logo")).toBeInTheDocument();
    expect(screen.getByText("Nexus")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();

    // 检查顶部导航
    expect(screen.getByTestId("top-navigation")).toBeInTheDocument();

    // 检查页面标题
    expect(screen.getByText("Test Page")).toBeInTheDocument();

    // 检查页面内容
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("应该在fullscreen模式下正确渲染", () => {
    render(
      <MainLayout fullscreen={true}>
        <div data-testid="fullscreen-content">Fullscreen Content</div>
      </MainLayout>,
    );

    // 检查sidebar仍然存在
    expect(screen.getByText("Nexus")).toBeInTheDocument();

    // 检查内容直接渲染，没有容器包装
    expect(screen.getByTestId("fullscreen-content")).toBeInTheDocument();

    // 不应该有页面标题
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("应该正确显示当前激活的导航项", () => {
    (usePathname as jest.Mock).mockReturnValue("/prompts");

    render(
      <MainLayout pageTitle="Prompts">
        <div>Prompts Content</div>
      </MainLayout>,
    );

    // 直接查找导航链接，使用getAllByText来处理重复的文本
    const allPromptsElements = screen.getAllByText("Prompts");
    const allDashboardElements = screen.getAllByText("Dashboard");

    // 找到sidebar中的导航链接（应该是第一个，因为sidebar在页面标题之前渲染）
    const promptsLink = allPromptsElements[0].closest("a");
    const dashboardLink = allDashboardElements[0].closest("a");

    // 检查Prompts导航项是否激活
    expect(promptsLink).toHaveAttribute("data-active", "true");

    // 检查其他导航项不激活
    expect(dashboardLink).toHaveAttribute("data-active", "false");
  });

  it("应该包含SidebarProvider并正确管理sidebar状态", () => {
    const { container } = render(
      <MainLayout pageTitle="Test">
        <div>Content</div>
      </MainLayout>,
    );

    // 检查是否有SidebarProvider的包装器
    const sidebarWrapper = container.querySelector(
      '[data-slot="sidebar-wrapper"]',
    );
    expect(sidebarWrapper).toBeInTheDocument();

    // 检查是否有SidebarInset
    const sidebarInset = container.querySelector('[data-slot="sidebar-inset"]');
    expect(sidebarInset).toBeInTheDocument();
  });

  it("应该正确处理没有pageTitle的情况", () => {
    render(
      <MainLayout>
        <div data-testid="no-title-content">No Title Content</div>
      </MainLayout>,
    );

    // 不应该有页面标题
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    // 内容应该直接渲染
    expect(screen.getByTestId("no-title-content")).toBeInTheDocument();
  });
});
