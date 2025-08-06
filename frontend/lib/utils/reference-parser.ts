/**
 * 🎯 智能引用解析器 - 支持多种格式，优雅处理边界情况
 *
 * 支持格式：
 * - "1" → [1]
 * - "1-3" → [1, 2, 3]
 * - "1,3,5" → [1, 3, 5]
 * - "1-3,5,7-9" → [1, 2, 3, 5, 7, 8, 9]
 * - "1 - 3, 5, 7 - 9" → [1, 2, 3, 5, 7, 8, 9] (容错空格)
 */

export interface ParsedReference {
  id: number;
  isRange: boolean;
  rangeStart?: number;
  rangeEnd?: number;
}

export interface ReferenceGroup {
  references: ParsedReference[];
  totalCount: number;
  hasRanges: boolean;
  maxReference: number;
  minReference: number;
}

/**
 * 解析引用字符串为结构化数据
 */
export function parseReferenceString(refString?: string): ReferenceGroup {
  const emptyResult: ReferenceGroup = {
    references: [],
    totalCount: 0,
    hasRanges: false,
    maxReference: 0,
    minReference: 0,
  };

  if (!refString || typeof refString !== "string") {
    return emptyResult;
  }

  // 清理字符串，移除多余空格和特殊字符
  const cleaned = refString
    .trim()
    .replace(/\s+/g, " ") // 标准化空格
    .replace(/[^\d\s,-]/g, "") // 只保留数字、空格、逗号、连字符
    .replace(/\s*,\s*/g, ",") // 标准化逗号分隔
    .replace(/\s*-\s*/g, "-"); // 标准化连字符

  if (!cleaned) {
    return emptyResult;
  }

  const references: ParsedReference[] = [];
  const uniqueIds = new Set<number>();

  // 按逗号分割
  const parts = cleaned.split(",").filter(Boolean);

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.includes("-")) {
      // 处理范围 "1-3"
      const [start, end] = trimmed
        .split("-")
        .map((s) => parseInt(s.trim(), 10));

      if (
        !isNaN(start) &&
        !isNaN(end) &&
        start > 0 &&
        end > 0 &&
        start <= end
      ) {
        // 确保范围合理（最大跨度限制为50，避免性能问题）
        const rangeSize = end - start + 1;
        if (rangeSize <= 50) {
          for (let i = start; i <= end; i++) {
            if (!uniqueIds.has(i)) {
              uniqueIds.add(i);
              references.push({
                id: i,
                isRange: rangeSize > 1,
                rangeStart: rangeSize > 1 ? start : undefined,
                rangeEnd: rangeSize > 1 ? end : undefined,
              });
            }
          }
        }
      }
    } else {
      // 处理单个数字
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0) {
        if (!uniqueIds.has(num)) {
          uniqueIds.add(num);
          references.push({
            id: num,
            isRange: false,
          });
        }
      }
    }
  }

  // 按ID排序
  references.sort((a, b) => a.id - b.id);

  const allIds = Array.from(uniqueIds).sort((a, b) => a - b);

  return {
    references,
    totalCount: references.length,
    hasRanges: references.some((ref) => ref.isRange),
    maxReference: allIds.length > 0 ? Math.max(...allIds) : 0,
    minReference: allIds.length > 0 ? Math.min(...allIds) : 0,
  };
}

/**
 * 生成引用显示的智能分组
 * 例如：[1,2,3,5,7,8,9] → ["1-3", "5", "7-9"]
 */
export function generateReferenceGroups(references: number[]): string[] {
  if (references.length === 0) return [];

  const sorted = [...references].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      // 连续数字，扩展范围
      end = sorted[i];
    } else {
      // 不连续，结束当前组
      if (start === end) {
        groups.push(start.toString());
      } else if (end === start + 1) {
        // 只有两个连续数字，分开显示更清晰
        groups.push(start.toString(), end.toString());
      } else {
        groups.push(`${start}-${end}`);
      }
      start = end = sorted[i];
    }
  }

  // 添加最后一组
  if (start === end) {
    groups.push(start.toString());
  } else if (end === start + 1) {
    groups.push(start.toString(), end.toString());
  } else {
    groups.push(`${start}-${end}`);
  }

  return groups;
}

/**
 * 检查引用是否有效
 */
export function isValidReference(refId: number): boolean {
  return Number.isInteger(refId) && refId > 0 && refId <= 9999; // 合理的上限
}

/**
 * 格式化引用为显示文本
 */
export function formatReferenceDisplay(refString?: string): string {
  const parsed = parseReferenceString(refString);
  if (parsed.totalCount === 0) return "";

  const groups = generateReferenceGroups(parsed.references.map((r) => r.id));
  return groups.join(", ");
}

/**
 * 获取引用的简短描述（用于工具提示）
 */
export function getReferenceDescription(refGroup: ReferenceGroup): string {
  if (refGroup.totalCount === 0) return "";

  if (refGroup.totalCount === 1) {
    return `引用第${refGroup.references[0].id}段`;
  }

  if (refGroup.totalCount <= 3) {
    const ids = refGroup.references.map((r) => r.id).join("、");
    return `引用第${ids}段`;
  }

  return `引用${refGroup.totalCount}个段落 (${refGroup.minReference}-${refGroup.maxReference})`;
}
