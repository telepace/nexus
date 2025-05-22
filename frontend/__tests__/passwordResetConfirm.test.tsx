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
  // 在每个测试前设置全局mockReturnValue
  beforeEach(() => {
    // Mock useActionState
    jest.spyOn(React, "useActionState").mockReturnValue([undefined, jest.fn()]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the form with password and confirm password input and submit button", () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    render(<Page />);

    // 使用getByPlaceholderText替代getByLabelText
    expect(screen.getByPlaceholderText(/至少8个字符/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/再次输入相同的密码/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /重置密码/i }),
    ).toBeInTheDocument();
  });

  it("renders the 404 page in case there is not a token", () => {
    // Mock search params with no token
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
    }));

    render(<Page />);

    expect(notFound).toHaveBeenCalled();
  });

  it("displays error message if password reset fails", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock error state
    jest
      .spyOn(React, "useActionState")
      .mockReturnValue([
        { server_validation_error: "密码重置失败" },
        jest.fn(),
      ]);

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    render(<Page />);

    expect(screen.getByTestId("form-error")).toHaveTextContent("密码重置失败");
  });

  it("displays validation errors if password is invalid and don't match", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock validation errors
    jest.spyOn(React, "useActionState").mockReturnValue([
      {
        errors: {
          password: ["密码至少需要8个字符"],
          passwordConfirm: ["密码不匹配"],
        },
      },
      jest.fn(),
    ]);

    render(<Page />);

    // 测试至少有2个错误消息
    const errorMessages = screen.getAllByTestId(/field-error/);
    expect(errorMessages.length).toBeGreaterThanOrEqual(2);
    expect(errorMessages[0]).toHaveTextContent("密码至少需要8个字符");
    expect(errorMessages[1]).toHaveTextContent("密码不匹配");
  });

  it("redirects to login page after successful password reset", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock success message
    jest
      .spyOn(React, "useActionState")
      .mockReturnValue([
        { message: "密码已成功重置！正在跳转到登录页面..." },
        jest.fn(),
      ]);

    const mockPush = jest.fn();
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Use fake timers for setTimeout
    jest.useFakeTimers();

    render(<Page />);

    // 使用data-testid查找成功消息
    const successMessage = screen.getByTestId("success-message");
    expect(successMessage).toHaveTextContent(
      "密码已成功重置！正在跳转到登录页面...",
    );

    // 使用act包裹timer操作
    act(() => {
      // Advance timers to trigger redirect
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith("/login");

    // Restore real timers
    jest.useRealTimers();
  });
});
