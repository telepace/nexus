import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SetupPage from "@/app/setup/page";

// 模拟next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  redirect: jest.fn(),
}));

// 模拟认证状态检查
jest.mock("@/lib/server-auth", () => ({
  getAuthState: jest.fn().mockResolvedValue({ isAuthenticated: false }),
}));

describe("SetupPage", () => {
  it("应该渲染设置向导标题", async () => {
    render(await SetupPage());

    expect(
      screen.getByRole("heading", { name: /设置向导/i }),
    ).toBeInTheDocument();
  });

  it("应该显示多步骤进度指示器", async () => {
    render(await SetupPage());

    expect(screen.getByTestId("setup-stepper")).toBeInTheDocument();
  });

  it("应该在第一页显示欢迎信息", async () => {
    render(await SetupPage());

    expect(screen.getByText(/欢迎使用/i)).toBeInTheDocument();
  });

  it("应该能够导航到下一步", async () => {
    render(await SetupPage());

    fireEvent.click(screen.getByRole("button", { name: /下一步/i }));

    await waitFor(() => {
      expect(screen.getByText(/个性化设置/i)).toBeInTheDocument();
    });
  });
});
