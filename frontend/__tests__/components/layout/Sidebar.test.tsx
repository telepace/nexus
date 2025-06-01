import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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

// Helper function to render AppSidebar with SidebarProvider
const renderAppSidebar = () => {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
};

describe("AppSidebar", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
  });

  it("应该正确渲染侧边栏和所有导航项", () => {
    renderAppSidebar();

    // 检查logo和品牌名称
    expect(screen.getByAltText("Nexus Logo")).toBeInTheDocument();
    expect(screen.getByText("Nexus")).toBeInTheDocument();

    // 检查所有导航项
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();
    expect(screen.getByText("Content Library")).toBeInTheDocument();
  });

  it("应该正确显示导航链接", () => {
    renderAppSidebar();

    // 检查导航链接的href属性
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const favoritesLink = screen.getByText("Favorites").closest("a");
    const promptsLink = screen.getByText("Prompts").closest("a");
    const contentLibraryLink = screen.getByText("Content Library").closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(favoritesLink).toHaveAttribute("href", "/favorites");
    expect(promptsLink).toHaveAttribute("href", "/prompts");
    expect(contentLibraryLink).toHaveAttribute("href", "/content-library");
  });

  it("应该高亮显示当前路径对应的导航项", () => {
    (usePathname as jest.Mock).mockReturnValue("/prompts");
    renderAppSidebar();

    // 获取导航链接的父元素（SidebarMenuButton）
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const promptsLink = screen.getByText("Prompts").closest("a");

    // 验证当前页面的链接有active状态
    expect(promptsLink).toHaveAttribute("data-active", "true");
    expect(dashboardLink).toHaveAttribute("data-active", "false");
  });

  it("应该为不同路径正确设置激活状态", () => {
    (usePathname as jest.Mock).mockReturnValue("/content-library");
    renderAppSidebar();

    const contentLibraryLink = screen.getByText("Content Library").closest("a");
    const dashboardLink = screen.getByText("Dashboard").closest("a");

    expect(contentLibraryLink).toHaveAttribute("data-active", "true");
    expect(dashboardLink).toHaveAttribute("data-active", "false");
  });

  it("logo链接应该指向首页", () => {
    renderAppSidebar();

    const logoLink = screen.getByAltText("Nexus Logo").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });
});
