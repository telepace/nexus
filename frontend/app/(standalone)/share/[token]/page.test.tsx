"use contentApi"; // Required for useParams and useEffect/useState

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharedContentPage from "./page"; // Default export from page.tsx
import { contentApi } from "@/lib/api/content";
import { Toaster } from "@/components/ui/sonner";
import { useParams } from "next/navigation";

// 临时定义缺失的类型
interface ContentItemPublic {
  id: string;
  title: string;
  content?: string;
  content_text?: string;
  user_id?: string;
  type?: string;
  processing_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Mock Next.js navigation (useParams)
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

// Mock the API contentApi
jest.mock("@/lib/api/content", () => ({
  contentApi: {
    getSharedContent: jest.fn(),
  },
}));

// Mock ShareMarkdownRenderer as its internals are tested separately
jest.mock("@/components/ui/ShareMarkdownRenderer", () => ({
  ShareMarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="mock-markdown-renderer">{content}</div>
  ),
}));

const mockSuccessData: ContentItemPublic = {
  id: "content-123",
  title: "Shared Content Title",
  content_text: "# Hello Shared World\nThis is shared content.",
  user_id: "user-xyz",
  type: "text",
  processing_status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("SharedContentPage", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockReset();
    (useParams as jest.Mock).mockReset();
  });

  const mockUseParams = (token?: string) => {
    (useParams as jest.Mock).mockReturnValue({
      token,
    });
  };

  it("renders loading state initially", () => {
    mockUseParams("test-token");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    ); // Pending promise
    render(<SharedContentPage />);
    expect(screen.getByText("正在加载内容")).toBeInTheDocument();
  });

  it("fetches and renders content successfully", async () => {
    mockUseParams("test-token");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockResolvedValueOnce(
      mockSuccessData,
    );
    render(<SharedContentPage />);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((contentApi as any).getSharedContent).toHaveBeenCalledWith(
        "test-token",
        undefined,
      );
    });
    await waitFor(() => {
      expect(screen.getByText(mockSuccessData.title!)).toBeInTheDocument();
      expect(screen.getByTestId("mock-markdown-renderer")).toBeInTheDocument();
      expect(screen.getByTestId("mock-markdown-renderer")).toHaveTextContent(
        "# Hello Shared World This is shared content.",
      );
    });
  });

  it("displays password prompt if API returns 401 'Password required'", async () => {
    mockUseParams("test-token");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockRejectedValueOnce({
      status: 401,
      data: { detail: "Password required" }, // Structure based on component's error handling
    });
    render(
      <>
        <SharedContentPage />
        <Toaster />
      </>,
    ); // Toaster for potential error toasts

    await waitFor(
      () => {
        expect(screen.getByText("需要访问密码")).toBeInTheDocument();
        expect(document.getElementById("password")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  }, 20000);

  it("submits password and fetches content if correct", async () => {
    const user = userEvent.setup();
    mockUseParams("test-token-pw");

    // Clear previous mocks and set up new sequence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockClear();

    // First call: password required
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockRejectedValueOnce({
      status: 401,
      data: { detail: "Password required" },
    });

    render(
      <>
        <SharedContentPage />
        <Toaster />
      </>,
    );

    await waitFor(() =>
      expect(document.getElementById("password")).toBeInTheDocument(),
    );

    // Second and third calls: success
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock)
      .mockResolvedValueOnce(mockSuccessData)
      .mockResolvedValueOnce(mockSuccessData);

    const passwordInput = document.getElementById(
      "password",
    ) as HTMLInputElement;
    await user.type(passwordInput, "secret");
    fireEvent.click(screen.getByRole("button", { name: "解锁内容" }));

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((contentApi as any).getSharedContent).toHaveBeenCalledTimes(3); // Initial + password attempt + useEffect re-trigger
    });

    await waitFor(
      () => {
        expect(screen.getByText(mockSuccessData.title!)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("displays error if submitted password is incorrect", async () => {
    const user = userEvent.setup();
    mockUseParams("test-token-wrong-pw");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock)
      .mockRejectedValueOnce({
        status: 401,
        data: { detail: "Password required" },
      }) // First call
      .mockRejectedValueOnce({
        status: 403,
        data: { detail: "Incorrect password" },
      }); // Second call

    render(
      <>
        <SharedContentPage />
        <Toaster />
      </>,
    );
    await waitFor(() =>
      expect(document.getElementById("password")).toBeInTheDocument(),
    );

    const passwordInput = document.getElementById(
      "password",
    ) as HTMLInputElement;
    await user.type(passwordInput, "wrongsecret");
    fireEvent.click(screen.getByRole("button", { name: "解锁内容" }));

    await waitFor(() => {
      expect(screen.getByText("密码错误，请重试")).toBeInTheDocument();
    });
  });

  it("displays error for invalid token (404)", async () => {
    mockUseParams("invalid-token");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockRejectedValueOnce({
      status: 404,
      data: {
        detail: "Share link not found, expired, or access limit reached.",
      },
    });
    render(
      <>
        <SharedContentPage />
        <Toaster />
      </>,
    );
    await waitFor(() => {
      expect(screen.getByText("无法访问内容")).toBeInTheDocument();
      expect(
        screen.getByText("分享链接不存在、已过期或访问次数已达上限"),
      ).toBeInTheDocument();
    });
  });

  it("displays generic error for other API failures", async () => {
    mockUseParams("error-token");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((contentApi as any).getSharedContent as jest.Mock).mockRejectedValueOnce({
      status: 500,
      data: { detail: "Server error" },
    });
    render(
      <>
        <SharedContentPage />
        <Toaster />
      </>,
    );
    await waitFor(() => {
      expect(screen.getByText("无法访问内容")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("handles missing token in URL", () => {
    mockUseParams(undefined); // No token
    render(<SharedContentPage />);
    expect(screen.getByText("无法访问内容")).toBeInTheDocument();
    expect(screen.getByText("分享链接缺失")).toBeInTheDocument();
  });
});
