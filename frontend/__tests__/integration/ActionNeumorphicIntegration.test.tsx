import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";

// Mock dependencies that aren't needed for this integration test
jest.mock("@/components/ui/ReferenceManager", () => ({
  useReferenceManagerSafe: () => ({
    actions: {
      parseReferences: (ref: string | undefined) =>
        ref ? ref.split(",").map(Number) : [],
    },
  }),
  EnhancedReferenceIndicator: ({ references }: { references: number[] }) => (
    <span data-testid="reference-indicator">Refs: {references.join(",")}</span>
  ),
}));

jest.mock("@/components/ui/ContentSkeleton", () => ({
  ContentSkeleton: () => <div data-testid="content-skeleton">Loading...</div>,
}));

// Mock tooltip components
jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Action Neumorphic Integration", () => {
  const testJsonlContent = `
{"type": "h1", "content": "Test Header"}
{"type": "action", "content": "Regular action without expand button"}
{"type": "action", "content": "Expandable action with button", "expandable": true}
{"type": "insight", "content": "Regular insight block"}
`;

  it("renders action blocks with correct neumorphic styling", () => {
    render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="notebook"
        enableHoverEffects={true}
      />,
    );

    // Check that action blocks are rendered
    const actionBlocks = screen.getAllByText(/action/i);
    expect(actionBlocks).toHaveLength(2);
  });

  it("shows expand button only for expandable action blocks", async () => {
    const mockOnExpandLine = jest.fn();

    render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="notebook"
        onExpandLine={mockOnExpandLine}
        enableHoverEffects={true}
      />,
    );

    // Wait for content to render
    await waitFor(() => {
      expect(
        screen.getByText("Regular action without expand button"),
      ).toBeInTheDocument();
    });

    // Get all expand buttons - should only be one for the expandable action
    const expandButtons = screen.queryAllByText("深入挖掘");
    expect(expandButtons).toHaveLength(1);
  });

  it("triggers onExpandLine when expand button is clicked", async () => {
    const mockOnExpandLine = jest.fn();

    render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="notebook"
        onExpandLine={mockOnExpandLine}
        enableHoverEffects={true}
      />,
    );

    // Wait for content to render
    await waitFor(() => {
      expect(
        screen.getByText("Expandable action with button"),
      ).toBeInTheDocument();
    });

    // Find and click the expand button
    const expandButton = screen.getByText("深入挖掘");
    fireEvent.click(expandButton);

    // Verify onExpandLine was called with correct JSON content
    expect(mockOnExpandLine).toHaveBeenCalledTimes(1);
    expect(mockOnExpandLine).toHaveBeenCalledWith({
      type: "action",
      content: "Expandable action with button",
      expandable: true,
    });
  });

  it("does not affect other block types styling", () => {
    render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="notebook"
        enableHoverEffects={true}
      />,
    );

    // Check that insight block is rendered normally
    expect(screen.getByText("Regular insight block")).toBeInTheDocument();

    // Check that header is rendered normally
    expect(screen.getByText("Test Header")).toBeInTheDocument();
  });

  it("works with different style renderers", () => {
    // Test with default style
    const { rerender } = render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="default"
        enableHoverEffects={true}
      />,
    );

    expect(
      screen.getByText("Regular action without expand button"),
    ).toBeInTheDocument();

    // Test with headspace style
    rerender(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="headspace"
        enableHoverEffects={true}
      />,
    );

    expect(
      screen.getByText("Regular action without expand button"),
    ).toBeInTheDocument();
  });

  it("handles button hover state correctly", async () => {
    const mockOnExpandLine = jest.fn();

    const { container } = render(
      <JsonlRenderer
        content={testJsonlContent}
        styleName="notebook"
        onExpandLine={mockOnExpandLine}
        enableHoverEffects={true}
      />,
    );

    // Wait for content to render
    await waitFor(() => {
      expect(
        screen.getByText("Expandable action with button"),
      ).toBeInTheDocument();
    });

    // Find the expand button
    const expandButton = container.querySelector("button");
    expect(expandButton).toBeInTheDocument();

    if (expandButton) {
      // Test hover behavior
      fireEvent.mouseEnter(expandButton);
      await waitFor(() => {
        expect(expandButton).toHaveClass("w-36");
      });

      fireEvent.mouseLeave(expandButton);
      await waitFor(() => {
        expect(expandButton).toHaveClass("w-10");
      });
    }
  });

  it("prevents event propagation on button click", async () => {
    const mockOnExpandLine = jest.fn();
    const mockParentClick = jest.fn();

    render(
      <div onClick={mockParentClick}>
        <JsonlRenderer
          content={testJsonlContent}
          styleName="notebook"
          onExpandLine={mockOnExpandLine}
          enableHoverEffects={true}
        />
      </div>,
    );

    // Wait for content to render
    await waitFor(() => {
      expect(
        screen.getByText("Expandable action with button"),
      ).toBeInTheDocument();
    });

    // Click the expand button
    const expandButton = screen.getByText("深入挖掘");
    fireEvent.click(expandButton);

    // Verify expand callback was called but parent click was not
    expect(mockOnExpandLine).toHaveBeenCalledTimes(1);
    expect(mockParentClick).not.toHaveBeenCalled();
  });

  it("handles malformed JSON gracefully", () => {
    const malformedContent = `
{"type": "action", "content": "Valid action"}
{invalid json}
{"type": "action", "content": "Another valid action", "expandable": true}
`;

    const mockOnExpandLine = jest.fn();

    render(
      <JsonlRenderer
        content={malformedContent}
        styleName="notebook"
        onExpandLine={mockOnExpandLine}
        enableHoverEffects={true}
      />,
    );

    // Should still render valid action blocks
    expect(screen.getByText("Valid action")).toBeInTheDocument();
    expect(screen.getByText("Another valid action")).toBeInTheDocument();

    // Should also render malformed JSON as fallback paragraph
    expect(screen.getByText("{invalid json}")).toBeInTheDocument();
  });
});
