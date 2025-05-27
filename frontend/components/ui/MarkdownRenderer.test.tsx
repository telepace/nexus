import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders markdown content", () => {
    const markdown = "# Hello World\n\nThis is a **bold** text.";
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByTestId("react-markdown")).toBeInTheDocument();
    expect(screen.getByTestId("react-markdown")).toHaveTextContent(
      "# Hello World",
    );
    expect(screen.getByTestId("react-markdown")).toHaveTextContent(
      "This is a **bold** text.",
    );
  });

  it("renders code blocks", () => {
    const markdown = '```javascript\nconst hello = "world";\n```';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByTestId("react-markdown")).toHaveTextContent(
      "```javascript",
    );
    expect(screen.getByTestId("react-markdown")).toHaveTextContent(
      'const hello = "world";',
    );
  });

  it("renders tables", () => {
    const markdown = `
| Name | Age |
|------|-----|
| John | 25  |
| Jane | 30  |
`;
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByTestId("react-markdown")).toHaveTextContent("Name");
    expect(screen.getByTestId("react-markdown")).toHaveTextContent("John");
    expect(screen.getByTestId("react-markdown")).toHaveTextContent("Jane");
  });

  it("renders links", () => {
    const markdown = "[Google](https://google.com)";
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByTestId("react-markdown")).toHaveTextContent(
      "[Google](https://google.com)",
    );
  });

  it("handles empty content gracefully", () => {
    render(<MarkdownRenderer content="" />);
    expect(screen.getByTestId("markdown-renderer")).toBeEmptyDOMElement();
  });

  it("handles null content gracefully", () => {
    render(<MarkdownRenderer content={null} />);
    expect(screen.getByTestId("markdown-renderer")).toBeEmptyDOMElement();
  });

  it("applies custom className", () => {
    const markdown = "# Test";
    render(<MarkdownRenderer content={markdown} className="custom-class" />);

    expect(screen.getByTestId("markdown-renderer")).toHaveClass("custom-class");
  });

  it("applies proper prose classes", () => {
    const markdown = "# Test";
    render(<MarkdownRenderer content={markdown} />);

    const container = screen.getByTestId("markdown-renderer");
    expect(container).toHaveClass("prose");
    expect(container).toHaveClass("prose-slate");
    expect(container).toHaveClass("dark:prose-invert");
    expect(container).toHaveClass("max-w-none");
  });
});
