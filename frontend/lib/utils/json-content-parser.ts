/**
 * JSON 内容解析工具
 *
 * 用于处理 LLM 输出的结构化 JSON 内容，自动识别并清理 markdown 代码块标记
 */

export interface JsonContentItem {
  t: string; // 类型：h1, h2, h3, insight, summary, list, code, etc.
  c: string; // 内容
  ref?: string; // 引用（逗号分隔的数字）
  meta?: Record<string, any>; // 额外元数据
}

/**
 * 解析 JSON 内容，自动处理 markdown 代码块
 *
 * @param content - 可能包含 ```json 标记的原始内容
 * @returns 解析后的 JSON 内容项数组，如果解析失败返回 null
 *
 * @example
 * ```typescript
 * const content = `\`\`\`json
 * {"t":"h2","c":"标题内容"}
 * {"t":"insight","c":"见解内容","ref":"1,2,3"}
 * \`\`\``;
 *
 * const items = parseJsonContent(content);
 * if (items) {
 *   console.log(items); // [{ t: "h2", c: "标题内容" }, { t: "insight", c: "见解内容", ref: "1,2,3" }]
 * }
 * ```
 */
export const parseJsonContent = (content: string): JsonContentItem[] | null => {
  try {
    // 去除前后空白
    let cleanContent = content.trim();

    // 识别并去除 ```jsonl 或 ```json 开头和 ``` 结尾
    // 注意：jsonl 必须在 json 前面，避免 jsonl 被误匹配为 json
    const jsonBlockRegex = /^```(?:jsonl|json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanContent.match(jsonBlockRegex);

    if (match) {
      cleanContent = match[1].trim();
    }

    // 分割成单独的 JSON 行
    const lines = cleanContent.split("\n").filter((line) => line.trim());
    const items: JsonContentItem[] = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line.trim()) as JsonContentItem;
        if (item.t && item.c) {
          items.push(item);
        }
      } catch (lineError) {
        console.warn("无法解析 JSON 行:", line, lineError);
      }
    }

    return items.length > 0 ? items : null;
  } catch (error) {
    console.warn("JSON 内容解析失败:", error);
    return null;
  }
};

/**
 * 解析引用字符串为数字数组
 *
 * @param refString - 引用字符串，如 "1,2,3" 或 "1, 2, 3"
 * @returns 引用数字数组
 *
 * @example
 * ```typescript
 * parseReferences("1,2,3"); // [1, 2, 3]
 * parseReferences("1, 2, 3"); // [1, 2, 3]
 * parseReferences(""); // []
 * parseReferences(undefined); // []
 * ```
 */
export const parseReferences = (refString?: string): number[] => {
  if (!refString) return [];
  return refString
    .split(",")
    .map((ref) => parseInt(ref.trim(), 10))
    .filter((num) => !isNaN(num));
};

/**
 * 检查内容是否可能是 JSON 格式
 *
 * @param content - 要检查的内容
 * @returns 是否可能是 JSON 格式
 *
 * @example
 * ```typescript
 * isJsonContent('{"t":"h1","c":"title"}'); // true
 * isJsonContent('```json\n{"t":"h1","c":"title"}\n```'); // true
 * isJsonContent('这是普通文本'); // false
 * ```
 */
export const isJsonContent = (content: string): boolean => {
  const trimmed = content.trim();

  // 检查是否有 markdown 代码块标记
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return true;
  }

  // 检查是否以 { 开头（JSON 对象）
  if (trimmed.startsWith("{")) {
    return true;
  }

  // 检查是否包含多行 JSON 格式
  const lines = trimmed.split("\n").filter((line) => line.trim());
  if (lines.length > 1) {
    const firstLine = lines[0].trim();
    return (
      firstLine.startsWith("{") &&
      firstLine.includes('"t"') &&
      firstLine.includes('"c"')
    );
  }

  return false;
};

/**
 * 清理 markdown 代码块标记
 *
 * @param content - 包含可能的 markdown 标记的内容
 * @returns 清理后的内容
 *
 * @example
 * ```typescript
 * const input = '```json\n{"t":"h1","c":"title"}\n```';
 * const output = cleanMarkdownCodeBlock(input);
 * console.log(output); // '{"t":"h1","c":"title"}'
 * ```
 */
export const cleanMarkdownCodeBlock = (content: string): string => {
  const trimmed = content.trim();
  // 注意：jsonl 必须在 json 前面，避免 jsonl 被误匹配为 json
  const jsonBlockRegex =
    /^```(?:jsonl|json|typescript|javascript)?\s*\n?([\s\S]*?)\n?```$/;
  const match = trimmed.match(jsonBlockRegex);

  return match ? match[1].trim() : trimmed;
};

/**
 * 获取内容类型的显示名称
 *
 * @param type - 内容类型
 * @returns 显示名称
 */
export const getTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    h1: "一级标题",
    h2: "二级标题",
    h3: "三级标题",
    insight: "见解",
    summary: "摘要",
    list: "列表",
    code: "代码",
    warning: "警告",
    error: "错误",
    success: "成功",
    info: "信息",
    note: "注释",
  };

  return typeMap[type] || type;
};

/**
 * 获取内容类型的图标
 *
 * @param type - 内容类型
 * @returns emoji 图标
 */
export const getTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    h1: "📋",
    h2: "📋",
    h3: "📋",
    insight: "💡",
    summary: "📝",
    list: "📋",
    code: "💻",
    warning: "⚠️",
    error: "🚨",
    success: "✅",
    info: "ℹ️",
    note: "📝",
  };

  return iconMap[type] || "📄";
};

/**
 * 验证 JSON 内容项的格式
 *
 * @param item - 要验证的项
 * @returns 是否有效
 */
export const validateJsonContentItem = (item: any): item is JsonContentItem => {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.t === "string" &&
    typeof item.c === "string" &&
    item.t.length > 0 &&
    item.c.length > 0
  );
};

/**
 * 批量处理 JSON 内容
 *
 * @param contents - 内容数组
 * @returns 处理结果
 */
export const batchParseJsonContent = (
  contents: string[],
): {
  parsed: JsonContentItem[][];
  failed: string[];
} => {
  const parsed: JsonContentItem[][] = [];
  const failed: string[] = [];

  for (const content of contents) {
    const result = parseJsonContent(content);
    if (result) {
      parsed.push(result);
    } else {
      failed.push(content);
    }
  }

  return { parsed, failed };
};
