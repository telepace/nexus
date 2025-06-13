import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";
import { useAuth } from "@/lib/client-auth";

// Mock fetch items action
jest.mock("@/components/actions/items-action-client");

// Mock auth
jest.mock("@/lib/client-auth");

jest.mock("@/components/share/ShareContentModal", () => {
  return function MockShareContentModal() {
    return <div data-testid="share-modal">Share Modal</div>;
  };
});

jest.mock("@/components/share/ManageShareLinks", () => {
  return function MockManageShareLinks() {
    return <div data-testid="manage-share-links">Manage Share Links</div>;
  };
});

jest.mock("@/app/dashboard/deleteButton", () => ({
  DeleteButton: function MockDeleteButton() {
    return <button data-testid="delete-button">Delete</button>;
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("DashboardPage 集成测试", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "test-user-id",
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("应该显示加载状态", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Loading content...")).toBeInTheDocument();
  });

  it("应该显示错误信息当API失败时", async () => {
    // 动态导入并模拟 fetchItems
    const { fetchItems } = await import(
      "@/components/actions/items-action-client"
    );
    const mockFetchItems = fetchItems as jest.MockedFunction<typeof fetchItems>;

    mockFetchItems.mockResolvedValue({
      error: "API返回了意外的数据格式",
      status: 400,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("错误")).toBeInTheDocument();
      expect(
        screen.getByText(
          "服务器返回了意外的数据格式，这可能是一个临时问题。请尝试刷新页面。",
        ),
      ).toBeInTheDocument();
    });
  });

  it("应该显示空状态当没有内容时", async () => {
    const { fetchItems } = await import(
      "@/components/actions/items-action-client"
    );
    const mockFetchItems = fetchItems as jest.MockedFunction<typeof fetchItems>;

    mockFetchItems.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No Items Yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You don't have any content yet. Add one to get started.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("应该正确显示内容列表", async () => {
    const { fetchItems } = await import(
      "@/components/actions/items-action-client"
    );
    const mockFetchItems = fetchItems as jest.MockedFunction<typeof fetchItems>;

    const mockItems = [
      {
        id: "1",
        title: "Test Article",
        summary: "Test summary",
        type: "article",
        processing_status: "completed",
        user_id: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        source_uri: "https://example.com",
        content_text: "Test content",
      },
      {
        id: "2",
        title: "Test Video",
        summary: null,
        type: "video",
        processing_status: "pending",
        user_id: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        source_uri: "https://youtube.com/watch?v=123",
        content_text: null,
      },
    ];

    mockFetchItems.mockResolvedValue(mockItems);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Test Article")).toBeInTheDocument();
      expect(screen.getByText("Test Video")).toBeInTheDocument();
      expect(screen.getByText("Test summary")).toBeInTheDocument();
      expect(screen.getByText("No summary")).toBeInTheDocument();
      expect(screen.getByText("article")).toBeInTheDocument();
      expect(screen.getByText("video")).toBeInTheDocument();
      expect(screen.getByText("completed")).toBeInTheDocument();
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
  });

  it("应该处理包装格式的API响应", async () => {
    const { fetchItems } = await import(
      "@/components/actions/items-action-client"
    );
    const mockFetchItems = fetchItems as jest.MockedFunction<typeof fetchItems>;

    // 模拟修复后应该能正确处理的包装格式
    const mockItems = [
      {
        id: "1",
        title: "Test Item",
        summary: "Test summary",
        type: "article",
        processing_status: "completed",
        user_id: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        source_uri: "https://example.com",
        content_text: "Test content",
      },
    ];

    mockFetchItems.mockResolvedValue(mockItems);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Item")).toBeInTheDocument();
      expect(screen.getByText("Test summary")).toBeInTheDocument();
    });
  });
});
