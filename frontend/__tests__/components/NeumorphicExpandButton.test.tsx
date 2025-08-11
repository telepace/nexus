import React from "react";
import { render, screen, fireEvent, waitFor } from "@/__tests__/test-utils";
import "@testing-library/jest-dom";
import { NeumorphicExpandButton } from "@/components/ui/NeumorphicExpandButton";

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

describe("NeumorphicExpandButton", () => {
  it("renders correctly with default props", () => {
    render(<NeumorphicExpandButton />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("w-10", "h-10", "rounded-full");
  });

  it("shows search icon initially", () => {
    render(<NeumorphicExpandButton />);

    const icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("expands on hover", async () => {
    render(<NeumorphicExpandButton />);

    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button);

    await waitFor(() => {
      expect(button).toHaveClass("w-36");
    });

    // Check that text appears
    expect(screen.getByText("深入挖掘")).toBeInTheDocument();
  });

  it("contracts on mouse leave", async () => {
    render(<NeumorphicExpandButton />);

    const button = screen.getByRole("button");

    // First hover
    fireEvent.mouseEnter(button);
    await waitFor(() => {
      expect(button).toHaveClass("w-36");
    });

    // Then leave
    fireEvent.mouseLeave(button);
    await waitFor(() => {
      expect(button).toHaveClass("w-10");
    });
  });

  it("calls onExpand when clicked", () => {
    const mockOnExpand = jest.fn();
    render(<NeumorphicExpandButton onExpand={mockOnExpand} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnExpand).toHaveBeenCalledTimes(1);
  });

  it("prevents event propagation when clicked", () => {
    const mockOnExpand = jest.fn();
    const mockParentClick = jest.fn();

    render(
      <div onClick={mockParentClick}>
        <NeumorphicExpandButton onExpand={mockOnExpand} />
      </div>,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnExpand).toHaveBeenCalledTimes(1);
    expect(mockParentClick).not.toHaveBeenCalled();
  });

  it("positions correctly on left side", () => {
    const { container } = render(<NeumorphicExpandButton side="left" />);

    const positionedElement = container.querySelector(".left-6");
    expect(positionedElement).toBeInTheDocument();
  });

  it("positions correctly on right side", () => {
    const { container } = render(<NeumorphicExpandButton side="right" />);

    const positionedElement = container.querySelector(".right-6");
    expect(positionedElement).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <NeumorphicExpandButton className="custom-class" />,
    );

    const customElement = container.querySelector(".custom-class");
    expect(customElement).toBeInTheDocument();
  });

  it("has correct neumorphic styling", () => {
    render(<NeumorphicExpandButton />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("linear-bg-1");
    expect(button).toHaveClass(
      "shadow-[5px_5px_10px_#c2c2c2,-5px_-5px_10px_#ffffff]",
    );
  });

  it("shows active/pressed state styling", () => {
    render(<NeumorphicExpandButton />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "active:shadow-[inset_5px_5px_10px_#c2c2c2,inset_-5px_-5px_10px_#ffffff]",
    );
  });
});
