import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { act } from "react";

import Page from "@/app/password-recovery/confirm/page";
import { passwordResetConfirm } from "@/components/actions/password-reset-action";
import { useSearchParams, notFound, useRouter } from "next/navigation";
import { ReactNode } from "react";

// 创建自定义 render 函数处理 App Router 上下文
const customRender = (ui: ReactNode) => {
  return render(ui);
};

jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  useSearchParams: jest.fn(),
  notFound: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/components/actions/password-reset-action", () => ({
  passwordResetConfirm: jest.fn(),
}));

// Mock auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

describe("Password Reset Confirm Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with password and confirm password input and submit button", () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    render(<Page />);

    // 直接使用getByPlaceholderText查找密码输入框
    expect(
      screen.getByPlaceholderText("至少8个字符，包含大写字母和特殊字符"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("再次输入相同的密码"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /重置密码/i }),
    ).toBeInTheDocument();
  });

  it("renders the 404 message in case there is not a token", () => {
    // Mock search params with no token
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
    }));

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    render(<Page />);

    expect(screen.getByText("无效的令牌")).toBeInTheDocument();
  });

  it("displays error message if password reset fails", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    // Mock passwordResetConfirm to return error
    (passwordResetConfirm as jest.Mock).mockResolvedValue({
      server_validation_error: "密码重置失败",
    });

    render(<Page />);

    // 填写表单并提交
    const passwordInput = screen.getByPlaceholderText(
      "至少8个字符，包含大写字母和特殊字符",
    );
    const confirmInput = screen.getByPlaceholderText("再次输入相同的密码");
    const submitButton = screen.getByRole("button", { name: /重置密码/i });

    fireEvent.change(passwordInput, { target: { value: "newPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "newPassword123!" } });
    fireEvent.click(submitButton);

    // 等待错误消息出现
    await waitFor(() => {
      expect(screen.getByTestId("form-error")).toHaveTextContent(
        "密码重置失败",
      );
    });
  });

  it("displays validation errors if password is invalid and don't match", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    // Mock passwordResetConfirm to return validation errors
    (passwordResetConfirm as jest.Mock).mockResolvedValue({
      errors: {
        password: ["密码至少需要8个字符"],
        passwordConfirm: ["密码不匹配"],
      },
    });

    render(<Page />);

    // 填写表单并提交
    const passwordInput = screen.getByPlaceholderText(
      "至少8个字符，包含大写字母和特殊字符",
    );
    const confirmInput = screen.getByPlaceholderText("再次输入相同的密码");
    const submitButton = screen.getByRole("button", { name: /重置密码/i });

    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.change(confirmInput, { target: { value: "different" } });
    fireEvent.click(submitButton);

    // 等待验证错误出现
    await waitFor(() => {
      expect(screen.getByTestId("field-error-password-0")).toHaveTextContent(
        "密码至少需要8个字符",
      );
      expect(
        screen.getByTestId("field-error-passwordConfirm-0"),
      ).toHaveTextContent("密码不匹配");
    });
  });

  it("redirects to login page after successful password reset", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    const mockPush = jest.fn();
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock passwordResetConfirm to return success
    (passwordResetConfirm as jest.Mock).mockResolvedValue({
      message: "密码已成功重置！正在跳转到登录页面...",
    });

    // Use fake timers for setTimeout
    jest.useFakeTimers();

    render(<Page />);

    // 填写表单并提交
    const passwordInput = screen.getByPlaceholderText(
      "至少8个字符，包含大写字母和特殊字符",
    );
    const confirmInput = screen.getByPlaceholderText("再次输入相同的密码");
    const submitButton = screen.getByRole("button", { name: /重置密码/i });

    fireEvent.change(passwordInput, { target: { value: "newPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "newPassword123!" } });
    fireEvent.click(submitButton);

    // 等待成功消息出现
    await waitFor(() => {
      expect(screen.getByTestId("success-message")).toHaveTextContent(
        "密码已成功重置！正在跳转到登录页面...",
      );
    });

    // Advance timers to trigger redirect
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith("/login");

    // Restore real timers
    jest.useRealTimers();
  });
});
