import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ReaderPage from "@/app/(withSidebar)/content-library/reader/[id]/page";
import { useAuth } from "@/lib/client-auth";
import { useRouter, usePathname } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock client auth
jest.mock("@/lib/client-auth", () => ({
  useAuth: jest.fn(),
  getCookie: jest.fn(),
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: jest.fn(() => ({ value: "mock-token" })),
    }),
  ),
}));

// Mock ReaderLayout
jest.mock("@/components/layout/ReaderLayout", () => {
  return function MockReaderLayout({
    children,
    contentId,
  }: { children: React.ReactNode; contentId: string; contentText: string }) {
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

// Mock ClientContent
jest.mock(
  "@/app/(withSidebar)/content-library/reader/[id]/ClientContent",
  () => ({
    ClientContent: ({
      contentId,
    }: { contentId: string; initialData?: any; initialMarkdown?: any }) => (
      <div data-testid="client-content">
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
  }),
);

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
      fetchUser: jest.fn(),
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

  it("should render with ReaderLayout containing content", async () => {
    // For async server components, we need to await the component
    const ReaderPageComponent = await ReaderPage({
      params: Promise.resolve({ id: "1" }),
    });
    render(ReaderPageComponent);

    expect(screen.getByTestId("reader-layout")).toBeInTheDocument();
    expect(screen.getByTestId("content-panel")).toBeInTheDocument();
    expect(screen.getByTestId("llm-panel")).toBeInTheDocument();
  });

  it("should display client content", async () => {
    const ReaderPageComponent = await ReaderPage({
      params: Promise.resolve({ id: "1" }),
    });
    render(ReaderPageComponent);

    expect(screen.getByTestId("client-content")).toBeInTheDocument();
  });

  it("should pass contentId to ReaderLayout", async () => {
    const ReaderPageComponent = await ReaderPage({
      params: Promise.resolve({ id: "test-id" }),
    });
    render(ReaderPageComponent);

    const layout = screen.getByTestId("reader-layout");
    expect(layout).toHaveAttribute("data-content-id", "test-id");
  });
});
