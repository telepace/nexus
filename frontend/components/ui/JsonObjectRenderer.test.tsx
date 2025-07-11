import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonObjectRenderer } from "./JsonObjectRenderer";

// Mock the toast function
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("JsonObjectRenderer", () => {
  it("renders simple JSON object correctly", () => {
    const data = { key: "value", number: 123 };
    render(<JsonObjectRenderer data={data} />);
    
    expect(screen.getByText('"key":')).toBeInTheDocument();
    expect(screen.getByText('"value"')).toBeInTheDocument();
    expect(screen.getByText('"number":')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it("renders JSON string correctly", () => {
    const jsonString = '{"key": "value", "number": 123}';
    render(<JsonObjectRenderer data={jsonString} />);
    
    expect(screen.getByText('"key":')).toBeInTheDocument();
    expect(screen.getByText('"value"')).toBeInTheDocument();
  });

  it("renders arrays correctly", () => {
    const data = { items: [1, 2, 3] };
    render(<JsonObjectRenderer data={data} />);
    
    expect(screen.getByText('"items":')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it("handles null values", () => {
    const data = { nullValue: null };
    render(<JsonObjectRenderer data={data} />);
    
    expect(screen.getByText('"nullValue":')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it("handles boolean values", () => {
    const data = { isTrue: true, isFalse: false };
    render(<JsonObjectRenderer data={data} />);
    
    expect(screen.getByText('"isTrue":')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('"isFalse":')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  it("shows copy button by default", () => {
    const data = { key: "value" };
    render(<JsonObjectRenderer data={data} />);
    
    const copyButton = screen.getByTitle("复制JSON");
    expect(copyButton).toBeInTheDocument();
  });

  it("hides copy button when showCopyButton is false", () => {
    const data = { key: "value" };
    render(<JsonObjectRenderer data={data} showCopyButton={false} />);
    
    const copyButton = screen.queryByTitle("复制JSON");
    expect(copyButton).not.toBeInTheDocument();
  });

  it("handles invalid JSON string gracefully", () => {
    const invalidJson = '{"invalid": json}';
    render(<JsonObjectRenderer data={invalidJson} />);
    
    // Should fall back to plain text display
    expect(screen.getByText(invalidJson)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const data = { key: "value" };
    const customClass = "custom-test-class";
    render(<JsonObjectRenderer data={data} className={customClass} />);
    
    const container = screen.getByText('"key":').closest('.relative');
    expect(container).toHaveClass(customClass);
  });

  it("renders nested structure", () => {
    const data = { level1: { key: "value" } };
    render(<JsonObjectRenderer data={data} />);
    
    // Check if the container structure is rendered correctly
    const container = screen.getByTitle("复制JSON").closest('.relative');
    expect(container).toBeInTheDocument();
    
    // Check if the JSON tree container exists
    const jsonTree = container?.querySelector('.bg-gray-50');
    expect(jsonTree).toBeInTheDocument();
  });

  it("supports collapsible structure", () => {
    const data = { level1: { key: "value" } };
    render(<JsonObjectRenderer data={data} defaultExpandDepth={1} />);
    
    // Check if chevron SVG elements are present (indicating collapsible structure)
    const container = screen.getByTitle("复制JSON").closest('.relative');
    const chevronSvgs = container?.querySelectorAll('svg.lucide-chevron-down, svg.lucide-chevron-right');
    expect(chevronSvgs && chevronSvgs.length > 0).toBe(true);
  });
}); 