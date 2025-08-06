import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";
import * as promptsApi from "@/lib/api/services/prompts";
import * as contentApi from "@/lib/api/content";
import { ContentItemPublic } from "@/lib/api/content";

// Mock promptsApi
jest.mock("@/lib/api/services/prompts", () => ({
  getEnabledPrompts: jest.fn().mockResolvedValue([]),
  getDisabledPrompts: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/api/content", () => ({
  getContentConversations: jest.fn().mockResolvedValue({ conversations: [] }),
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
    // Remove the mockClear lines, as spyOn already handles it
    // (promptsApi.getEnabledPrompts as jest.Mock).mockClear();
    // etc.
    // Add @ts-expect-error for mockClear
    // @ts-expect-error - Mocked function
    (promptsApi.getEnabledPrompts as jest.Mock).mockClear();
    // @ts-expect-error - Mocked function
    (promptsApi.getDisabledPrompts as jest.Mock).mockClear();
    // @ts-expect-error - Mocked function
    (contentApi.getContentConversations as jest.Mock).mockClear();
  });

  it("should load prompts only once across multiple instances", async () => {
    // Render first instance
    const { unmount } = render(
      <ModernAnalysisInterface content={mockContent} variant="preview" />,
    );

    await waitFor(() => {
      // @ts-expect-error - Mocked function
      expect(promptsApi.getEnabledPrompts).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Render second instance
    render(<ModernAnalysisInterface content={mockContent} variant="preview" />);

    await waitFor(() => {
      // @ts-expect-error - Mocked function
      expect(promptsApi.getEnabledPrompts).toHaveBeenCalledTimes(1);
    });
  });
});
