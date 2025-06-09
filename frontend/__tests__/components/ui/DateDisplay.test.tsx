import React from "react";
import { render, screen } from "@testing-library/react";
import { DateDisplay } from "@/components/ui/DateDisplay";

// Mock the time zone context
jest.mock("@/lib/time-zone-context", () => ({
  useTimeZone: () => ({
    timeZone: "UTC",
  }),
}));

// Mock date utility functions
jest.mock("@/lib/date", () => ({
  formatDate: jest.fn(),
  formatRelativeTime: jest.fn(),
  formatTimeDistance: jest.fn(),
}));

describe("DateDisplay Component", () => {
  const mockFormatDate = require("@/lib/date").formatDate;
  const mockFormatRelativeTime = require("@/lib/date").formatRelativeTime;
  const mockFormatTimeDistance = require("@/lib/date").formatTimeDistance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Valid dates", () => {
    test("should render absolute date format", () => {
      const validDate = "2023-06-15T12:00:00Z";
      mockFormatDate.mockReturnValue("2023-06-15 12:00:00");

      render(<DateDisplay date={validDate} format="absolute" />);

      expect(mockFormatDate).toHaveBeenCalledWith(
        validDate,
        "yyyy-MM-dd HH:mm:ss",
        {
          timeZone: "UTC",
          showTimeZone: false,
        },
      );
      expect(screen.getByText("2023-06-15 12:00:00")).toBeInTheDocument();
    });

    test("should render relative date format", () => {
      const validDate = "2023-06-15T12:00:00Z";
      mockFormatRelativeTime.mockReturnValue("yesterday");

      render(<DateDisplay date={validDate} format="relative" />);

      expect(mockFormatRelativeTime).toHaveBeenCalledWith(
        validDate,
        undefined,
        { timeZone: "UTC" },
      );
      expect(screen.getByText("yesterday")).toBeInTheDocument();
    });

    test("should render distance date format", () => {
      const validDate = "2023-06-15T12:00:00Z";
      mockFormatTimeDistance.mockReturnValue("3 hours ago");

      render(<DateDisplay date={validDate} format="distance" />);

      expect(mockFormatTimeDistance).toHaveBeenCalledWith(
        validDate,
        undefined,
        { timeZone: "UTC" },
      );
      expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    });
  });

  describe("Invalid dates", () => {
    test("should return null for empty string", () => {
      const { container } = render(<DateDisplay date="" />);
      expect(container.firstChild).toBeNull();
    });

    test("should return null for null date", () => {
      const { container } = render(<DateDisplay date={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    test("should return null for undefined date", () => {
      const { container } = render(<DateDisplay date={undefined as any} />);
      expect(container.firstChild).toBeNull();
    });

    test("should handle invalid date string gracefully", () => {
      const invalidDate = "invalid-date-string";
      mockFormatDate.mockReturnValue("Invalid Date");

      // This should not throw an error
      expect(() => {
        render(<DateDisplay date={invalidDate} format="absolute" />);
      }).not.toThrow();
    });

    test("should handle invalid date object gracefully", () => {
      const invalidDate = new Date("invalid");
      mockFormatDate.mockReturnValue("Invalid Date");

      // This should not throw an error
      expect(() => {
        render(<DateDisplay date={invalidDate} format="absolute" />);
      }).not.toThrow();
    });

    test("should handle NaN timestamp gracefully", () => {
      const invalidTimestamp = NaN;
      mockFormatDate.mockReturnValue("Invalid Date");

      // This should not throw an error
      expect(() => {
        render(<DateDisplay date={invalidTimestamp} format="absolute" />);
      }).not.toThrow();
    });
  });

  describe("Edge cases for dateTime attribute", () => {
    test("should handle invalid date in dateTime attribute", () => {
      const invalidDate = "invalid-date-string";
      mockFormatDate.mockReturnValue("Invalid Date");

      // Mock console.error to suppress error logs during test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      render(<DateDisplay date={invalidDate} format="absolute" />);

      // The component should render despite invalid date
      expect(screen.getByText("Invalid Date")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
