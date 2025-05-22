import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";

import Page from "@/app/login/page";
import { login } from "@/components/actions/login-action";

// 模拟 login 函数
jest.mock("@/components/actions/login-action", () => ({
  login: jest.fn(),
}));

// 模拟 window.fetch
window.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ access_token: "fake-token" }),
  }),
);

describe("Login Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with username and password input and submit button", () => {
    render(<Page />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^登录$/i })).toBeInTheDocument();
  });

  it("submits form with correct data", async () => {
    // Mock the fetch implementation directly
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: "fake-token" }),
      }),
    );

    render(<Page />);

    const usernameInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole("button", { name: /^登录$/i });

    // 填写表单
    await act(async () => {
      fireEvent.change(usernameInput, {
        target: { value: "testuser@example.com" },
      });
      fireEvent.change(passwordInput, { target: { value: "#123176a@" } });
      fireEvent.click(submitButton);
    });

    // 验证 fetch 调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("handles login failure", async () => {
    // Mock fetch to return an error response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: "LOGIN_BAD_CREDENTIALS" }),
      }),
    );

    render(<Page />);

    const usernameInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole("button", { name: /^登录$/i });

    // 填写表单并提交
    await act(async () => {
      fireEvent.change(usernameInput, {
        target: { value: "wrong@example.com" },
      });
      fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
      fireEvent.click(submitButton);
    });

    // 验证 fetch 调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("handles server errors", async () => {
    // Mock fetch to throw an error
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error("Network error");
    });

    render(<Page />);

    const usernameInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole("button", { name: /^登录$/i });

    // 填写表单并提交
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: "test@test.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    // 验证 fetch 调用被触发
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
