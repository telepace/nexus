import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ContentLibraryPage from "@/app/content-library/page";
import { useAuth } from "@/lib/auth";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
  getCookie: jest.fn(),
}));

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
    });

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            type: "pdf",
            title: "Test Document",
            summary: "Test summary",
            user_id: "1",
            processing_status: "completed",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source_uri: "https://example.com/doc.pdf",
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
      expect(
        screen.queryByPlaceholderText("Search content..."),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Search")).not.toBeInTheDocument();
    });
  });

  it("should display Open Reader and Download buttons for content items", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    // Click on the content item to select it
    fireEvent.click(screen.getByText("Test Document"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /open reader/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download/i }),
      ).toBeInTheDocument();
    });
  });

  it("should navigate to reader page when Open Reader is clicked", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    // Click on the content item to select it
    fireEvent.click(screen.getByText("Test Document"));

    await waitFor(() => {
      const openReaderButton = screen.getByRole("button", {
        name: /open reader/i,
      });
      expect(openReaderButton).toBeInTheDocument();

      fireEvent.click(openReaderButton);
      expect(mockPush).toHaveBeenCalledWith("/content-library/reader/1");
    });
  });

  it("should display elegant layout without search filters", async () => {
    render(<ContentLibraryPage />);

    await waitFor(() => {
      // Should not have filter controls
      expect(screen.queryByText("All Types")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

      // Should have clean, elegant layout
      expect(screen.getByText("Content Library")).toBeInTheDocument();
    });
  });
});
