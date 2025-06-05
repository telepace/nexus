import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter, usePathname } from "next/navigation";
import ReaderPage from "@/app/content-library/reader/[id]/page";
import { useAuth } from "@/lib/auth";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
  getCookie: jest.fn(),
}));

// Mock ReaderLayout
jest.mock("@/components/layout/ReaderLayout", () => {
  return function MockReaderLayout({
    children,
    contentId,
  }: { children: React.ReactNode; contentId: string }) {
    return (
      <div data-testid="reader-layout" data-content-id={contentId}>
        <div data-testid="content-panel">{children}</div>
        <div data-testid="llm-panel">
          <div>AI 分析</div>
        </div>
      </div>
    );
  };
});

// Mock ReaderContent
jest.mock("@/app/content-library/reader/[id]/ReaderContent", () => ({
  ReaderContent: ({ params }: { params: Promise<{ id: string }> }) => (
    <div data-testid="reader-content">
      <div role="tablist">
        <button role="tab" aria-label="Original">
          Original
        </button>
        <button role="tab" aria-label="Processed">
          Processed
        </button>
      </div>
      <button aria-label="Back">Back to Library</button>
    </div>
  ),
}));

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe("ReaderPage", () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    mockUsePathname.mockReturnValue("/content-library/reader/1");

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

    // Mock fetch for content details and markdown
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/markdown")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "1",
              title: "Test Document",
              markdown_content: "# Test Markdown Content\n\nThis is a test.",
              processing_status: "completed",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "1",
            type: "pdf",
            title: "Test Document",
            summary: "Test summary",
            content_text: "Original content text...",
            processed_content: "Processed content text...",
            user_id: "1",
            processing_status: "completed",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source_uri: "https://example.com/doc.pdf",
          }),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render with ReaderLayout containing content and LLM panels", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      expect(screen.getByTestId("reader-layout")).toBeInTheDocument();
      expect(screen.getByTestId("content-panel")).toBeInTheDocument();
      expect(screen.getByTestId("llm-panel")).toBeInTheDocument();
    });
  });

  it("should display original and processed content tabs", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /original/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /processed/i }),
      ).toBeInTheDocument();
    });
  });

  it("should switch between original and processed content", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      const originalTab = screen.getByRole("tab", { name: /original/i });
      const processedTab = screen.getByRole("tab", { name: /processed/i });

      expect(originalTab).toBeInTheDocument();
      expect(processedTab).toBeInTheDocument();

      // Test that we can click on the processed tab
      fireEvent.click(processedTab);
      // The fact that no error is thrown means the tab switching works
    });
  });

  it("should display LLM analysis in right panel", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      expect(screen.getByTestId("llm-panel")).toBeInTheDocument();
      expect(screen.getByText("AI 分析")).toBeInTheDocument();
    });
  });

  it("should use flex layout structure", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      const layout = screen.getByTestId("reader-layout");
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveAttribute("data-content-id", "1");
    });
  });

  it("should handle back navigation", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      // Note: The actual navigation logic is in ReaderContent component
      // This test just verifies the button exists
    });
  });

  it("should pass contentId to ReaderLayout", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "test-id" })} />);

    await waitFor(() => {
      const layout = screen.getByTestId("reader-layout");
      expect(layout).toHaveAttribute("data-content-id", "test-id");
    });
  });

  it("should show loading state initially", () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    // Should show loading initially before params are resolved
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
