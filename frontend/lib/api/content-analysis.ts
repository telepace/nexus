/**
 * 内容分析API调用工具
 * 支持多语言输出
 */

import { detectLocale } from "@/lib/i18n";

export interface ContentAnalysisOptions {
  contentId: string;
  analysisType: "summary" | "key_points";
  language?: string;
  token: string;
}

/**
 * 将内部语言代码转换为API期望的语言名称
 */
function mapLocaleToLanguage(locale: string): string {
  const localeMap: Record<string, string> = {
    en: "English",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    de: "German",
    es: "Spanish",
  };

  return localeMap[locale] || "Chinese"; // 默认中文
}

/**
 * 调用内容分析API，支持流式响应
 */
export async function analyzeContentWithTemplate(
  options: ContentAnalysisOptions,
): Promise<ReadableStream<Uint8Array> | null> {
  const { contentId, analysisType, token } = options;

  // 自动检测语言，优先使用传入的语言参数
  const detectedLocale = options.language || detectLocale();
  const outputLanguage = mapLocaleToLanguage(detectedLocale);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  try {
    const url = new URL(`${apiUrl}/api/v1/content/${contentId}/analyze/stream`);
    url.searchParams.append("analysis_type", analysisType);
    url.searchParams.append("language", outputLanguage);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.body;
  } catch (error) {
    console.error("Content analysis request failed:", error);
    return null;
  }
}

/**
 * 解析流式响应
 */
export async function* parseStreamingResponse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.trim() === "") continue;

        // 解析SSE格式
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch (error) {
            console.warn("Failed to parse streaming data:", data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * React Hook 示例：使用内容分析API
 */
export function useContentAnalysis() {
  const analyzeContent = async (
    contentId: string,
    analysisType: "summary" | "key_points",
    token: string,
    language?: string,
  ): Promise<void> => {
    const stream = await analyzeContentWithTemplate({
      contentId,
      analysisType,
      language,
      token,
    });

    if (!stream) {
      throw new Error("Failed to start content analysis");
    }

    // 处理流式响应
    for await (const data of parseStreamingResponse(stream)) {
      console.log("Analysis result:", data);
      // 这里可以更新UI状态
    }
  };

  return { analyzeContent };
}
