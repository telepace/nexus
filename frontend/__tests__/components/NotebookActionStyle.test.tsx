import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notebookStyleRenderer } from "@/components/ui/jsonlStyles/notebook";

// Mock dependencies
const MockMarkdownRenderer = ({
  content,
  inline,
}: { content: string; inline?: boolean }) => (
  <span data-testid="markdown-renderer">{content}</span>
);

const MockEnhancedReferenceIndicator = ({
  references,
}: { references: number[] }) => (
  <span data-testid="reference-indicator">Refs: {references.join(",")}</span>
);

// Mock the NeumorphicExpandButton
jest.mock("@/components/ui/NeumorphicExpandButton", () => ({
  NeumorphicExpandButton: ({
    onExpand,
    side,
  }: { onExpand?: () => void; side?: string }) => (
    <button
      data-testid="neumorphic-expand-button"
      data-side={side}
      onClick={onExpand}
    >
      Expand Button
    </button>
  ),
}));

describe("Notebook Action Style", () => {
  const defaultProps = {
    block: { type: "action", content: "Test action content" },
    references: [],
    hasReferences: false,
    MarkdownRenderer: MockMarkdownRenderer,
    EnhancedReferenceIndicator: MockEnhancedReferenceIndicator,
  };

  it("renders action block with neumorphic styling", () => {
    const result = notebookStyleRenderer(defaultProps);
    const { container } = render(<div>{result.element}</div>);

    const actionDiv = container.firstChild?.firstChild as HTMLElement;
    expect(actionDiv).toHaveClass("group", "min-h-[140px]", "rounded-2xl");
    expect(actionDiv).not.toHaveClass("pl-20"); // Should not have padding when no expand button
    expect(actionDiv).toHaveStyle({
      boxShadow: "10px 10px 20px #c2c2c2, -10px -10px 20px #ffffff",
    });
    expect(actionDiv).toHaveClass("linear-bg-1"); // Check for CSS class instead of inline background
  });

  it("renders content with markdown renderer", () => {
    const result = notebookStyleRenderer(defaultProps);
    render(<div>{result.element}</div>);

    expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      "Test action content",
    );
  });

  it("does not show expand button when expandable is false", () => {
    const result = notebookStyleRenderer(defaultProps);
    render(<div>{result.element}</div>);

    expect(
      screen.queryByTestId("neumorphic-expand-button"),
    ).not.toBeInTheDocument();
  });

  it("shows expand button when expandable is true", () => {
    const mockOnExpand = jest.fn();
    const propsWithExpandable = {
      ...defaultProps,
      block: { ...defaultProps.block, expandable: true },
      onExpand: mockOnExpand,
    };

    const result = notebookStyleRenderer(propsWithExpandable);
    const { container } = render(<div>{result.element}</div>);

    expect(screen.getByTestId("neumorphic-expand-button")).toBeInTheDocument();
    expect(screen.getByTestId("neumorphic-expand-button")).toHaveAttribute(
      "data-side",
      "left",
    );

    // Should have padding when expand button is present
    const actionDiv = container.firstChild?.firstChild as HTMLElement;
    expect(actionDiv).toHaveClass("pl-20");
  });

  it("calls onExpand with correct block when expand button clicked", () => {
    const mockOnExpand = jest.fn();
    const propsWithExpandable = {
      ...defaultProps,
      block: { ...defaultProps.block, expandable: true },
      onExpand: mockOnExpand,
    };

    const result = notebookStyleRenderer(propsWithExpandable);
    render(<div>{result.element}</div>);

    const expandButton = screen.getByTestId("neumorphic-expand-button");
    fireEvent.click(expandButton);

    expect(mockOnExpand).toHaveBeenCalledTimes(1);
    expect(mockOnExpand).toHaveBeenCalledWith(propsWithExpandable.block);
  });

  it("does not show expand button when onExpand is not provided", () => {
    const propsWithExpandableButNoCallback = {
      ...defaultProps,
      block: { ...defaultProps.block, expandable: true },
      // onExpand is undefined
    };

    const result = notebookStyleRenderer(propsWithExpandableButNoCallback);
    render(<div>{result.element}</div>);

    expect(
      screen.queryByTestId("neumorphic-expand-button"),
    ).not.toBeInTheDocument();
  });

  it("shows reference indicator when has references", () => {
    const propsWithReferences = {
      ...defaultProps,
      references: [1, 2, 3],
      hasReferences: true,
    };

    const result = notebookStyleRenderer(propsWithReferences);
    render(<div>{result.element}</div>);

    expect(screen.getByTestId("reference-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("reference-indicator")).toHaveTextContent(
      "Refs: 1,2,3",
    );
  });

  it("handles alternative block property names", () => {
    const propsWithAltNames = {
      ...defaultProps,
      block: { t: "action", c: "Alternative content format" },
    };

    const result = notebookStyleRenderer(propsWithAltNames);
    render(<div>{result.element}</div>);

    expect(screen.getByTestId("markdown-renderer")).toHaveTextContent(
      "Alternative content format",
    );
  });

  it("applies correct CSS classes for layout and animations", () => {
    const result = notebookStyleRenderer(defaultProps);
    const { container } = render(<div>{result.element}</div>);

    const actionDiv = container.firstChild?.firstChild as HTMLElement;
    expect(actionDiv).toHaveClass(
      "relative",
      "group",
      "min-h-[140px]",
      "flex",
      "justify-between",
      "items-center",
      "rounded-2xl",
      "p-5",
      "select-text",
      "transition-all",
      "duration-300",
      "ease-in-out",
    );
    // Should NOT have pl-20 when no expand button
    expect(actionDiv).not.toHaveClass("pl-20");
  });

  it("content has correct styling classes", () => {
    const result = notebookStyleRenderer(defaultProps);
    const { container } = render(<div>{result.element}</div>);

    const contentDiv = container.querySelector(".text-base");
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv).toHaveClass("text-base", "leading-relaxed", "flex-1");
  });

  it("returns correct hasCustomExpandButton flag", () => {
    // Test without expandable - should return false
    const result1 = notebookStyleRenderer(defaultProps);
    expect(result1.hasCustomExpandButton).toBe(false);

    // Test with expandable - should return true
    const mockOnExpand = jest.fn();
    const propsWithExpandable = {
      ...defaultProps,
      block: { ...defaultProps.block, expandable: true },
      onExpand: mockOnExpand,
    };
    const result2 = notebookStyleRenderer(propsWithExpandable);
    expect(result2.hasCustomExpandButton).toBe(true);
  });
});
