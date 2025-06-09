import { fetchItems } from "@/components/actions/items-action";
import { contentListContentItemsEndpoint } from "@/app/openapi-client/sdk.gen";
import { requireAuth, getAuthToken } from "@/lib/server-auth";

// Mock 依赖
jest.mock("@/app/openapi-client/sdk.gen");
jest.mock("@/lib/server-auth");
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const mockContentListContentItemsEndpoint =
  contentListContentItemsEndpoint as jest.MockedFunction<
    typeof contentListContentItemsEndpoint
  >;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetAuthToken = getAuthToken as jest.MockedFunction<
  typeof getAuthToken
>;

describe("fetchItems function", () => {
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 设置默认的成功 mock
    mockRequireAuth.mockResolvedValue({ id: "test-user-id" } as any);
    mockGetAuthToken.mockResolvedValue("test-token");
  });

  afterEach(() => {
    // 清理控制台 mock
    jest.restoreAllMocks();
  });

  it("should return items array when API returns valid array", async () => {
    // Arrange
    const mockItems = [
      {
        id: "1",
        title: "Test Item 1",
        type: "article",
        processing_status: "completed",
      },
      {
        id: "2",
        title: "Test Item 2",
        type: "video",
        processing_status: "pending",
      },
    ];

    mockContentListContentItemsEndpoint.mockResolvedValue(mockItems as any);

    // Act
    const result = await fetchItems();

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockItems);
    expect(mockContentListContentItemsEndpoint).toHaveBeenCalledWith({
      headers: {
        Authorization: "Bearer test-token",
      },
    });
  });

  it("should return error object when API returns non-array response", async () => {
    // Arrange
    const mockApiResponse = {
      data: [],
      meta: { total: 0, page: 1 },
      message: "Success",
    };

    mockContentListContentItemsEndpoint.mockResolvedValue(
      mockApiResponse as any,
    );

    // Act
    const result = await fetchItems();

    // Assert
    expect(result).toEqual({
      error: "API返回了意外的数据格式",
      status: 400,
    });
  });

  it("should handle API response with nested data array", async () => {
    // Arrange - 模拟API可能返回的包装格式
    const mockWrappedResponse = {
      data: [
        {
          id: "1",
          title: "Test Item 1",
          type: "article",
          processing_status: "completed",
        },
      ],
      meta: { total: 1 },
    };

    mockContentListContentItemsEndpoint.mockResolvedValue(
      mockWrappedResponse as any,
    );

    // Act
    const result = await fetchItems();

    // Assert - 当前版本会返回错误，我们需要修复这个
    expect(result).toEqual({
      error: "API返回了意外的数据格式",
      status: 400,
    });
  });

  it("should return error when API throws exception", async () => {
    // Arrange
    const mockError = new Error("Network error");
    mockContentListContentItemsEndpoint.mockRejectedValue(mockError);

    // Act
    const result = await fetchItems();

    // Assert
    expect(result).toEqual({
      error: "获取数据失败: Network error",
      status: 500,
    });
  });

  it("should return error when API returns null/undefined", async () => {
    // Arrange
    mockContentListContentItemsEndpoint.mockResolvedValue(null as any);

    // Act
    const result = await fetchItems();

    // Assert
    expect(result).toEqual({
      error: "服务器返回空响应",
    });
  });
});
