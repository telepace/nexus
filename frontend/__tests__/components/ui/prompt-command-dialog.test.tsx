import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import { Prompt } from "@/lib/api/services/prompts";
import {
  createMockPrompt,
  createMockPromptWithType,
} from "@/lib/utils/prompt-utils";

// Mock prompts data - 使用抽象的测试数据，不复制真实业务内容
const mockPrompts: Prompt[] = [
  createMockPromptWithType("summary", {
    id: "test-prompt-1",
    name: "测试摘要功能",
    description: "用于测试摘要功能的提示词",
  }),
  createMockPromptWithType("insights", {
    id: "test-prompt-2",
    name: "测试洞察功能",
    description: "用于测试洞察功能的提示词",
  }),
];

describe("PromptCommandDialog", () => {
  const mockOnPromptSelect = jest.fn();
  const mockOnExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    availablePrompts: mockPrompts,
    isExecuting: false,
    onPromptSelect: mockOnPromptSelect,
    onExecute: mockOnExecute,
  };

  it("should render dialog with input field", () => {
    render(<PromptCommandDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText("ask something...")).toBeInTheDocument();
    expect(screen.getByRole("button", { hidden: true })).toBeInTheDocument();
  });

  it("should show command suggestions when typing /", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "/");

    await waitFor(
      () => {
        expect(screen.getByText("测试摘要功能")).toBeInTheDocument();
        expect(screen.getByText("测试洞察功能")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  }, 20000);

  it("should filter prompts based on search text", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "/摘要");

    await waitFor(() => {
      expect(screen.getByText("测试摘要功能")).toBeInTheDocument();
      expect(screen.queryByText("测试洞察功能")).not.toBeInTheDocument();
    });
  });

  it("should select prompt when clicked from suggestions", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "/");

    await waitFor(() => {
      expect(screen.getByText("测试摘要功能")).toBeInTheDocument();
    });

    await user.click(screen.getByText("测试摘要功能"));

    expect(mockOnPromptSelect).toHaveBeenCalledWith(mockPrompts[0]);
  });

  it("should execute prompt when form is submitted", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "这是测试内容");

    const sendButton = screen.getByRole("button");
    await user.click(sendButton);

    expect(mockOnExecute).toHaveBeenCalledWith("这是测试内容", null);
  });

  it("should execute selected prompt with content", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");

    // Select a prompt first
    await user.type(input, "/");
    await waitFor(() => {
      expect(screen.getByText("测试摘要功能")).toBeInTheDocument();
    });
    await user.click(screen.getByText("测试摘要功能"));

    // Clear and type content
    await user.clear(input);
    await user.type(input, "这是测试内容");

    // Find the form element via the input
    const form = input.closest("form");
    fireEvent.submit(form!);

    expect(mockOnExecute).toHaveBeenCalledWith("这是测试内容", mockPrompts[0]);
  });

  it("should disable send button when executing", () => {
    render(<PromptCommandDialog {...defaultProps} isExecuting={true} />);

    const sendButton = screen.getByRole("button");
    expect(sendButton).toBeDisabled();
  });

  it("should close suggestions when clicking outside", async () => {
    const user = userEvent.setup();
    render(<PromptCommandDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "/");

    await waitFor(() => {
      expect(screen.getByText("测试摘要功能")).toBeInTheDocument();
    });

    // Click outside the input
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText("测试摘要功能")).not.toBeInTheDocument();
    });
  });

  // 测试组件对不同状态 prompts 的处理
  it("should handle empty prompts list", () => {
    render(<PromptCommandDialog {...defaultProps} availablePrompts={[]} />);

    const input = screen.getByPlaceholderText("ask something...");
    expect(input).toBeInTheDocument();
  });

  // 测试组件对大量 prompts 的处理
  it("should handle large number of prompts", async () => {
    const manyPrompts = Array.from({ length: 20 }, (_, i) =>
      createMockPrompt({
        id: `prompt-${i}`,
        name: `测试提示词 ${i}`,
      }),
    );

    const user = userEvent.setup();
    render(
      <PromptCommandDialog {...defaultProps} availablePrompts={manyPrompts} />,
    );

    const input = screen.getByPlaceholderText("ask something...");
    await user.type(input, "/");

    await waitFor(() => {
      // 应该显示所有的提示词
      expect(screen.getByText("测试提示词 0")).toBeInTheDocument();
      expect(screen.getByText("测试提示词 19")).toBeInTheDocument();
    });
  });
});
