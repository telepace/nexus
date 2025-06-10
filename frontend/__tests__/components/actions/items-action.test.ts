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

// 辅助函数：重置模块缓存
function clearItemsActionCache() {
  // 通过重新导入模块并手动重置缓存
  const itemsActionModule = require("@/components/actions/items-action");
  // 访问模块内部的缓存变量并重置
  if (itemsActionModule && typeof itemsActionModule === 'object') {
    // 直接访问模块的内部状态（虽然不是最佳实践，但这是测试需要）
    eval(`
      const itemsActionPath = require.resolve("@/components/actions/items-action");
      if (require.cache[itemsActionPath]) {
        // 通过直接修改模块代码中的缓存变量
        const moduleCode = require.cache[itemsActionPath].exports;
        // 这种方式对于模块级变量不太有效，我们需要另一种方法
      }
    `);
  }
}

describe("fetchItems function", () => {
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 清除模块缓存
    jest.resetModules();

    // 设置默认的成功 mock - 确保返回有效的字符串
    mockRequireAuth.mockResolvedValue({ 
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User"
    } as any);
    mockGetAuthToken.mockResolvedValue("test-token-12345");
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

    // 动态导入以获取新的模块实例
    const { fetchItems: freshFetchItems } = require("@/components/actions/items-action");

    // Act
    const result = await freshFetchItems();

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockItems);
    expect(mockContentListContentItemsEndpoint).toHaveBeenCalledWith({
      headers: {
        Authorization: "Bearer test-token-12345",
      },
    });
  });

  it("should return error object when API returns non-array response", async () => {
    // Arrange
    const mockApiResponse = {
      message: "Success",
      status: "ok"
    };

    mockContentListContentItemsEndpoint.mockResolvedValue(
      mockApiResponse as any,
    );

    // 动态导入以获取新的模块实例
    const { fetchItems: freshFetchItems } = require("@/components/actions/items-action");

    // Act
    const result = await freshFetchItems();

    // Assert
    expect(result).toEqual({
      error: "API返回了意外的数据格式: object",
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

    // 动态导入以获取新的模块实例
    const { fetchItems: freshFetchItems } = require("@/components/actions/items-action");

    // Act
    const result = await freshFetchItems();

    // Assert - 现在应该正确提取 data 数组
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockWrappedResponse.data);
  });

  it("should return error when API throws exception", async () => {
    // Arrange
    const mockError = new Error("Network error");
    mockContentListContentItemsEndpoint.mockRejectedValue(mockError);

    // 动态导入以获取新的模块实例
    const { fetchItems: freshFetchItems } = require("@/components/actions/items-action");

    // Act
    const result = await freshFetchItems();

    // Assert
    expect(result).toEqual({
      error: "获取数据失败: Network error",
      status: 500,
    });
  });

  it("should return error when API returns null/undefined", async () => {
    // Arrange
    mockContentListContentItemsEndpoint.mockResolvedValue(null as any);

    // 动态导入以获取新的模块实例
    const { fetchItems: freshFetchItems } = require("@/components/actions/items-action");

    // Act
    const result = await freshFetchItems();

    // Assert
    expect(result).toEqual({
      error: "服务器返回空响应",
    });
  });
});
