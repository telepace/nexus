import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AddContentModal } from "@/components/layout/AddContentModal";

describe("AddContentModal", () => {
  it("应该在关闭状态下不渲染", () => {
    const { container } = render(
      <AddContentModal open={false} onClose={jest.fn()} />,
    );
    expect(
      container.querySelector('[role="alertdialog"]'),
    ).not.toBeInTheDocument();
  });

  it("应该在打开状态下正确渲染", () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 检查标题
    expect(screen.getByText("添加新内容")).toBeInTheDocument();

    // 检查输入区域标签存在
    expect(screen.getByLabelText("文本内容 / 链接")).toBeInTheDocument();

    // 检查按钮
    expect(
      screen.getByRole("button", { name: /上传本地文件/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加/i })).toBeInTheDocument();
    // 关闭按钮
    expect(screen.getByRole("button", { name: /关闭/i })).toBeInTheDocument();
  });

  it("点击关闭按钮应该调用关闭回调", () => {
    const mockClose = jest.fn();
    render(<AddContentModal open={true} onClose={mockClose} />);

    // 点击关闭按钮
    fireEvent.click(screen.getByRole("button", { name: /关闭/i }));

    // 验证回调被调用至少一次
    expect(mockClose).toHaveBeenCalled();
  });

  it("应该能输入文本内容", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 等待输入框出现，使用更具体的选择器
    const textInput = await screen.findByLabelText("文本内容 / 链接");
    fireEvent.change(textInput, { target: { value: "测试内容文本" } });

    // 验证输入值
    expect(textInput).toHaveValue("测试内容文本");
  });

  it("应该能处理URL输入", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 等待输入框出现并输入URL，使用更具体的选择器
    const textInput = await screen.findByLabelText("文本内容 / 链接");
    fireEvent.change(textInput, { target: { value: "https://example.com" } });

    // 验证URL识别成功
    await waitFor(() => {
      expect(
        screen.queryAllByText("https://example.com").length,
      ).toBeGreaterThan(0);
    });
  });

  it("应该显示文件上传选项", () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 检查文件上传按钮文本存在
    expect(
      screen.getByRole("button", { name: /上传本地文件/i }),
    ).toBeInTheDocument();
  });
});
