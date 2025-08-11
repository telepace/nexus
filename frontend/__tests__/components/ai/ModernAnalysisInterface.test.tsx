import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";
import * as contentApi from "@/lib/api/content";
import { ContentItemPublic } from "@/lib/api/content";

// Mock content API
jest.mock("@/lib/api/content", () => ({
  getContentConversations: jest.fn().mockResolvedValue({ conversations: [] }),
}));

// Mock LLM Analysis Store
const mockLoadPrompts = jest.fn();
jest.mock("@/lib/stores/llm-analysis-store", () => ({
  useLLMAnalysisStore: () => ({
    enabledPrompts: [],
    isLoadingPrompts: false,
    loadPrompts: mockLoadPrompts,
  }),
}));

const mockContent: ContentItemPublic = {
  id: "1",
  title: "Test Content",
  summary: null,
  content_text: "Test text",
  meta_info: "{}",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "user1",
  processing_status: "active",
  source_uri: null,
  type: "text",
};

describe("ModernAnalysisInterface - Prompts Loading", () => {
  beforeEach(() => {
    mockLoadPrompts.mockClear();
    // @ts-expect-error - Mocked function  
    (contentApi.getContentConversations as jest.Mock).mockClear();
  });

  it("should load prompts when component mounts", async () => {
    // Render instance
    const { unmount } = render(
      <ModernAnalysisInterface content={mockContent} variant="preview" />,
    );

    await waitFor(() => {
      expect(mockLoadPrompts).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Render second instance  
    render(<ModernAnalysisInterface content={mockContent} variant="preview" />);

    await waitFor(() => {
      expect(mockLoadPrompts).toHaveBeenCalledTimes(2);
    });
  });
});
