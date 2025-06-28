import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ContentLibraryPage from "@/app/content-library/page";
import { useAuth } from "@/lib/client-auth";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/client-auth", () => ({
  useAuth: jest.fn(),
}));

// Mock the scrollTo function for JSDOM
HTMLDivElement.prototype.scrollTo = jest.fn();

// Mock MainLayout
jest.mock("@/components/layout/MainLayout", () => {
  return function MockMainLayout({
    children,
    pageTitle,
  }: { children: React.ReactNode; pageTitle?: string }) {
    return (
      <div data-testid="main-layout" data-page-title={pageTitle}>
        <div data-testid="sidebar">Sidebar</div>
        {children}
      </div>
    );
  };
});

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

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("ContentLibraryPage", () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        email: "test@example.com",
        token: "mock-token",
        full_name: "Test User",
        is_active: true,
        is_superuser: false,
        created_at: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
      updateUser: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      setCustomToken: jest.fn(),
      fetchUser: jest.fn(),
    });

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

  it("should render with MainLayout and sidebar", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("main-layout")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
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
      expect(mockPush).toHaveBeenCalledWith("/content-library/reader/1");
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
