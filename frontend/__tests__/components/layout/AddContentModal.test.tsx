import { render, screen, fireEvent, waitFor } from "@/__tests__/test-utils";
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

    // 检查标题 - 使用getAllByText然后检查至少存在一个
    const titleElements = screen.getAllByText("添加内容");
    expect(titleElements.length).toBeGreaterThan(0);

    // 检查输入区域
    expect(
      screen.getByPlaceholderText("输入研究主题、粘贴链接或文本内容..."),
    ).toBeInTheDocument();

    // 检查文件上传区域
    expect(screen.getByText("拖拽文件到此处或")).toBeInTheDocument();
    expect(screen.getByText("选择文件")).toBeInTheDocument();

    // 检查按钮
    expect(screen.getByRole("button", { name: /添加/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /取消/i })).toBeInTheDocument();
  });

  it("点击关闭按钮应该调用关闭回调", () => {
    const mockClose = jest.fn();
    render(<AddContentModal open={true} onClose={mockClose} />);

    // 点击关闭按钮（X按钮）
    fireEvent.click(screen.getByRole("button", { name: /取消/i }));

    // 验证回调被调用至少一次
    expect(mockClose).toHaveBeenCalled();
  });

  it("应该能输入文本内容", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 等待输入框出现
    const textInput = await screen.findByPlaceholderText(
      "输入研究主题、粘贴链接或文本内容...",
    );
    fireEvent.change(textInput, { target: { value: "测试内容文本" } });

    // 验证输入值
    expect(textInput).toHaveValue("测试内容文本");
  });

  it("应该能处理URL输入", async () => {
    render(<AddContentModal open={true} onClose={jest.fn()} />);

    // 等待输入框出现并输入URL
    const textInput = await screen.findByPlaceholderText(
      "输入研究主题、粘贴链接或文本内容...",
    );
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

    // 检查文件上传区域文本存在
    expect(screen.getByText("拖拽文件到此处或")).toBeInTheDocument();
    expect(screen.getByText("选择文件")).toBeInTheDocument();
    expect(screen.getByText("支持 PDF、Word、图片等格式")).toBeInTheDocument();
  });
});
