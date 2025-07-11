import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePathname } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      full_name: "Test User",
      email: "test@example.com",
      avatar_url: null,
    },
  }),
}));

// Mock logout action
jest.mock("@/components/actions/logout-action", () => ({
  logout: jest.fn(),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} />
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
    (usePathname as jest.Mock).mockReturnValue("/home");
  });

  it("应该正确渲染MainLayout和所有子组件", () => {
    render(
      <MainLayout pageTitle="Test Page">
        <div data-testid="page-content">Page Content</div>
      </MainLayout>,
    );

    // 检查sidebar是否渲染
    expect(screen.getByRole("link", { name: "Telepace" })).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();

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
    expect(screen.getByRole("link", { name: "Telepace" })).toBeInTheDocument();

    // 检查内容直接渲染，没有容器包装
    expect(screen.getByTestId("fullscreen-content")).toBeInTheDocument();

    // 不应该有页面标题
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("应该在不同路由下正确显示导航状态", () => {
    // 模拟在非当前路由的情况
    (usePathname as jest.Mock).mockReturnValue("/content-library");

    render(<MainLayout>Content</MainLayout>);

    // 检查Home导航项不是激活状态
    const allHomeElements = screen.getAllByText("Home");
    expect(allHomeElements.length).toBeGreaterThan(0);

    const homeLink = allHomeElements[0].closest("a");
    if (homeLink) {
      // 在非home路由下，home链接不应该有激活状态
      expect(homeLink).toHaveAttribute("data-active", "false");
    }
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
