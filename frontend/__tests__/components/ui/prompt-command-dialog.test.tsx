import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import { Prompt } from "@/lib/api/services/prompts";

// Mock prompts data
const mockPrompts: Prompt[] = [
  {
    id: "prompt-1",
    name: "生成摘要",
    content: "请为以下内容生成一个简洁明了的摘要：{content}",
    description: "为内容生成简洁的摘要",
    visibility: "public",
    version: 1,
    enabled: false,
    updated_at: "2025-05-26T14:50:56.230373",
    type: "template",
    input_vars: [
      {
        name: "content",
        description: "内容",
        required: true,
      },
    ],
    meta_data: null,
    team_id: null,
    created_at: "2025-05-26T14:37:39.172214",
    embedding: null,
    created_by: "user-1",
  },
  {
    id: "prompt-2",
    name: "深度洞察",
    content: "请对以下内容进行深度分析：{content}",
    description: "提供深度分析和洞察",
    visibility: "public",
    version: 1,
    enabled: false,
    updated_at: "2025-05-26T14:50:56.230373",
    type: "template",
    input_vars: [
      {
        name: "content",
        description: "内容",
        required: true,
      },
    ],
    meta_data: null,
    team_id: null,
    created_at: "2025-05-26T14:37:39.172214",
    embedding: null,
    created_by: "user-1",
  },
];

describe("PromptCommandDialog", () => {
  const mockOnPromptSelect = jest.fn();
  const mockOnExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    availablePrompts: mockPrompts,
    contentId: "content-1",
    isExecuting: false,
    onPromptSelect: mockOnPromptSelect,
    onExecute: mockOnExecute,
  };

  it("should render dialog with input field", () => {
    render(<PromptCommandDialog {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/输入消息或使用 \/ 快速选择 prompt/),
    ).toBeInTheDocument();
    expect(screen.getByText("发送")).toBeInTheDocument();
  });

  it("should show command suggestions when typing /", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );
    await user.type(input, "/");

    await waitFor(() => {
      expect(screen.getByText("生成摘要")).toBeInTheDocument();
      expect(screen.getByText("深度洞察")).toBeInTheDocument();
    });
  });

  it("should filter prompts based on search text", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );
    await user.type(input, "/摘要");

    await waitFor(() => {
      expect(screen.getByText("生成摘要")).toBeInTheDocument();
      expect(screen.queryByText("深度洞察")).not.toBeInTheDocument();
    });
  });

  it("should select prompt when clicked from suggestions", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );
    await user.type(input, "/");

    await waitFor(() => {
      expect(screen.getByText("生成摘要")).toBeInTheDocument();
    });

    await user.click(screen.getByText("生成摘要"));

    expect(mockOnPromptSelect).toHaveBeenCalledWith(mockPrompts[0]);
  });

  it("should execute prompt when form is submitted", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );
    await user.type(input, "这是测试内容");

    const sendButton = screen.getByText("发送");
    await user.click(sendButton);

    expect(mockOnExecute).toHaveBeenCalledWith("这是测试内容", null);
  });

  it("should execute selected prompt with content", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );

    // Select a prompt first
    await user.type(input, "/");
    await waitFor(() => {
      expect(screen.getByText("生成摘要")).toBeInTheDocument();
    });
    await user.click(screen.getByText("生成摘要"));

    // Clear and type content
    await user.clear(input);
    await user.type(input, "这是测试内容");

    const sendButton = screen.getByText("发送");
    await user.click(sendButton);

    expect(mockOnExecute).toHaveBeenCalledWith("这是测试内容", mockPrompts[0]);
  });

  it("should disable send button when executing", () => {
    render(<PromptCommandDialog {...defaultProps} isExecuting={true} />);

    const sendButton = screen.getByText("发送");
    expect(sendButton).toBeDisabled();
  });

  it("should close suggestions when clicking outside", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      /输入消息或使用 \/ 快速选择 prompt/,
    );
    await user.type(input, "/");

    await waitFor(() => {
      expect(screen.getByText("生成摘要")).toBeInTheDocument();
    });

    // Click outside the input
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText("生成摘要")).not.toBeInTheDocument();
    });
  });
});
