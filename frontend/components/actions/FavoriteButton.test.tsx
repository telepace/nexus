import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FavoriteButton } from "./FavoriteButton";
import { getCookie } from "@/lib/utils";

// Mock fetch
global.fetch = jest.fn();

// Mock getCookie from utils
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  getCookie: jest.fn(),
}));

// Mock the useFavorites hook
const mockUseFavorites = {
  data: [],
  mutate: jest.fn(),
  isLoading: false,
  error: null,
};

jest.mock("@/lib/hooks/useFavorites", () => ({
  useFavorites: () => mockUseFavorites,
}));

describe("FavoriteButton", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();
  const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    (fetch as jest.Mock).mockClear();
    mockUseFavorites.mutate.mockClear();
    mockGetCookie.mockReturnValue("mock-token");
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it("renders unfavorited state correctly", () => {
    mockUseFavorites.data = [];

    renderWithProviders(<FavoriteButton itemId="test-item-1" />);

    const button = screen.getByRole("button", { name: /favorite/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Favorite");
  });

  it("renders favorited state correctly", () => {
    mockUseFavorites.data = ["test-item-1"];

    renderWithProviders(<FavoriteButton itemId="test-item-1" />);

    const button = screen.getByRole("button", { name: /unfavorite/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Unfavorite");
  });

  it("calls add favorite API when clicking unfavorited item", async () => {
    mockUseFavorites.data = [];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    renderWithProviders(<FavoriteButton itemId="test-item-1" />);

    const button = screen.getByRole("button", { name: /favorite/i });
    await user.click(button);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/content/test-item-1/favorite",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(mockUseFavorites.mutate).toHaveBeenCalled();
  });

  it("calls remove favorite API when clicking favorited item", async () => {
    mockUseFavorites.data = ["test-item-1"];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    renderWithProviders(<FavoriteButton itemId="test-item-1" />);

    const button = screen.getByRole("button", { name: /unfavorite/i });
    await user.click(button);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/content/test-item-1/favorite",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(mockUseFavorites.mutate).toHaveBeenCalled();
  });

  it("handles API errors gracefully", async () => {
    mockUseFavorites.data = [];
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    renderWithProviders(<FavoriteButton itemId="test-item-1" />);

    const button = screen.getByRole("button", { name: /favorite/i });
    await user.click(button);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to toggle favorite:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("applies custom className", () => {
    mockUseFavorites.data = [];

    renderWithProviders(
      <FavoriteButton itemId="test-item-1" className="custom-class" />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("renders different sizes correctly", () => {
    mockUseFavorites.data = [];

    const { rerender } = renderWithProviders(
      <FavoriteButton itemId="test-item-1" size="sm" />,
    );

    let button = screen.getByRole("button");
    expect(button).toHaveClass("h-8", "w-8");

    rerender(
      <QueryClientProvider client={queryClient}>
        <FavoriteButton itemId="test-item-1" size="lg" />
      </QueryClientProvider>,
    );

    button = screen.getByRole("button");
    expect(button).toHaveClass("h-12", "w-12");
  });
});
