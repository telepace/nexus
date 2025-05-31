"use client"; // Required for useParams and useEffect/useState

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharedContentPage from "./page"; // Default export from page.tsx
import { client } from "@/app/openapi-client/index";
import { ContentItemPublic } from "@/app/openapi-client/sdk.gen";
import { Toaster } from "@/components/ui/sonner";

// Mock Next.js navigation (useParams)
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

// Mock the API client
jest.mock("@/app/openapi-client/index", () => ({
  client: {
    getSharedContentShareTokenGet: jest.fn(),
  },
}));

// Mock MarkdownRenderer as its internals are tested separately
jest.mock("@/components/ui/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="mock-markdown-renderer">{content}</div>,
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
    (client.getSharedContentShareTokenGet as jest.Mock).mockReset();
    (require("next/navigation").useParams as jest.Mock).mockReset();
  });

  const mockUseParams = (token?: string) => {
    (require("next/navigation").useParams as jest.Mock).mockReturnValue({ token });
  };

  it("renders loading state initially", () => {
    mockUseParams("test-token");
    (client.getSharedContentShareTokenGet as jest.Mock).mockReturnValue(new Promise(() => {})); // Pending promise
    render(<SharedContentPage />);
    expect(screen.getByText(/Loading shared content.../i)).toBeInTheDocument();
  });

  it("fetches and renders content successfully", async () => {
    mockUseParams("test-token");
    (client.getSharedContentShareTokenGet as jest.Mock).mockResolvedValueOnce(mockSuccessData);
    render(<SharedContentPage />);

    await waitFor(() => {
      expect(client.getSharedContentShareTokenGet).toHaveBeenCalledWith("test-token", { password: undefined });
    });
    await waitFor(() => {
      expect(screen.getByText(mockSuccessData.title!)).toBeInTheDocument();
      expect(screen.getByTestId("mock-markdown-renderer")).toHaveTextContent(mockSuccessData.content_text!);
    });
  });

  it("displays password prompt if API returns 401 'Password required'", async () => {
    mockUseParams("test-token");
    (client.getSharedContentShareTokenGet as jest.Mock).mockRejectedValueOnce({
      status: 401,
      data: { detail: "Password required" }, // Structure based on component's error handling
    });
    render(<><SharedContentPage /><Toaster/></>); // Toaster for potential error toasts

    await waitFor(() => {
      expect(screen.getByText(/Password Required/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
  });

  it("submits password and fetches content if correct", async () => {
    const user = userEvent.setup();
    mockUseParams("test-token-pw");
    // First call: password required
    (client.getSharedContentShareTokenGet as jest.Mock).mockRejectedValueOnce({
      status: 401,
      data: { detail: "Password required" },
    });

    render(<><SharedContentPage /><Toaster/></>);

    await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());

    // Second call (after password submission): success
    (client.getSharedContentShareTokenGet as jest.Mock).mockResolvedValueOnce(mockSuccessData);

    await user.type(screen.getByLabelText(/Password/i), "secret");
    fireEvent.click(screen.getByRole("button", { name: /Unlock Content/i }));

    await waitFor(() => {
      expect(client.getSharedContentShareTokenGet).toHaveBeenCalledTimes(2); // Initial + password attempt
      expect(client.getSharedContentShareTokenGet).toHaveBeenCalledWith("test-token-pw", { password: "secret" });
    });
    await waitFor(() => {
      expect(screen.getByText(mockSuccessData.title!)).toBeInTheDocument();
    });
  });

   it("displays error if submitted password is incorrect", async () => {
    const user = userEvent.setup();
    mockUseParams("test-token-wrong-pw");
    (client.getSharedContentShareTokenGet as jest.Mock)
      .mockRejectedValueOnce({ status: 401, data: { detail: "Password required" } }) // First call
      .mockRejectedValueOnce({ status: 403, data: { detail: "Incorrect password" } }); // Second call

    render(<><SharedContentPage /><Toaster/></>);
    await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Password/i), "wrongsecret");
    fireEvent.click(screen.getByRole("button", { name: /Unlock Content/i }));

    await waitFor(() => {
        expect(screen.getByText(/Incorrect password. Please try again./i)).toBeInTheDocument();
    });
  });

  it("displays error for invalid token (404)", async () => {
    mockUseParams("invalid-token");
    (client.getSharedContentShareTokenGet as jest.Mock).mockRejectedValueOnce({
      status: 404,
      data: { detail: "Share link not found, expired, or access limit reached." },
    });
    render(<><SharedContentPage /><Toaster/></>);
    await waitFor(() => {
      expect(screen.getByText(/Error Accessing Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Share link not found, expired, or access limit reached./i)).toBeInTheDocument();
    });
  });

  it("displays generic error for other API failures", async () => {
    mockUseParams("error-token");
    (client.getSharedContentShareTokenGet as jest.Mock).mockRejectedValueOnce({
      status: 500,
      data: { detail: "Server error" },
    });
     render(<><SharedContentPage /><Toaster/></>);
    await waitFor(() => {
      expect(screen.getByText(/Error Accessing Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });

   it("handles missing token in URL", () => {
    mockUseParams(undefined); // No token
    render(<SharedContentPage />);
    expect(screen.getByText(/Error Accessing Content/i)).toBeInTheDocument();
    expect(screen.getByText(/Share token is missing in URL./i)).toBeInTheDocument();
  });

});
