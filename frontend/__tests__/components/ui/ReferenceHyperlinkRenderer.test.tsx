import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  ReferenceHyperlinkRenderer,
  InlineReferences,
  BadgeReferences,
  MinimalReferences,
} from "@/components/ui/ReferenceHyperlinkRenderer";

// Mock the ReferenceManager
jest.mock("@/components/ui/ReferenceManager", () => ({
  useReferenceManagerSafe: () => ({
    actions: {
      jumpToParagraph: jest.fn(),
      parseReferences: jest.fn((refString?: string) => {
        if (!refString) return [];
        return refString
          .split(",")
          .map((ref) => parseInt(ref.trim(), 10))
          .filter((num) => !isNaN(num));
      }),
      getReferenceInfo: jest.fn((refId: number) => ({
        refId,
        paragraphId: `para-${refId}`,
        snippet: `这是第${refId}段的内容预览...`,
      })),
    },
  }),
}));

describe("ReferenceHyperlinkRenderer", () => {
  describe("basic rendering", () => {
    it("should render single reference correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1" />);

      const link = screen.getByRole("link", { name: /跳转到第1段/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("1");
      expect(link).toHaveAttribute("href", "#ref-1");
    });

    it("should render multiple references correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1,3,5" />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();

      // Check for separators
      expect(screen.getAllByText("·")).toHaveLength(2);
    });

    it("should render range references correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1-3" />);

      const link = screen.getByRole("link");
      expect(link).toHaveTextContent("1-3");
    });

    it("should not render anything for empty refString", () => {
      const { container } = render(<ReferenceHyperlinkRenderer refString="" />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render anything for undefined refString", () => {
      const { container } = render(<ReferenceHyperlinkRenderer />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("variants", () => {
    it("should apply default variant styles correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1" variant="default" />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("w-6", "h-6", "rounded-full");
    });

    it("should apply minimal variant styles correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1" variant="minimal" />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("text-xs");
    });

    it("should apply badge variant styles correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1" variant="badge" />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("rounded-full", "bg-primary/10");
    });

    it("should apply inline variant styles correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1" variant="inline" />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("text-blue-600", "hover:underline");
    });
  });

  describe("maxVisible prop", () => {
    it("should limit visible references and show overflow count", () => {
      render(
        <ReferenceHyperlinkRenderer refString="1,2,3,4,5,6" maxVisible={3} />,
      );

      // Should show first 3 references
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      // Should not show the rest directly
      expect(screen.queryByText("4")).not.toBeInTheDocument();
      expect(screen.queryByText("5")).not.toBeInTheDocument();
      expect(screen.queryByText("6")).not.toBeInTheDocument();

      // Should show overflow indicator
      expect(screen.getByText("+3")).toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onReferenceClick when clicked", () => {
      const mockClick = jest.fn();
      render(
        <ReferenceHyperlinkRenderer
          refString="1"
          onReferenceClick={mockClick}
        />,
      );

      const link = screen.getByRole("link");
      fireEvent.click(link);

      expect(mockClick).toHaveBeenCalledWith(1);
    });

    it("should prevent default link behavior", () => {
      const mockClick = jest.fn();
      render(
        <ReferenceHyperlinkRenderer
          refString="1"
          onReferenceClick={mockClick}
        />,
      );

      const link = screen.getByRole("link");
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      fireEvent(link, event);

      expect(event.defaultPrevented).toBe(true);
    });

    it("should show tooltip on hover when enabled", async () => {
      render(<ReferenceHyperlinkRenderer refString="1" showTooltip={true} />);

      const link = screen.getByRole("link");
      fireEvent.mouseEnter(link);

      await waitFor(() => {
        expect(screen.getByText("跳转到第1段")).toBeInTheDocument();
      });
    });
  });

  describe("complex reference patterns", () => {
    it("should handle mixed references correctly", () => {
      render(<ReferenceHyperlinkRenderer refString="1,3-5,8,10-12" />);

      // Check that groups are formed correctly
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("3-5")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("10-12")).toBeInTheDocument();
    });

    it("should handle large reference sets gracefully", () => {
      const largeRefString = Array.from({ length: 50 }, (_, i) => i + 1).join(
        ",",
      );
      render(
        <ReferenceHyperlinkRenderer
          refString={largeRefString}
          maxVisible={5}
        />,
      );

      // Should show limited references plus overflow
      const links = screen.getAllByRole("link");
      expect(links.length).toBeLessThanOrEqual(5);

      // Should show overflow count
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ReferenceHyperlinkRenderer refString="1,2,3" />);

      const navigation = screen.getByRole("navigation");
      expect(navigation).toHaveAttribute("aria-label", "文档引用");

      const links = screen.getAllByRole("link");
      links.forEach((link, index) => {
        expect(link).toHaveAttribute(
          "aria-label",
          expect.stringContaining("跳转到第"),
        );
      });
    });

    it("should have screen reader friendly content", () => {
      render(<ReferenceHyperlinkRenderer refString="1,2,3" />);

      const srText = screen.getByText(/引用\d+个段落/);
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("preset components", () => {
    it("should render InlineReferences correctly", () => {
      render(<InlineReferences refString="1,2,3" />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);

      // Should use inline variant styles
      links.forEach((link) => {
        expect(link).toHaveClass("text-blue-600");
      });
    });

    it("should render BadgeReferences correctly", () => {
      render(<BadgeReferences refString="1,2,3" />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);

      // Should use badge variant styles
      links.forEach((link) => {
        expect(link).toHaveClass("rounded-full", "bg-primary/10");
      });
    });

    it("should render MinimalReferences correctly", () => {
      render(<MinimalReferences refString="1,2,3" />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);

      // Should use minimal variant styles
      links.forEach((link) => {
        expect(link).toHaveClass("text-xs");
      });
    });
  });

  describe("error handling", () => {
    it("should handle malformed reference strings gracefully", () => {
      render(<ReferenceHyperlinkRenderer refString="1,abc,3,def" />);

      // Should only render valid references
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.queryByText("abc")).not.toBeInTheDocument();
      expect(screen.queryByText("def")).not.toBeInTheDocument();
    });

    it("should handle edge cases without crashing", () => {
      const edgeCases = ["", "0", "-1", "1-", "-3", "1,2,", ",3,4"];

      edgeCases.forEach((refString) => {
        expect(() => {
          render(<ReferenceHyperlinkRenderer refString={refString} />);
        }).not.toThrow();
      });
    });
  });

  describe("performance", () => {
    it("should render large reference sets efficiently", () => {
      const start = performance.now();
      const largeRefString = Array.from({ length: 100 }, (_, i) => i + 1).join(
        ",",
      );

      render(<ReferenceHyperlinkRenderer refString={largeRefString} />);

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should render within 100ms
    });

    it("should handle rapid re-renders efficiently", () => {
      const { rerender } = render(<ReferenceHyperlinkRenderer refString="1" />);

      const start = performance.now();
      for (let i = 0; i < 10; i++) {
        rerender(<ReferenceHyperlinkRenderer refString={`${i + 1}`} />);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should handle re-renders efficiently
    });
  });
});
