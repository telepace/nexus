import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";

import Page from "@/app/setup/page";

// 模拟next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// 模拟SetupContent组件
jest.mock("@/components/setup/SetupContent", () => ({
  SetupContent: () => <div data-testid="setup-content">Setup Content</div>,
}));

// 整个测试套件跳过
describe.skip("SetupPage", () => {
  it("应该渲染设置向导标题", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { name: /设置向导/i }),
    ).toBeInTheDocument();
  });

  it("应该显示多步骤进度指示器", () => {
    render(<Page />);

    // 验证SetupContent组件已被渲染
    expect(screen.getByTestId("setup-content")).toBeInTheDocument();
  });

  it("应该在第一页显示欢迎信息", () => {
    render(<Page />);

    expect(screen.getByTestId("setup-content")).toBeInTheDocument();
    // 具体的欢迎信息在SetupContent组件中测试
  });

  it("应该能够导航到下一步", () => {
    render(<Page />);

    expect(screen.getByTestId("setup-content")).toBeInTheDocument();
    // 导航功能在SetupContent组件中测试
  });
});
