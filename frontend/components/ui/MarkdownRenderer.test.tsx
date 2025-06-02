import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

// Mock external libraries
jest.mock("medium-zoom", () => {
  const mockZoom = jest.fn();
  const mockDetach = jest.fn();
  // Mock the default export and the detach method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mz = mockZoom as any;
  mz.detach = mockDetach;
  return mz;
});

jest.mock("copy-to-clipboard", () => jest.fn());

// 使用 require 并添加 ESLint 禁用注释

describe("MarkdownRenderer", () => {
  // Clear mocks before each test
  beforeEach(() => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    (require("medium-zoom") as jest.Mock).mockClear();
    (require("medium-zoom").detach as jest.Mock).mockClear();
    (require("copy-to-clipboard") as jest.Mock).mockClear();
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  });

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

  // Simplified tests for plugin functionality - just verify components initialize without errors
  it("renders markdown with plugins without errors", () => {
    const markdownWithVariousFeatures = `
# Title
## Subtitle 1
### Sub-subtitle
## Subtitle 2

Inline math: $E=mc^2$. Display math: $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$

\`\`\`javascript
console.log("Hello, World!");
\`\`\`

![alt text](image.png)

## My Awesome Title
`;

    // Should render without throwing errors
    expect(() => {
      render(<MarkdownRenderer content={markdownWithVariousFeatures} />);
    }).not.toThrow();

    expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("react-markdown")).toBeInTheDocument();
  });
});
