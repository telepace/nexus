import React from "react";
import { render, screen } from "@testing-library/react";
import { UniversalContentRenderer } from "./UniversalContentRenderer";

// Mock the renderer components
jest.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown-renderer" className={className}>
      {content}
    </div>
  ),
}));

jest.mock("./JsonlRenderer", () => ({
  JsonlRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="jsonl-renderer" className={className}>
      JSONL: {content}
    </div>
  ),
}));

jest.mock("./JsonObjectRenderer", () => ({
  JsonObjectRenderer: ({ data, className }: { data: any; className?: string }) => (
    <div data-testid="json-object-renderer" className={className}>
      JSON Object: {typeof data === "string" ? data : JSON.stringify(data)}
    </div>
  ),
}));

describe("UniversalContentRenderer", () => {
  it("renders empty content correctly", () => {
    render(<UniversalContentRenderer content="" />);
    const container = screen.getByTestId("universal-content-renderer");
    expect(container).toBeInTheDocument();
  });

  it("renders null content correctly", () => {
    render(<UniversalContentRenderer content={null} />);
    const container = screen.getByTestId("universal-content-renderer");
    expect(container).toBeInTheDocument();
  });

  it("renders undefined content correctly", () => {
    render(<UniversalContentRenderer content={undefined} />);
    const container = screen.getByTestId("universal-content-renderer");
    expect(container).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const customClass = "custom-test-class";
    render(<UniversalContentRenderer content="" className={customClass} />);
    const container = screen.getByTestId("universal-content-renderer");
    expect(container).toHaveClass(customClass);
  });

  describe("Format Detection", () => {
    it("detects and renders JSONL content", () => {
      const jsonlContent = '{"type": "h1", "content": "Title", "mapping": "h1-1"}';
      render(<UniversalContentRenderer content={jsonlContent} />);
      
      expect(screen.getByTestId("jsonl-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
      expect(screen.getByText(`JSONL: ${jsonlContent}`)).toBeInTheDocument();
    });

    it("detects and renders multi-line JSONL content", () => {
      const jsonlContent = `{"type": "h1", "content": "Title", "mapping": "h1-1"}
{"type": "p", "content": "Paragraph", "mapping": "p1"}`;
      render(<UniversalContentRenderer content={jsonlContent} />);
      
      expect(screen.getByTestId("jsonl-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });

    it("detects JSONL with short field names", () => {
      const jsonlContent = '{"t": "h1", "c": "Title", "mapping": "h1-1"}';
      render(<UniversalContentRenderer content={jsonlContent} />);
      
      expect(screen.getByTestId("jsonl-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });

    it("detects and renders JSON object content", () => {
      const jsonObjectContent = '{"key": "value", "number": 123, "array": [1, 2, 3]}';
      render(<UniversalContentRenderer content={jsonObjectContent} />);
      
      expect(screen.getByTestId("json-object-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
      expect(screen.getByText(`JSON Object: ${jsonObjectContent}`)).toBeInTheDocument();
    });

    it("detects and renders JSON array content", () => {
      const jsonArrayContent = '[{"item": 1}, {"item": 2}, {"item": 3}]';
      render(<UniversalContentRenderer content={jsonArrayContent} />);
      
      expect(screen.getByTestId("json-object-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
      expect(screen.getByText(`JSON Object: ${jsonArrayContent}`)).toBeInTheDocument();
    });

    it("prioritizes JSONL over JSON object when both patterns match", () => {
      // This should be detected as JSONL because it has type and content fields
      const jsonlContent = '{"type": "h1", "content": "Title", "other": "data"}';
      render(<UniversalContentRenderer content={jsonlContent} />);
      
      expect(screen.getByTestId("jsonl-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });

    it("falls back to JSON object when JSON lacks JSONL fields", () => {
      const jsonObjectContent = '{"description": "Not a JSONL block", "data": "some value"}';
      render(<UniversalContentRenderer content={jsonObjectContent} />);
      
      expect(screen.getByTestId("json-object-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });

    it("falls back to markdown for non-JSON content", () => {
      const markdownContent = "# This is a markdown title\n\nThis is a paragraph.";
      render(<UniversalContentRenderer content={markdownContent} />);
      
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      
      // Just check that the markdown renderer contains the content
      const markdownRenderer = screen.getByTestId("markdown-renderer");
      expect(markdownRenderer.textContent).toContain("This is a markdown title");
      expect(markdownRenderer.textContent).toContain("This is a paragraph.");
    });

    it("falls back to markdown for invalid JSON", () => {
      const invalidJson = '{"type": "h1", "content": "Title"';  // Missing closing brace
      render(<UniversalContentRenderer content={invalidJson} />);
      
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
    });

    it("falls back to markdown for plain text", () => {
      const plainText = "This is just plain text content.";
      render(<UniversalContentRenderer content={plainText} />);
      
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles content with only whitespace", () => {
      const whitespaceContent = "   \n\t  ";
      render(<UniversalContentRenderer content={whitespaceContent} />);
      
      // Should treat as non-JSON and fall back to markdown
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
    });

    it("handles mixed content (starts with JSONL)", () => {
      const mixedContent = `{"type": "h1", "content": "Title"}
Some non-JSON content
More text`;
      render(<UniversalContentRenderer content={mixedContent} />);
      
      // Should detect as JSONL based on first line
      expect(screen.getByTestId("jsonl-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });

    it("handles content starting with non-JSON", () => {
      const mixedContent = `Some text first
{"type": "h1", "content": "Title"}`;
      render(<UniversalContentRenderer content={mixedContent} />);
      
      // Should fall back to markdown because first line is not JSON
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("json-object-renderer")).not.toBeInTheDocument();
    });

    it("handles nested JSON objects", () => {
      const nestedJsonContent = '{"level1": {"level2": {"level3": "deep value"}}, "array": [1, 2, 3]}';
      render(<UniversalContentRenderer content={nestedJsonContent} />);
      
      expect(screen.getByTestId("json-object-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("jsonl-renderer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
    });
  });

  describe("Props Forwarding", () => {
    it("forwards className to JSONL renderer", () => {
      const jsonlContent = '{"type": "h1", "content": "Title", "mapping": "h1-1"}';
      const customClass = "custom-jsonl-class";
      
      render(<UniversalContentRenderer content={jsonlContent} className={customClass} />);
      
      const container = screen.getByTestId("universal-content-renderer");
      expect(container).toHaveClass(customClass);
    });

    it("forwards className to JSON object renderer", () => {
      const jsonObjectContent = '{"key": "value", "number": 123}';
      const customClass = "custom-json-class";
      
      render(<UniversalContentRenderer content={jsonObjectContent} className={customClass} />);
      
      const container = screen.getByTestId("universal-content-renderer");
      expect(container).toHaveClass(customClass);
    });

    it("forwards className to Markdown renderer", () => {
      const markdownContent = "# Markdown Title";
      const customClass = "custom-markdown-class";
      
      render(<UniversalContentRenderer content={markdownContent} className={customClass} />);
      
      const container = screen.getByTestId("universal-content-renderer");
      expect(container).toHaveClass(customClass);
    });
  });
}); 