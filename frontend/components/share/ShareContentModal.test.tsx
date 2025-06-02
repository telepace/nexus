import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareContentModal } from "./ShareContentModal";
import { client } from "@/app/openapi-client/index";
import { Toaster } from "@/components/ui/sonner";

// 临时定义缺失的类型
interface ContentItemPublic {
  id: string;
  title: string;
  content?: string;
  content_text?: string;
  user_id?: string;
  type?: string;
  processing_status?: string;
  created_at?: string;
  updated_at?: string;
}

interface ContentSharePublic {
  id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  access_count: number;
  max_access_count?: number;
  content_item_title?: string;
  content_item_id?: string;
}

// Mock the API client
jest.mock("@/app/openapi-client/index", () => ({
  client: {
    createShareLink: jest.fn(),
  },
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockContentItem: ContentItemPublic = {
  id: "item-123",
  title: "Test Content Item for Sharing",
  user_id: "user-abc",
  type: "text",
  processing_status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Add other required fields for ContentItemPublic if any
};

describe("ShareContentModal", () => {
  beforeEach(() => {
    // Clear mocks before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((client as any).createShareLink as jest.Mock).mockClear();
    mockToast.mockClear();
  });

  const renderModal = (
    props: Partial<React.ComponentProps<typeof ShareContentModal>> = {},
  ) => {
    return render(
      <>
        <ShareContentModal
          open={true}
          onOpenChange={jest.fn()}
          contentItem={mockContentItem}
          {...props}
        />
        <Toaster /> {/* Needed for toasts to be rendered */}
      </>,
    );
  };

  it("renders with content item title", () => {
    renderModal();
    expect(
      screen.getByText(`Share: ${mockContentItem.title}`),
    ).toBeInTheDocument();
  });

  it("allows setting expiration date, max access count, and password", async () => {
    const user = userEvent.setup();
    renderModal();

    // Expiration date (simplified: check if button exists, actual date picking is complex to test here)
    const datePickerButton = screen.getByText("Pick a date");
    expect(datePickerButton).toBeInTheDocument();
    // await user.click(datePickerButton); // This would open popover, then need to select a day

    // Max access count
    const maxAccessInput = screen.getByLabelText(/Max Accesses/i);
    await user.type(maxAccessInput, "10");
    expect(maxAccessInput).toHaveValue(10);

    // Password
    const passwordInput = screen.getByLabelText(/Password/i);
    await user.type(passwordInput, "secret123");
    expect(passwordInput).toHaveValue("secret123");
  });

  it("calls API to generate share link and displays it on success", async () => {
    const user = userEvent.setup();
    const mockShareResponse: ContentSharePublic = {
      id: "share-xyz",
      share_token: "test-share-token-123",
      created_at: new Date().toISOString(),
      is_active: true,
      access_count: 0,
      // other fields from ContentSharePublic if needed
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((client as any).createShareLink as jest.Mock).mockResolvedValueOnce(
      mockShareResponse,
    );

    renderModal();

    await user.type(screen.getByLabelText(/Max Accesses/i), "5");
    await user.type(screen.getByLabelText(/Password/i), "securepass");

    // For date, we can't easily select from calendar in test, so we'll skip direct date input test here
    // or mock the date state change if ShareContentModal allows setting date programmatically for tests.

    const generateButton = screen.getByRole("button", {
      name: /Generate Share Link/i,
    });
    fireEvent.click(generateButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).createShareLink).toHaveBeenCalledWith(
        mockContentItem.id,
        expect.objectContaining({
          expires_at: expect.any(String),
          password: "",
          max_access_count: null,
        }),
      );
    });

    await waitFor(() => {
      const expectedShareUrl = `${window.location.origin}/share/${mockShareResponse.share_token}`;
      expect(screen.getByDisplayValue(expectedShareUrl)).toBeInTheDocument();
      expect(
        screen.getByDisplayValue(`Token: ${mockShareResponse.share_token}`),
      ).toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success" }),
    );
  });

  it("displays error message on API failure", async () => {
    // const user = userEvent.setup(); // 暂时未使用
    const errorMessage = "Network Error";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((client as any).createShareLink as jest.Mock).mockRejectedValueOnce({
      // Simulate error structure from API client/axios
      isAxiosError: true,
      response: { data: { detail: errorMessage } },
      message: "Network Error", // Fallback
    });

    renderModal();
    const generateButton = screen.getByRole("button", {
      name: /Generate Share Link/i,
    });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", variant: "destructive" }),
    );
  });

  it("resets form when modal is closed or contentItem changes", () => {
    const { rerender } = renderModal({
      open: true,
      contentItem: mockContentItem,
    });

    const maxAccessInput = screen.getByLabelText(
      /Max Accesses/i,
    ) as HTMLInputElement;
    fireEvent.change(maxAccessInput, { target: { value: "10" } });
    expect(maxAccessInput.value).toBe("10");

    // Simulate closing the modal
    rerender(
      <ShareContentModal
        open={false}
        onOpenChange={jest.fn()}
        contentItem={mockContentItem}
      />,
    );

    // Re-render as open with same item, should be reset (due to useEffect dependency on `open`)
    rerender(
      <ShareContentModal
        open={true}
        onOpenChange={jest.fn()}
        contentItem={mockContentItem}
      />,
    );
    const maxAccessInputAfterCloseOpen = screen.getByLabelText(
      /Max Accesses/i,
    ) as HTMLInputElement;
    expect(maxAccessInputAfterCloseOpen.value).toBe(""); // Assuming it resets to empty string

    // Simulate changing content item
    const anotherItem = {
      ...mockContentItem,
      id: "item-456",
      title: "Another Item",
    };
    rerender(
      <ShareContentModal
        open={true}
        onOpenChange={jest.fn()}
        contentItem={anotherItem}
      />,
    );
    const maxAccessInputAfterItemChange = screen.getByLabelText(
      /Max Accesses/i,
    ) as HTMLInputElement;
    expect(maxAccessInputAfterItemChange.value).toBe("");
  });
});
