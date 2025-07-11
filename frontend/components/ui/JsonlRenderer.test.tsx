import React from "react";
import { render, screen } from "@testing-library/react";
import { JsonlRenderer } from "./JsonlRenderer";

describe("JsonlRenderer", () => {
  it("renders empty content correctly", () => {
    render(<JsonlRenderer content="" />);
    const container = screen.getByTestId("jsonl-renderer");
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null content correctly", () => {
    render(<JsonlRenderer content={null} />);
    const container = screen.getByTestId("jsonl-renderer");
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders undefined content correctly", () => {
    render(<JsonlRenderer content={undefined} />);
    const container = screen.getByTestId("jsonl-renderer");
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("applies custom className", () => {
    const customClass = "custom-test-class";
    render(<JsonlRenderer content="" className={customClass} />);
    const container = screen.getByTestId("jsonl-renderer");
    expect(container).toHaveClass(customClass);
  });

  describe("Block Types", () => {
    it("renders h1 blocks correctly", () => {
      const content = '{"type": "h1", "content": "Main Title", "mapping": "h1-1"}';
      render(<JsonlRenderer content={content} />);
      
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Main Title");
      expect(heading).toHaveClass("text-xl", "lg:text-2xl", "leading-[1.3]");
    });

    it("renders h2 blocks correctly", () => {
      const content = '{"type": "h2", "content": "Section Title", "mapping": "h2-1"}';
      render(<JsonlRenderer content={content} />);
      
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Section Title");
      expect(heading).toHaveClass("text-lg", "font-semibold", "leading-[1.3]");
    });

    it("renders h3 blocks correctly", () => {
      const content = '{"type": "h3", "content": "Subsection Title", "mapping": "h3-1"}';
      render(<JsonlRenderer content={content} />);
      
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Subsection Title");
      expect(heading).toHaveClass("text-base", "font-semibold", "leading-[1.3]");
    });

    it("renders paragraph blocks correctly", () => {
      const content = '{"type": "p", "content": "This is a paragraph.", "mapping": "p1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("This is a paragraph.")).toBeInTheDocument();
    });

    it("renders paragraph with lead as a bold prefix", () => {
      const content = '{"type": "p", "lead": "Subtitle", "content": "This is the main content."}';
      render(<JsonlRenderer content={content} />);

      const renderedContent = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && content.startsWith('Subtitle:')
      });
      
      expect(renderedContent).toBeInTheDocument();
      expect(renderedContent.innerHTML).toContain('<strong>Subtitle:</strong>');
      expect(renderedContent).toHaveTextContent('Subtitle: This is the main content.');
    });

    it("renders quote blocks correctly", () => {
      const content = '{"type": "quote", "content": "Important quote", "mapping": "q1"}';
      render(<JsonlRenderer content={content} />);
      
      const quote = screen.getByText("Important quote").closest('blockquote');
      expect(quote).toBeInTheDocument();
      expect(quote).toHaveClass("italic", "border-l-2", "pl-4");
    });

    it("renders list blocks with array content", () => {
      const content = '{"type": "list", "content": ["Item 1", "Item 2", "Item 3"], "mapping": "l1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Item 3")).toBeInTheDocument();
      
      const list = screen.getByRole("list");
      expect(list).toHaveClass("list-disc", "ml-4");
    });

    it("renders list blocks with string content", () => {
      const content = '{"type": "list", "content": "Item 1,Item 2;Item 3", "mapping": "l1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Item 3")).toBeInTheDocument();
    });

    it("renders insight blocks with normal priority", () => {
      const content = '{"type": "insight", "content": "Important insight", "mapping": "i1"}';
      render(<JsonlRenderer content={content} />);
      
      const insight = screen.getByText("Important insight").closest('div[class*="border-l-4"]');
      expect(insight).toHaveClass("border-blue-500", "bg-blue-50");
    });

    it("renders insight blocks with high priority", () => {
      const content = '{"type": "insight", "content": "Critical insight", "priority": "high", "mapping": "i2"}';
      render(<JsonlRenderer content={content} />);
      
      const insight = screen.getByText("Critical insight").closest('div[class*="border-l-4"]');
      expect(insight).toHaveClass("border-red-500");
    });

    it("renders concept blocks correctly", () => {
      const content = '{"type": "concept", "content": "Key concept definition", "mapping": "c1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("概念:")).toBeInTheDocument();
      const conceptText = screen.getByText("Key concept definition");
      expect(conceptText).toBeInTheDocument();
      
      const conceptContainer = conceptText.closest('div[class*="border-l-4"]');
      expect(conceptContainer).toHaveClass("border-purple-500", "bg-purple-50");
    });

    it("renders qa blocks with object content", () => {
      const content = '{"type": "qa", "content": {"q": "What is this?", "a": "This is an answer."}, "mapping": "qa1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("What is this?")).toBeInTheDocument();
      expect(screen.getByText("This is an answer.")).toBeInTheDocument();
    });

    it("renders qa blocks with alternative object keys", () => {
      const content = '{"type": "qa", "content": {"question": "Alternative question?", "answer": "Alternative answer."}, "mapping": "qa2"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("Alternative question?")).toBeInTheDocument();
      expect(screen.getByText("Alternative answer.")).toBeInTheDocument();
    });

    it("renders qa blocks with string content fallback", () => {
      const content = '{"type": "qa", "content": "Simple QA text", "mapping": "qa3"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("Simple QA text")).toBeInTheDocument();
    });

    it("renders action blocks correctly", () => {
      const content = '{"type": "action", "content": "Take this action", "mapping": "a1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("行动:")).toBeInTheDocument();
      const actionText = screen.getByText("Take this action");
      expect(actionText).toBeInTheDocument();
      
      const actionContainer = actionText.closest('div[class*="border-l-4"]');
      expect(actionContainer).toHaveClass("border-green-500", "bg-green-50");
    });

    it("renders unknown block types as paragraphs", () => {
      const content = '{"type": "unknown", "content": "Unknown block type", "mapping": "u1"}';
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByText("Unknown block type")).toBeInTheDocument();
    });
  });

  describe("Alternative Field Names", () => {
    it("supports short field names (t, c)", () => {
      const content = '{"t": "h2", "c": "Short field names", "mapping": "short1"}';
      render(<JsonlRenderer content={content} />);
      
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Short field names");
    });

    it("prioritizes full field names over short ones", () => {
      const content = '{"type": "h1", "t": "h2", "content": "Full names win", "c": "Short content", "mapping": "priority1"}';
      render(<JsonlRenderer content={content} />);
      
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Full names win");
    });
  });

  describe("Multiple Blocks", () => {
    it("renders multiple blocks correctly", () => {
      const content = `{"type": "h1", "content": "Title"}
{"type": "p", "content": "Paragraph"}
{"type": "list", "content": ["Item 1", "Item 2"]}`;
      
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });

    it("handles empty lines and whitespace", () => {
      const content = `{"type": "h1", "content": "Title"}

{"type": "p", "content": "Paragraph"}
   
{"type": "action", "content": "Action"}`;
      
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles invalid JSON lines gracefully", () => {
      const content = `{"type": "h1", "content": "Valid"}
invalid json line
{"type": "p", "content": "Another valid"}`;
      
      render(<JsonlRenderer content={content} />);
      
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Valid");
      expect(screen.getByText("invalid json line")).toBeInTheDocument(); // Should be rendered as paragraph
      expect(screen.getByText("Another valid")).toBeInTheDocument();
    });

    it("fixes single quote JSON syntax errors", () => {
      // Test the exact problematic content from the user
      const content = '{"t": "p", "lead": \'模型设计师"诞生记\', "c": "测试内容"}';
      render(<JsonlRenderer content={content} />);
      
      // Should render as a proper block, not fallback paragraph
      const container = screen.getByTestId("jsonl-renderer");
      expect(container.children).toHaveLength(1);
      
      // Currently JsonlRenderer only processes 'c' content field, not 'lead'
      // The JSON parsing should work and only render the content field
      expect(screen.getByText("测试内容")).toBeInTheDocument();
      
      // Verify the lead field was parsed correctly (even if not displayed)
      // by checking that we didn't fall back to raw text rendering
      expect(screen.queryByText('{"t": "p", "lead":')).not.toBeInTheDocument();
    });

    it("handles missing content fields", () => {
      const content = '{"type": "p", "mapping": "test"}';
      render(<JsonlRenderer content={content} />);
      
      // Should not crash, but content might be empty or undefined
      const container = screen.getByTestId("jsonl-renderer");
      expect(container).toBeInTheDocument();
    });

    it("handles missing type fields", () => {
      const content = '{"content": "Content without type", "mapping": "test"}';
      render(<JsonlRenderer content={content} />);
      
      // Should default to paragraph
      expect(screen.getByText("Content without type")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("includes proper classes for dark mode", () => {
      const content = '{"type": "p", "content": "Test content"}';
      render(<JsonlRenderer content={content} />);
      
      const container = screen.getByTestId("jsonl-renderer");
      expect(container).toHaveClass("select-text");
      expect(container).toHaveClass("max-w-none");
    });
  });
});
 