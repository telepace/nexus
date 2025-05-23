import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AddContentModal } from "@/components/layout/AddContentModal";

describe("AddContentModal", () => {
  it("应该在关闭状态下不渲染", () => {
    const { container } = render(
      <AddContentModal open={false} onClose={jest.fn()} />,
    );
    expect(container.querySelector('[role="alertdialog"]')).not.toBeInTheDocument();
  });

  it("应该在打开状态下正确渲染", () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 检查标题
    expect(screen.getByText("添加新内容")).toBeInTheDocument();

    // 检查输入区域 - 去掉emoji，使用部分文本匹配
    expect(
      screen.getByText(/粘贴链接.*输入文本.*拖拽文件至此/),
    ).toBeInTheDocument();

    // 检查按钮
    expect(screen.getByText("点击选择本地文件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /取消/i })).toBeInTheDocument();
  });

  it("点击关闭按钮应该调用关闭回调", () => {
    const mockClose = jest.fn();
    // 阻止 AlertDialog 的 onOpenChange 行为
    render(<AddContentModal open={true} onClose={mockClose} />);

    // 点击取消按钮
    fireEvent.click(screen.getByRole("button", { name: /取消/i }));

    // 验证回调被调用至少一次
    expect(mockClose).toHaveBeenCalled();
  });

  it("应该能输入文本内容", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 点击拖放区域激活文本输入
    const dropArea = screen.getByTestId("drop-area");
    fireEvent.click(dropArea);

    // 等待输入框出现
    const textInput = await screen.findByRole("textbox");
    fireEvent.change(textInput, { target: { value: "测试内容文本" } });

    // 验证输入值
    expect(textInput).toHaveValue("测试内容文本");
  });

  it("应该能处理URL输入", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 点击拖放区域激活文本输入
    const dropArea = screen.getByTestId("drop-area");
    fireEvent.click(dropArea);

    // 等待输入框出现并输入URL
    const textInput = await screen.findByRole("textbox");
    fireEvent.change(textInput, { target: { value: "https://example.com" } });

    // 验证URL识别成功
    await waitFor(() => {
      expect(screen.getByText(/已识别链接/i)).toBeInTheDocument();
    });
  });

  it("应该显示文件上传选项", () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 检查文件上传按钮
    const fileButton = screen.getByText("点击选择本地文件");
    expect(fileButton).toBeInTheDocument();

    // 检查支持的格式信息
    expect(screen.getByText(/支持格式:/i)).toBeInTheDocument();
  });
});
