/**
 * 实用工具函数，用于检测和与 Nexus 浏览器扩展进行交互
 */

// 扩展 Window 接口以添加 chrome 属性
// 这里不能直接用 typeof chrome，因为类型可能不存在于全局，推荐用 unknown 或 any，并加注释
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    chrome?: unknown;
  }
}

/**
 * 检测用户是否安装了 Nexus 浏览器扩展
 * @returns 是否已安装扩展的 Promise
 */
export const isExtensionInstalled = async (): Promise<boolean> => {
  // 检查全局 chrome 对象是否存在
  if (typeof window === "undefined" || !window.chrome) {
    return false;
  }

  // 尝试通过扩展 ID 发送消息来检测扩展是否安装
  try {
    // 注意：在生产环境需替换为实际的扩展 ID
    const extensionId =
      process.env.NEXT_PUBLIC_EXTENSION_ID ||
      "jhjpjjpkmepceonjdjgpfhhllilmdnae";

    return new Promise<boolean>((resolve) => {
      // 设置超时，如果扩展没有响应
      const timeoutId = setTimeout(() => resolve(false), 500);

      // 尝试向扩展发送消息
      if (
        typeof window.chrome === "object" &&
        window.chrome &&
        "runtime" in window.chrome &&
        (window.chrome as { runtime?: unknown }).runtime &&
        typeof (window.chrome as { runtime: { sendMessage?: unknown } }).runtime
          .sendMessage === "function"
      ) {
        (
          window.chrome as {
            runtime: {
              sendMessage: (
                id: string,
                msg: object,
                cb: (response: ExtensionResponse) => void,
              ) => void;
            };
          }
        ).runtime.sendMessage(
          extensionId,
          { action: "ping" },
          (response: ExtensionResponse) => {
            clearTimeout(timeoutId);
            resolve(!!response);
          },
        );
      }
    });
  } catch (error) {
    console.error("检查扩展安装状态时出错:", error);
    return false;
  }
};

/**
 * 打开浏览器的侧边栏面板（如果支持）
 * @returns 是否成功打开侧边栏的 Promise
 */
export const openSidebar = async (): Promise<boolean> => {
  // 确保代码在浏览器环境中运行
  if (typeof window === "undefined" || !window.chrome) {
    return false;
  }

  try {
    // 尝试通过扩展 ID 发送消息来打开侧边栏
    const extensionId =
      process.env.NEXT_PUBLIC_EXTENSION_ID ||
      "jhjpjjpkmepceonjdjgpfhhllilmdnae";

    return new Promise<boolean>((resolve) => {
      // 设置超时处理
      const timeoutId = setTimeout(() => resolve(false), 1000);

      // 尝试向扩展发送消息
      if (
        typeof window.chrome === "object" &&
        window.chrome &&
        "runtime" in window.chrome &&
        (window.chrome as { runtime?: unknown }).runtime &&
        typeof (window.chrome as { runtime: { sendMessage?: unknown } }).runtime
          .sendMessage === "function"
      ) {
        (
          window.chrome as {
            runtime: {
              sendMessage: (
                id: string,
                msg: object,
                cb: (response: ExtensionResponse) => void,
              ) => void;
            };
          }
        ).runtime.sendMessage(
          extensionId,
          { action: "openSidebar" },
          (response: ExtensionResponse) => {
            clearTimeout(timeoutId);
            resolve(!!response && response.success === true);
          },
        );
      }
    });
  } catch (error) {
    console.error("打开侧边栏时出错:", error);
    return false;
  }
};

/**
 * 检查浏览器是否支持侧边栏功能
 */
export const isSidebarSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    typeof window.chrome === "object" &&
    window.chrome !== undefined &&
    window.chrome !== null &&
    "sidePanel" in window.chrome
  );
};

// 定义扩展消息响应类型
// 只关心 success 字段
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ExtensionResponse = { success?: boolean } | undefined;
