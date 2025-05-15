/**
 * 手动定义的类型，用于补充自动生成的类型
 */

/**
 * 项目的公共接口定义
 */
export interface ItemPublic {
  id: string;
  title: string;
  description?: string | null;
} 

/**
 * 项目集合的公共接口定义
 */
export interface ItemsPublic {
  data: Array<ItemPublic>;
  count: number;
}

/**
 * 从API响应中提取Item数据的类型
 */
export type ItemResponse = {
  data: ItemPublic;
  meta?: Record<string, unknown> | null;
  error?: string | null;
};

/**
 * 从API响应中提取Items集合数据的类型
 */
export type ItemsResponse = {
  data: ItemsPublic;
  meta?: Record<string, unknown> | null;
  error?: string | null;
}; 