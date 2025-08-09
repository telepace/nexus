import { render, screen, within, fireEvent } from "@/__tests__/test-utils";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
    expect(
      screen.getByRole("link", { name: "Logo Telepace" }),
    ).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    renderSidebar();

    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();
  });

  it("shows the active state for current route", () => {
    renderSidebar();

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveAttribute("data-active", "true");
  });

  it("renders the logo div", () => {
    renderSidebar();

    const logoLink = screen.getByRole("link", { name: "Logo Telepace" });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute("href", "/home");
  });

  it("renders user information", () => {
    renderSidebar();

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders upload content section", () => {
    renderSidebar();

    // 测试Add Content按钮存在
    const uploadButton = screen.getByText("Add Content");
    expect(uploadButton).toBeInTheDocument();
  });

  it("calls onAddContentClick when Add Content button is clicked", () => {
    const mockOnAddContentClick = jest.fn();
    renderSidebar(mockOnAddContentClick);

    const uploadButton = screen.getByText("Add Content");
    fireEvent.click(uploadButton);

    expect(mockOnAddContentClick).toHaveBeenCalledTimes(1);
  });

  it("renders sidebar toggle button", () => {
    renderSidebar();

    // Look for the toggle button which should contain an icon (chevron or panel)
    const toggleButtons = screen.getAllByRole("button");
    const sidebarToggle = toggleButtons.find(button => 
      button.querySelector('svg') && 
      (button.querySelector('.lucide-panel-left-close') || 
       button.querySelector('.lucide-chevron-left') ||
       button.querySelector('.lucide-chevron-right') ||
       button.querySelector('.lucide-panel-left-open'))
    );

    expect(sidebarToggle).toBeInTheDocument();
  });
});
