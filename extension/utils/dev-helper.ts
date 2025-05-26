import { ENV_CONFIG } from './config';

/**
 * 安全地创建WebSocket连接，自动处理开发环境的端口穿透
 * 
 * @param url WebSocket URL或者端口号
 * @param protocols WebSocket协议
 * @returns WebSocket实例或null（如果创建失败）
 */
export function createSafeWebSocket(url: string | number, protocols?: string | string[]): WebSocket | null {
  // 生产环境或者url已经是完整URL时直接连接
  if (!ENV_CONFIG.IS_DEV || (typeof url === 'string' && url.startsWith('ws'))) {
    try {
      return new WebSocket(url, protocols);
    } catch (error) {
      console.error(`[Nexus] WebSocket连接失败: ${error}`);
      return null;
    }
  }
  
  // 开发环境中尝试连接不同端口
  const portToTry = typeof url === 'number' ? url : ENV_CONFIG.DEV_WS_PORTS[0];
  
  try {
    const wsUrl = `ws://localhost:${portToTry}`;
    console.log(`[Nexus] 尝试连接开发WebSocket: ${wsUrl}`);
    return new WebSocket(wsUrl, protocols);
  } catch (error) {
    console.error(`[Nexus] 开发WebSocket连接失败: ${error}`);
    return null;
  }
} 