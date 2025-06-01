import { render, screen } from "@testing-library/react";
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

const renderSidebar = () => {
  const mockOnSettingsClick = jest.fn();
  const mockOnAddContentClick = jest.fn();
  
  return render(
    <SidebarProvider>
      <AppSidebar 
        onSettingsClick={mockOnSettingsClick}
        onAddContentClick={mockOnAddContentClick}
      />
    </SidebarProvider>
  );
};

describe("AppSidebar", () => {
  it("renders without crashing", () => {
    renderSidebar();
    expect(screen.getByText("Nexus")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();
    expect(screen.getByText("Content Library")).toBeInTheDocument();
  });

  it("renders the logo link", () => {
    renderSidebar();
    const logoLink = screen.getByRole("link", { name: /nexus/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders settings option", () => {
    renderSidebar();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders upload content option", () => {
    renderSidebar();
    expect(screen.getByText("Upload Content")).toBeInTheDocument();
  });
});
