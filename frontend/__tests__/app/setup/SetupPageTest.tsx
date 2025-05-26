import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";

import Page from "@/app/setup/page";

// Mock server-auth - This should be at the top level
jest.mock("@/lib/server-auth", () => ({
  getAuthState: jest.fn(), // Basic mock, will be refined in beforeEach or tests
}));
const { getAuthState } = require("@/lib/server-auth"); // require after mock

// Using global mock for next/navigation from jest.setup.ts
// No local jest.mock("next/navigation", ...) here

// Using actual SetupContent component
// No local jest.mock("@/components/setup/SetupContent", ...) here

// Unskip the test suite
describe("SetupPage", () => {
  beforeEach(() => {
    // Clear all mocks to ensure test isolation
    jest.clearAllMocks();

    // Default mock implementation for getAuthState for most tests
    (getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      user: { id: "test-user", email: "test@example.com", token: "test-token" },
    });
  });

  it("应该渲染设置向导标题", async () => {
    // Page is now treated as a component that resolves getAuthState before rendering.
    // Since Page is async, we might need to await its resolution if tests depend on its async nature,
    // but Jest's render should handle the component lifecycle with mocked async parts.
    await act(async () => {
      render(await Page()); // Await the Server Component function call
    });

    expect(
      screen.getByRole("heading", { name: /设置向导/i }),
    ).toBeInTheDocument();
  });

  // Since we are now rendering the actual SetupContent, these tests become more meaningful.
  // We expect SetupContent to be rendered and its initial state (WelcomeStep) to be visible.

  it("应该渲染实际的SetupContent组件并显示欢迎信息", async () => {
    await act(async () => {
      render(await Page()); // Await the Server Component function call
    });

    // Check for elements from the actual SetupContent's WelcomeStep
    expect(screen.getByText("欢迎使用 Nexus")).toBeInTheDocument(); // From WelcomeStep in SetupContent
    expect(screen.getByText("直观的用户界面")).toBeInTheDocument(); // From WelcomeStep
    // Ensure the mocked SetupContent div is NOT present
    expect(screen.queryByTestId("setup-content")).not.toBeInTheDocument();
  });

  it("SetupContent 应该能够从全局mock中获取searchParams并正确显示扩展相关信息", async () => {
    // Ensure getAuthState is mocked to return isAuthenticated: true for this test path
    (getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      user: { id: "test-user", email: "test@example.com", token: "test-token" },
    });

    await act(async () => {
      render(await Page()); // Await the Server Component function call
    });

    expect(screen.getByText("欢迎使用 Nexus")).toBeInTheDocument();

    // Navigate through steps to reach the CompleteStep
    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    await act(async () => {}); // Ensure state updates are processed

    // Step 2 -> Step 3 (CompleteStep)
    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));
    await act(async () => {}); // Ensure state updates are processed

    // Now on the CompleteStep
    expect(screen.getByText("设置完成！")).toBeInTheDocument();

    // The global mock in jest.setup.ts provides "mocked_plugin_id_from_global_setup"
    // This should make `fromExtension` true in `CompleteStep` inside `SetupContent`
    expect(
      screen.getByText("您的浏览器扩展将自动配置，无需额外设置。"),
    ).toBeInTheDocument();
  });

  it("如果用户未认证，应重定向", async () => {
    // Override mock for this specific test case
    (getAuthState as jest.Mock).mockResolvedValue({ isAuthenticated: false });
    const { redirect } = require("next/navigation"); // Get the redirect mock

    // For Server Components that redirect, they might throw a specific error Next.js uses
    // or the render call itself might need to be caught if it throws due to redirect.
    // Or, if redirect is mocked effectively, the component might render null or specific content.
    // Let's assume the component execution path leads to calling redirect.
    try {
      await act(async () => {
        render(await Page()); // Await the Server Component function call
      });
    } catch (error) {
      // Next.js specific redirect errors might be caught here if not handled by mocks
      // console.log("Caught error during render for redirect test:", error);
    }

    expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=/setup");
  });
});
