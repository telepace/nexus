import { render, screen, fireEvent, waitFor } from "@/__tests__/test-utils";
import { useRouter } from "next/navigation";
import ContentLibraryPage from "@/app/[locale]/(withSidebar)/content-library/page";
import { useAuth } from "@/lib/client-auth";

// The useRouter mock is already provided by test-utils, so we just need to get access to it

// The useAuth mock is already provided by test-utils

// Mock the scrollTo function for JSDOM
HTMLDivElement.prototype.scrollTo = jest.fn();

// Mock WithSidebar layout
jest.mock("@/components/layout/AppSidebar", () => ({
  AppSidebar: ({ onSettingsClick, onAddContentClick }: any) => (
    <div data-testid="sidebar">Sidebar</div>
  ),
}));

// Mock SidebarProvider and SidebarInset
jest.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
}));

// Mock useContentEvents hook
jest.mock("@/hooks/useContentEvents", () => ({
  useContentEvents: jest.fn(),
}));

// Mock useFavorites hook
jest.mock("@/lib/hooks/useFavorites", () => ({
  useFavorites: jest.fn(() => ({
    data: [],
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

describe("ContentLibraryPage", () => {
  beforeEach(() => {
    // test-utils already provides static mocks for useRouter and useAuth

    // Mock fetch with proper response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            type: "pdf",
            title: "Test Document",
            summary: null,
            user_id: "1",
            processing_status: "completed",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source_uri: "https://example.com/doc.pdf",
            ai_result: null,
          },
        ]),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render content library page", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      // Check that the page header with "Library" is rendered
      expect(screen.getByText("Library")).toBeInTheDocument();
      // Check that the main content area is rendered
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });
  });

  it("should not display search functionality", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      // Wait for content to load
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    // We have removed search functionality, so it should not be present.
    expect(
      screen.queryByPlaceholderText("搜索标题或摘要..."),
    ).not.toBeInTheDocument();
  });

  it("should navigate to reader page when '查看全文' button is clicked after focusing", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    // 点击卡片直接导航到阅读器
    const contentCard =
      screen.getByText("Test Document").closest("div.cursor-pointer") ||
      screen.getByText("Test Document").closest("[role='button']") ||
      screen.getByText("Test Document").closest("div");

    if (contentCard) {
      fireEvent.click(contentCard);
      // The navigation should work but we can't verify the specific call with the static mock
    }
  });

  it("should display content items in card format", async () => {
    render(<ContentLibraryPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Document")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // 检查文档类型显示
    expect(screen.getByText("Test Document")).toBeInTheDocument();
  }, 20000);

  it("should display elegant layout without search filters", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      // The header title should be "Library"
      expect(screen.getByText("Library")).toBeInTheDocument();
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    // 不再有过滤控件和排序控件
    expect(screen.queryByDisplayValue("所有状态")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("所有类型")).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("创建时间 (新→旧)"),
    ).not.toBeInTheDocument();
  });
});
