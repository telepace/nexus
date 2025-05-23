import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { act } from "react";

import Page from "@/app/password-recovery/confirm/page";
import { useSearchParams, notFound, useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  useSearchParams: jest.fn(),
  notFound: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("../components/actions/password-reset-action", () => ({
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
  default: (props: unknown) => {
    return <img {...(props as object)} />;
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

    // Mock useActionState
    jest
      .spyOn(React, "useActionState")
      .mockImplementation(() => [undefined, jest.fn(), false]);

    render(<Page />);

    expect(
      screen.getByPlaceholderText("At least 8 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter the same password again"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reset Password/i }),
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
      .mockImplementation(() => [
        { server_validation_error: "Password reset failed" },
        jest.fn(),
        false,
      ]);

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    render(<Page />);

    expect(screen.getByText("Password reset failed")).toBeInTheDocument();
  });

  it("displays validation errors if password is invalid and don't match", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock validation errors
    jest.spyOn(React, "useActionState").mockImplementation(() => [
      {
        errors: {
          password: ["Password must be at least 8 characters"],
          passwordConfirm: ["Passwords don't match"],
        },
      },
      jest.fn(),
      false,
    ]);

    render(<Page />);

    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it("redirects to login page after successful password reset", async () => {
    // Mock search params
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue("mock-token"),
    }));

    // Mock success message
    jest
      .spyOn(React, "useActionState")
      .mockImplementation(() => [
        { message: "Password successfully reset! Redirecting to login..." },
        jest.fn(),
        false,
      ]);

    const mockPush = jest.fn();
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Use fake timers for setTimeout
    jest.useFakeTimers();

    render(<Page />);

    expect(
      screen.getAllByText(
        "Password successfully reset! Redirecting to login...",
      )[0],
    ).toBeInTheDocument();

    // Advance timers to trigger redirect
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith("/login");

    // Restore real timers
    jest.useRealTimers();
  });
});
