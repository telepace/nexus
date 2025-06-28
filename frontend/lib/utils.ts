import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class values using clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type for objects that might have error properties
 */
interface ErrorLike {
  detail?: string;
  message?: string;
}

/**
 * Extracts an error message from an error object or string.
 *
 * This function checks if the input is a string and returns it directly.
 * If the input is an object, it attempts to retrieve the error message from the `detail` or `message` property.
 * If these properties are not present, it tries to stringify the object. If stringification fails, it returns a generic error message.
 *
 * @param error - The error object or string from which to extract the message.
 * @returns A formatted error message string.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const errorObj = error as ErrorLike;

    // Type guard for objects with detail property
    if ("detail" in error && typeof errorObj.detail === "string") {
      return errorObj.detail;
    }

    // Type guard for objects with message property
    if ("message" in error && typeof errorObj.message === "string") {
      return errorObj.message;
    }

    // If error is an object but doesn't have detail or message,
    // try to stringify it or return a generic message
    try {
      return JSON.stringify(error);
    } catch {
      return "An error occurred";
    }
  }

  return "An unknown error occurred";
}

/**
 * Gets a cookie value by name.
 *
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue || null;
  }

  return null;
}

/**
 * Normalizes image URLs by converting protocol-relative URLs to HTTPS.
 *
 * Protocol-relative URLs (starting with //) are not supported by Next.js Image component.
 * This function converts them to absolute HTTPS URLs.
 *
 * @param url - The image URL to normalize
 * @returns The normalized URL with explicit protocol
 *
 * @example
 * // Convert protocol-relative URLs to HTTPS
 * normalizeImageUrl('//upload.wikimedia.org/image.jpg') // returns 'https://upload.wikimedia.org/image.jpg'
 * normalizeImageUrl('//example.com/image.jpg') // returns 'https://example.com/image.jpg'
 *
 * // Leave other URLs unchanged
 * normalizeImageUrl('https://example.com/image.jpg') // returns 'https://example.com/image.jpg'
 * normalizeImageUrl('http://localhost:3000/image.jpg') // returns 'http://localhost:3000/image.jpg'
 * normalizeImageUrl('/local/image.jpg') // returns '/local/image.jpg'
 * normalizeImageUrl('relative/image.jpg') // returns 'relative/image.jpg'
 *
 * // Handle edge cases
 * normalizeImageUrl('') // returns ''
 * normalizeImageUrl(null) // returns null (if input is falsy)
 */
export function normalizeImageUrl(url: string): string {
  // Handle falsy values
  if (!url || typeof url !== "string") {
    return url || "";
  }

  // Convert protocol-relative URLs to HTTPS
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url;
}

/**
 * 智能URL提取和规范化函数
 * 
 * 能够处理以下情况：
 * 1. 带协议的完整URL
 * 2. 不带协议的域名URL
 * 3. 避免重复添加协议
 * 4. 清理URL末尾的标点符号
 * 5. 处理重复URL和协议错误
 */
export function extractAndNormalizeUrls(text: string, debug = false): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  if (debug) {
    console.log('[URL提取] 输入文本:', text);
  }

  const urls: string[] = [];

  // 预处理：修复常见的协议重复错误
  let processedText = text
    .replace(/https:\/\/https:\/\//g, 'https://')
    .replace(/http:\/\/http:\/\//g, 'http://')
    .replace(/https:\/\/http:\/\//g, 'https://')
    .replace(/http:\/\/https:\/\//g, 'https://');

  if (debug && processedText !== text) {
    console.log('[URL提取] 预处理后:', processedText);
  }

  // 第一步：提取完整的URL（带协议）
  const fullUrlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const fullUrls = processedText.match(fullUrlRegex) || [];
  
  if (debug) {
    console.log('[URL提取] 找到的完整URLs:', fullUrls);
  }
  
  // 清理完整URL并添加到结果中
  fullUrls.forEach(url => {
    const cleanedUrl = url.replace(/[.,;:!?]+$/, '');
    
    // 检查是否是重复拼接的URL（包含两个完整的URL）
    const urlParts = cleanedUrl.split('https://');
    if (urlParts.length > 2) {
      // 如果有多个https://，只取第一个完整的URL
      const firstValidUrl = 'https://' + urlParts[1];
      if (debug) {
        console.log('[URL提取] 检测到重复URL，修复为:', firstValidUrl);
      }
      if (isValidUrl(firstValidUrl)) {
        urls.push(firstValidUrl);
      }
    } else if (isValidUrl(cleanedUrl)) {
      urls.push(cleanedUrl);
    }
  });

  // 第二步：如果没有找到完整URL，尝试提取域名并自动添加协议
  if (urls.length === 0) {
    // 移除已经找到的完整URL，避免重复处理
    let remainingText = processedText;
    fullUrls.forEach(url => {
      remainingText = remainingText.replace(url, '');
    });

    if (debug) {
      console.log('[URL提取] 剩余文本（用于域名匹配）:', remainingText);
    }

    // 提取可能的域名URL（不带协议）
    const domainRegex = /(?:^|\s)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/g;
    const domainMatches = remainingText.match(domainRegex) || [];
    
    if (debug) {
      console.log('[URL提取] 找到的域名:', domainMatches);
    }
    
    domainMatches.forEach(match => {
      const trimmedMatch = match.trim().replace(/[.,;:!?]+$/, '');
      
      // 确保不是已经有协议的URL
      if (!trimmedMatch.startsWith('http://') && !trimmedMatch.startsWith('https://')) {
        const normalizedUrl = `https://${trimmedMatch}`;
        if (isValidUrl(normalizedUrl)) {
          urls.push(normalizedUrl);
        }
      }
    });
  }

  // 去重并返回
  const result = [...new Set(urls)];
  
  if (debug) {
    console.log('[URL提取] 最终结果:', result);
  }

  return result;
}

/**
 * 验证URL是否有效
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 兼容性函数：保持向后兼容，但使用新的智能提取逻辑
 * @deprecated 建议使用 extractAndNormalizeUrls
 */
export function extractUrls(text: string): string[] {
  return extractAndNormalizeUrls(text);
}
