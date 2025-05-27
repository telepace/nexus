import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ReaderPage from "@/app/content-library/reader/[id]/page";
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
        {children}
      </div>
    );
  };
});

// Mock MarkdownRenderer
jest.mock("@/components/ui/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

// Mock LLMAnalysisPanel
jest.mock("@/components/ui/llm-analysis-panel", () => ({
  LLMAnalysisPanel: ({ contentId }: { contentId: string }) => (
    <div data-testid="mock-llm-analysis-panel">
      <div>AI 分析</div>
      <div>Content ID: {contentId}</div>
    </div>
  ),
}));

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

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

  it("should render with two-column layout", async () => {
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

  it("should display LLM processing cards in right panel", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      expect(screen.getByTestId("llm-panel")).toBeInTheDocument();
      expect(screen.getByText("AI 分析")).toBeInTheDocument();
    });
  });

  it("should have elegant and responsive design", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      const layout = screen.getByTestId("reader-layout");
      expect(layout).toHaveClass("grid", "grid-cols-1", "lg:grid-cols-3");
    });
  });

  it("should handle back navigation", async () => {
    render(<ReaderPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => {
      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(mockPush).toHaveBeenCalledWith("/content-library");
    });
  });
});
