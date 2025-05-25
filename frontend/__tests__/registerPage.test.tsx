import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";
import React from "react";

import Page from "@/app/register/page";
import { register } from "@/components/actions/register-action";

// 使用 jest.mock 模拟整个模块
jest.mock("@/components/actions/register-action", () => ({
  register: jest.fn().mockResolvedValue({}),
}));

// 模拟重定向和路由
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

// 模拟认证状态
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

// 模拟Google登录
jest.mock("@/components/actions/google-auth-action", () => ({
  initiateGoogleLogin: jest.fn(),
}));

describe("Register Page", () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    (register as jest.Mock).mockClear();
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders form with email, password, and submit button", () => {
    render(<Page />);

    // 验证姓名字段
    expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument();
    // 验证邮箱字段
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    // 验证注册按钮
    expect(screen.getByRole("button", { name: /^注册$/i })).toBeInTheDocument();
  });

  // Unskip this test and fix assertions
  it("calls register server action with form data when submitted", async () => {
    render(<Page />);

    const nameInput = screen.getByLabelText(/姓名/i);
    const emailInput = screen.getByLabelText(/邮箱/i); // Using getByLabelText for better accessibility
    const passwordInput = screen.getByLabelText(/密码/i);
    const submitButton = screen.getByRole("button", { name: /^注册$/i }); // Corrected selector

    // Fill out the form
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Test User" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify the register server action (mocked) was called
    expect(register).toHaveBeenCalledTimes(1);

    // Verify it was called with the correct FormData or an object matching it.
    // Server actions receive FormData. We can check the structure.
    expect(register).toHaveBeenCalledWith(
      expect.any(FormData), // Or expect.anything() if details are complex or less important for this test
    );

    // If you need to check specific form data values:
    const lastCallArgs = (register as jest.Mock).mock.calls[0][0] as FormData;
    expect(lastCallArgs.get("full_name")).toBe("Test User");
    expect(lastCallArgs.get("email")).toBe("test@example.com");
    expect(lastCallArgs.get("password")).toBe("Password123!");

    // DO NOT expect global.fetch to have been called directly by component logic
    // expect(global.fetch).toHaveBeenCalled(); // This was the incorrect expectation
  });

  // Keep other skipped tests as they are, focus on the fetch issue first
  it.skip("displays server validation error", async () => {
    // 模拟服务器验证错误
    (register as jest.Mock).mockResolvedValueOnce({
      server_validation_error: "User already exists",
    });

    render(<Page />);

    // 填写表单并提交
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: "already@exists.com" } });
      fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: "Password123!" } });
      fireEvent.click(screen.getByRole("button", { name: /^注册$/i })); // Corrected selector
    });

    // 验证错误消息显示
    expect(await screen.findByText("User already exists")).toBeInTheDocument();
  });

  // Keep other skipped tests as they are
  it.skip("displays form validation errors", async () => {
    // 模拟表单验证错误
    (register as jest.Mock).mockResolvedValueOnce({
      errors: {
        email: ["请输入有效的电子邮件地址"],
        password: ["密码至少需要8个字符"],
      },
    });

    render(<Page />);

    // 填写表单并提交
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: "invalid@email.com" } });
      fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: "password" } });
      fireEvent.click(screen.getByRole("button", { name: /^注册$/i })); // Corrected selector
    });

    // 验证错误消息显示
    expect(
      await screen.findByText("请输入有效的电子邮件地址"),
    ).toBeInTheDocument();
    expect(await screen.findByText("密码至少需要8个字符")).toBeInTheDocument();
  });

  it("renders Google login button", () => {
    render(<Page />);

    expect(screen.getByText(/使用 Google 账号/i)).toBeInTheDocument();
  });
});
