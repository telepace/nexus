"use client";

/**
 * 异步内容解析器
 * 解决同步JSON解析导致的主线程阻塞问题
 */

// 解析任务接口
interface ParseTask<T> {
  id: string;
  content: string;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
}

// JSONL块接口
interface JsonlBlock {
  type: string;
  content: string;
  ref?: string;
  [key: string]: unknown;
}

// 批处理解析器类
class AsyncContentParser {
  private parseQueue: ParseTask<JsonlBlock[]>[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10; // 每批处理的行数
  private readonly CHUNK_DELAY = 4; // 每批之间的延迟(ms)

  /**
   * 异步解析JSONL内容 - 分批处理避免阻塞主线程
   */
  async parseJsonlContent(content: string): Promise<JsonlBlock[]> {
    return new Promise((resolve, reject) => {
      const taskId = `parse-${Date.now()}-${Math.random()}`;

      this.parseQueue.push({
        id: taskId,
        content,
        resolve,
        reject,
      });

      // 如果没有正在处理的任务，开始处理
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * 处理解析队列
   */
  private async processQueue(): Promise<void> {
    if (this.parseQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.parseQueue.shift()!;

    try {
      const result = await this.parseContentInChunks(task.content);
      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    }

    // 继续处理下一个任务
    await this.processQueue();
  }

  /**
   * 分块解析内容 - 使用requestIdleCallback避免阻塞
   */
  private async parseContentInChunks(content: string): Promise<JsonlBlock[]> {
    if (!content || typeof content !== "string") {
      return [];
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    const blocks: JsonlBlock[] = [];
    let currentIndex = 0;

    // 分批处理，避免一次性解析太多内容
    while (currentIndex < lines.length) {
      const chunk = lines.slice(currentIndex, currentIndex + this.BATCH_SIZE);

      // 在空闲时间处理这一批
      const chunkBlocks = await this.processChunk(chunk);
      blocks.push(...chunkBlocks);

      currentIndex += this.BATCH_SIZE;

      // 如果还有更多内容要处理，让出控制权
      if (currentIndex < lines.length) {
        await this.yieldToMainThread();
      }
    }

    return blocks;
  }

  /**
   * 处理单个块
   */
  private async processChunk(lines: string[]): Promise<JsonlBlock[]> {
    return new Promise((resolve) => {
      // 使用requestIdleCallback在浏览器空闲时处理
      const processLines = (deadline?: IdleDeadline) => {
        const blocks: JsonlBlock[] = [];
        let i = 0;

        while (
          i < lines.length &&
          (!deadline || deadline.timeRemaining() > 1)
        ) {
          const line = lines[i];
          try {
            const sanitized = this.sanitizeJsonLine(line);
            const parsed = JSON.parse(sanitized);

            // 标准化字段名
            const block: JsonlBlock = {
              type: parsed.type || parsed.t || "p",
              content: parsed.content || parsed.c || line,
              ref: parsed.ref,
              ...parsed,
            };

            blocks.push(block);
          } catch {
            // 解析失败时创建段落块
            blocks.push({
              type: "p",
              content: line,
            });
          }
          i++;
        }

        if (i < lines.length) {
          // 还有内容没处理完，继续
          const remainingLines = lines.slice(i);
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback((newDeadline) => {
              processLines(newDeadline);
            });
          } else {
            // 降级到setTimeout
            setTimeout(() => processLines(), 0);
          }
        } else {
          // 处理完成
          resolve(blocks);
        }
      };

      // 开始处理
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(processLines);
      } else {
        // 降级到setTimeout
        setTimeout(() => processLines(), 0);
      }
    });
  }

  /**
   * 让出主线程控制权
   */
  private async yieldToMainThread(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, this.CHUNK_DELAY);
      }
    });
  }

  /**
   * 清理JSON语法错误 - 优化版本
   */
  private sanitizeJsonLine(line: string): string {
    if (!line || line.length < 2) {
      return '{"type":"p","content":""}';
    }

    // 简化版清理，避免复杂正则表达式
    let sanitized = line.trim();

    // 基本修复：确保有开闭括号
    if (!sanitized.startsWith("{")) {
      sanitized = "{" + sanitized;
    }
    if (!sanitized.endsWith("}")) {
      sanitized = sanitized + "}";
    }

    // 快速检查是否为有效JSON
    try {
      JSON.parse(sanitized);
      return sanitized;
    } catch {
      // 如果还是无效，返回安全的默认值
      return `{"type":"p","content":${JSON.stringify(line)}}`;
    }
  }

  /**
   * 同步快速检测内容格式 - 只检查第一行
   */
  isJsonlContent(content: string): boolean {
    if (!content || typeof content !== "string") {
      return false;
    }

    try {
      const firstLine = content.trim().split("\n")[0];
      if (!firstLine) return false;

      const parsed = JSON.parse(firstLine);
      return (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed.type || parsed.t) &&
        (parsed.content || parsed.c)
      );
    } catch {
      return false;
    }
  }

  /**
   * 同步快速检测JSON对象格式
   */
  isJsonObject(content: string): boolean {
    if (!content || typeof content !== "string") {
      return false;
    }

    const trimmed = content.trim();
    if (trimmed.length < 2) return false;

    return (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    );
  }

  /**
   * 清理解析队列
   */
  clearQueue(): void {
    this.parseQueue.forEach((task) => {
      task.reject(new Error("Parser queue cleared"));
    });
    this.parseQueue = [];
    this.isProcessing = false;
  }
}

// 导出单例实例
export const asyncContentParser = new AsyncContentParser();

// React Hook
export function useAsyncContentParser() {
  return {
    parseJsonlContent:
      asyncContentParser.parseJsonlContent.bind(asyncContentParser),
    isJsonlContent: asyncContentParser.isJsonlContent.bind(asyncContentParser),
    isJsonObject: asyncContentParser.isJsonObject.bind(asyncContentParser),
    clearQueue: asyncContentParser.clearQueue.bind(asyncContentParser),
  };
}

// 导出类型
export type { JsonlBlock };
