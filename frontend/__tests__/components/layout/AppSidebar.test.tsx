import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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

const renderSidebar = (mockOnAddContentClick?: jest.Mock) => {
  const mockOnSettingsClick = jest.fn();
  const defaultMockOnAddContentClick = mockOnAddContentClick || jest.fn();

  return {
    ...render(
      <SidebarProvider>
        <AppSidebar
          onSettingsClick={mockOnSettingsClick}
          onAddContentClick={defaultMockOnAddContentClick}
        />
      </SidebarProvider>,
    ),
    mockOnSettingsClick,
    mockOnAddContentClick: defaultMockOnAddContentClick,
  };
};

describe("AppSidebar", () => {
  it("renders the sidebar", () => {
    renderSidebar();
    expect(screen.getByText("Telepace")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    renderSidebar();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();
    expect(screen.getByText("Content Library")).toBeInTheDocument();
  });

  it("shows the active state for current route", () => {
    renderSidebar();

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("data-active", "true");
  });

  it("renders the logo div", () => {
    renderSidebar();

    const logoDiv = screen.getByText("Telepace").closest("div");
    expect(logoDiv).toBeInTheDocument();
  });

  it("renders user information", () => {
    renderSidebar();

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders upload content section", () => {
    renderSidebar();

    // 测试Upload Content按钮存在
    const uploadContentButtons = screen.getAllByText("Upload Content");
    expect(uploadContentButtons.length).toBeGreaterThan(0);
  });

  it("renders settings button", () => {
    renderSidebar();

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("calls onAddContentClick when Upload Content button is clicked", () => {
    const mockOnAddContentClick = jest.fn();
    renderSidebar(mockOnAddContentClick);

    const uploadContentButton = screen.getByText("Upload Content");
    fireEvent.click(uploadContentButton);

    expect(mockOnAddContentClick).toHaveBeenCalledTimes(1);
  });

  it("renders sidebar trigger button", () => {
    renderSidebar();

    // Find all buttons with "Toggle Sidebar" name and filter for the one with data-sidebar="trigger"
    const triggerButtons = screen.getAllByRole("button", {
      name: /toggle sidebar/i,
    });
    const headerTrigger = triggerButtons.find(
      (button) => button.getAttribute("data-sidebar") === "trigger",
    );

    expect(headerTrigger).toBeInTheDocument();
    expect(headerTrigger).toHaveAttribute("data-sidebar", "trigger");
  });
});
