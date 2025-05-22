import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";

// Mock Next.js modules
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock(
  "next/link",
  () =>
    ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
);

// Mock logout action
jest.mock("@/components/actions/logout-action", () => ({
  logout: jest.fn(),
}));

describe("Dashboard Layout Navigation", () => {
  it("should render Prompt Hub navigation link in sidebar", () => {
    render(<DashboardLayout>{<div>Test</div>}</DashboardLayout>);

    // 验证导航侧边栏中是否存在Prompt Hub链接
    const promptLink = screen.getByRole("link", { name: "Prompt Hub" });
    expect(promptLink).toBeInTheDocument();
    expect(promptLink.getAttribute("href")).toBe("/prompts");
  });
});
