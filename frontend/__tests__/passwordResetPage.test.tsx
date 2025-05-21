import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from 'react';

import Page from "@/app/password-recovery/page";
import { passwordReset } from "@/components/actions/password-reset-action";

jest.mock("../components/actions/password-reset-action", () => ({
  passwordReset: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  useSearchParams: () => ({
    get: jest.fn().mockImplementation((key) => key === 'email' ? "" : null),
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

describe("Password Reset Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with email input and submit button", () => {
    // Mock useActionState 返回默认状态
    jest.spyOn(React, 'useActionState').mockImplementation(() => [
      undefined,
      jest.fn(),
    ]);

    render(<Page />);

    // 使用 getByRole 查找输入框和按钮
    expect(screen.getByRole("textbox", { name: /邮箱/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发送重置链接/i })).toBeInTheDocument();
  });

  it("displays success message on successful form submission", async () => {
    // Mock useActionState 返回成功状态
    jest.spyOn(React, 'useActionState').mockImplementation(() => [
      {
        message: "密码重置链接已发送到您的邮箱，请查收。",
      },
      jest.fn(),
    ]);

    render(<Page />);

    expect(screen.getByText("密码重置链接已发送到您的邮箱，请查收。")).toBeInTheDocument();
  });

  it("displays error message if password reset fails", async () => {
    // Mock useActionState 返回错误状态
    jest.spyOn(React, 'useActionState').mockImplementation(() => [
      {
        server_validation_error: "用户不存在",
      },
      jest.fn(),
    ]);

    render(<Page />);

    expect(screen.getByText("用户不存在")).toBeInTheDocument();
  });

  it("displays validation errors for invalid email", async () => {
    // Mock useActionState 返回验证错误状态
    jest.spyOn(React, 'useActionState').mockImplementation(() => [
      {
        errors: {
          email: ["请输入有效的电子邮件地址"],
        },
      },
      jest.fn(),
    ]);

    render(<Page />);

    expect(screen.getByText("请输入有效的电子邮件地址")).toBeInTheDocument();
  });
});
