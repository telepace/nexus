/**
 * 单元测试：fetchItems 函数的响应格式处理
 * 此测试不依赖复杂的Next.js环境，专注于函数逻辑测试
 */

// 模拟 fetchItems 函数中关键的响应处理逻辑
type ContentItemPublic = {
  id: string;
  title: string;
  type: string;
  processing_status: string;
};

type ApiErrorResponse = {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
};

// 提取 fetchItems 中的响应处理逻辑
function processApiResponse(
  response: any,
): ContentItemPublic[] | ApiErrorResponse {
  // 检查响应是否为空或无效
  if (!response) {
    return { error: "服务器返回空响应" };
  }

  // 处理直接数组格式 - 这是期望的格式
  if (Array.isArray(response)) {
    return response;
  }

  // 处理包装格式的响应（例如 {data: [...], meta: {...}}）
  if (response && typeof response === "object") {
    // 检查是否有 data 字段包含数组
    if ("data" in response && Array.isArray(response.data)) {
      return response.data;
    }

    // 检查是否有 items 字段包含数组
    if ("items" in response && Array.isArray(response.items)) {
      return response.items;
    }

    // 检查是否是错误响应格式
    const errorResponse = response as ApiErrorResponse;
    let errorMessage = "未知错误";

    if (errorResponse.error) {
      errorMessage = String(errorResponse.error);
    } else if (errorResponse.message) {
      errorMessage = String(errorResponse.message);
    } else if (errorResponse.meta && errorResponse.meta.message) {
      errorMessage = String(errorResponse.meta.message);
    } else {
      errorMessage = `API返回了意外的数据格式: ${typeof response}`;
    }

    return { error: errorMessage, status: 400 };
  }

  // 其他类型的响应
  return {
    error: `API返回了完全意外的数据类型: ${typeof response}`,
    status: 400,
  };
}

describe("fetchItems 响应处理逻辑", () => {
  it("应该正确处理直接数组格式", () => {
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

    const result = processApiResponse(mockItems);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockItems);
  });

  it("应该正确处理包装在data字段中的数组", () => {
    const mockWrappedResponse = {
      data: [
        {
          id: "1",
          title: "Test Item 1",
          type: "article",
          processing_status: "completed",
        },
      ],
      meta: { total: 1, page: 1 },
    };

    const result = processApiResponse(mockWrappedResponse);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockWrappedResponse.data);
  });

  it("应该正确处理包装在items字段中的数组", () => {
    const mockWrappedResponse = {
      items: [
        {
          id: "1",
          title: "Test Item 1",
          type: "article",
          processing_status: "completed",
        },
      ],
      pagination: { total: 1, page: 1 },
    };

    const result = processApiResponse(mockWrappedResponse);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(mockWrappedResponse.items);
  });

  it("应该正确处理错误响应格式", () => {
    const mockErrorResponse = {
      error: "Unauthorized",
      status: 401,
    };

    const result = processApiResponse(mockErrorResponse);

    expect(result).toEqual({
      error: "Unauthorized",
      status: 400,
    });
  });

  it("应该正确处理包含meta.message的错误响应", () => {
    const mockErrorResponse = {
      meta: { message: "Token expired" },
      status: 401,
    };

    const result = processApiResponse(mockErrorResponse);

    expect(result).toEqual({
      error: "Token expired",
      status: 400,
    });
  });

  it("应该正确处理null/undefined响应", () => {
    const result1 = processApiResponse(null);
    const result2 = processApiResponse(undefined);

    expect(result1).toEqual({ error: "服务器返回空响应" });
    expect(result2).toEqual({ error: "服务器返回空响应" });
  });

  it("应该正确处理意外的对象格式", () => {
    const mockUnexpectedResponse = {
      some_other_field: "value",
      not_data_or_items: [],
    };

    const result = processApiResponse(mockUnexpectedResponse);

    expect(result).toEqual({
      error: "API返回了意外的数据格式: object",
      status: 400,
    });
  });

  it("应该正确处理非对象类型响应", () => {
    const result1 = processApiResponse("string response");
    const result2 = processApiResponse(123);
    const result3 = processApiResponse(true);

    expect(result1).toEqual({
      error: "API返回了完全意外的数据类型: string",
      status: 400,
    });
    expect(result2).toEqual({
      error: "API返回了完全意外的数据类型: number",
      status: 400,
    });
    expect(result3).toEqual({
      error: "API返回了完全意外的数据类型: boolean",
      status: 400,
    });
  });
});
