import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock MarkdownRenderer 為簡易 span，避免解析開銷
jest.mock("@/components/ui/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: any) => <span>{content}</span>,
}));

// 直接引入待測組件
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";

const sampleContent = `{"type":"p","content":"Hello world"}\n{"type":"insight","content":"Small idea"}`;

describe("JsonlRenderer – 卡片與容器樣式", () => {
  it("BlockWrapper 應包含 group 和正確的間距類名", () => {
    render(<JsonlRenderer content={sampleContent} styleName="neumorphism" />);

    const pText = screen.getByText("Hello world");
    const wrapper = pText.closest("div.group");
    expect(wrapper).toHaveClass("group", "relative", "rounded-lg");
    expect(wrapper).toHaveClass("px-3", "py-2", "my-0.5");
    expect(wrapper).toHaveClass("hoverable-block");
  });

  it("paragraph 行應使用 Neumorphism 卡片外殼 (shadow)", () => {
    render(<JsonlRenderer content={sampleContent} styleName="neumorphism" />);

    const pText = screen.getByText("Hello world");
    const card = pText.closest("div");
    expect(card).toHaveClass(
      "shadow-[7px_7px_15px_#bdbdbd,_-7px_-7px_15px_rgba(255,255,255,0.8)]",
    );
  });
});
