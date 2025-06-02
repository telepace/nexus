import { render, screen, fireEvent } from "@testing-library/react";
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

  // Tests for new features
  it("renders Table of Contents for headings", () => {
    const markdownWithToc =
      "# Title\n## Subtitle 1\n### Sub-subtitle\n## Subtitle 2\n toc"; // remark-toc looks for 'toc' or 'table of contents'
    render(<MarkdownRenderer content={markdownWithToc} />);
    // Check if a list item from ToC is present. Default remark-toc creates ul > li > a
    // This is a basic check; more specific checks might depend on remark-toc output structure.
    const tocLink = screen.getByRole("link", { name: /subtitle 1/i });
    expect(tocLink).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /sub-subtitle/i }),
    ).toBeInTheDocument();
  });

  it("renders math formulas using KaTeX", () => {
    const markdownWithMath =
      "Inline math: $E=mc^2$. Display math: $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$";
    render(<MarkdownRenderer content={markdownWithMath} />);
    // Check for KaTeX rendered output, e.g., elements with 'katex' class
    expect(
      screen.getAllByText(
        (content, element) =>
          element?.classList.contains("katex") ||
          element?.classList.contains("katex-display"),
      ).length,
    ).toBeGreaterThan(0);
    // More specific: find a specific part of the formula if possible, e.g. "E=mc" or "x="
    // This depends heavily on how KaTeX structures its output.
    // For simplicity, checking for the presence of 'katex' class is a good start.
    expect(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      screen.getByText((content, element) => content.includes("E=mc")),
    ).toBeInTheDocument();
  });

  it("applies medium-zoom to images", () => {
    const markdownWithImage = "![alt text](image.png)";
    render(<MarkdownRenderer content={markdownWithImage} />);
    // Check if mediumZoom was called. Relies on OptimizedImage rendering an actual <img> tag.
    // The useEffect in MarkdownRenderer applies zoom to '.prose img'
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    expect(require("medium-zoom")).toHaveBeenCalledTimes(1);
  });

  it("renders code blocks with a copy button and copies content", () => {
    const codeContent = 'console.log("Hello, World!");';
    const markdownWithCodeBlock = "```javascript\n" + codeContent + "\n```";
    render(<MarkdownRenderer content={markdownWithCodeBlock} />);

    const preElement = screen.getByText(codeContent).closest("pre");
    expect(preElement).toBeInTheDocument();

    const copyButton = screen.getByText("Copy");
    fireEvent.click(copyButton);

    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    expect(require("copy-to-clipboard")).toHaveBeenCalledWith(codeContent);
  });

  it("handles autolink headings by wrapping them in links", () => {
    const markdown = "## My Awesome Title";
    render(<MarkdownRenderer content={markdown} />);
    const headingElement = screen.getByRole("heading", {
      name: /my awesome title/i,
    });
    // rehype-autolink-headings with behavior: 'wrap' wraps the heading text in an <a> tag
    // So, the heading itself should be a link, or contain one.
    // Check if the heading's text is within an anchor tag that is a child of the heading.
    const linkElement = headingElement.querySelector("a");
    expect(linkElement).toBeInTheDocument();
    // The href might be #my-awesome-title or similar, depending on slug generation.
    // For now, just checking for presence of the link is good.
    expect(linkElement).toHaveAttribute("href");
  });
});
