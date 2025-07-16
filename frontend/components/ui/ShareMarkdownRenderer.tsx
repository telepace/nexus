"use client";

import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import mediumZoom from "medium-zoom";
import copy from "copy-to-clipboard";
import { cn, normalizeImageUrl } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

// Import highlight.js styles
import "highlight.js/styles/github-dark.css";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";

interface ShareMarkdownRendererProps {
  content: string | null;
  className?: string;
}

export function ShareMarkdownRenderer({
  content,
  className,
}: ShareMarkdownRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Initialize Medium Zoom for images
      const images = contentRef.current.querySelectorAll("img");
      if (images.length) {
        mediumZoom(images, { background: "rgba(0, 0, 0, 0.8)" });
      }
    }
  }, [content]);

  if (!content) {
    return null;
  }

  // 预处理内容，转义可能导致问题的XML标签
  const sanitizedContent = content
    .replace(
      /<(message|branch|remote|name|url|path|file|tag|version|commit|issue|pr|repo)([^>]*)>/gi,
      "&lt;$1$2&gt;",
    )
    .replace(
      /<\/(message|branch|remote|name|url|path|file|tag|version|commit|issue|pr|repo)>/gi,
      "&lt;/$1&gt;",
    );

  return (
    <div
      ref={contentRef}
      className={cn(
        // 基础 prose 样式 - 使用更现代的配色
        "prose prose-lg dark:prose-invert max-w-none",
        // 全局配色优化
        "prose-neutral dark:prose-invert",
        // 标题样式优化 - 更好的层次和间距
        "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24",
        "prose-h1:text-4xl prose-h1:leading-tight prose-h1:mb-8 prose-h1:mt-0 prose-h1:font-bold",
        "prose-h2:text-2xl prose-h2:leading-snug prose-h2:mb-6 prose-h2:mt-12 prose-h2:border-b prose-h2:border-neutral-200 dark:prose-h2:border-neutral-700 prose-h2:pb-3",
        "prose-h3:text-xl prose-h3:leading-snug prose-h3:mb-4 prose-h3:mt-8",
        "prose-h4:text-lg prose-h4:leading-snug prose-h4:mb-3 prose-h4:mt-6",
        "prose-h5:text-base prose-h5:leading-normal prose-h5:mb-2 prose-h5:mt-4",
        "prose-h6:text-sm prose-h6:leading-normal prose-h6:mb-2 prose-h5:mt-3",
        // 段落和文本优化
        "prose-p:text-base prose-p:leading-relaxed prose-p:mb-6 prose-p:text-neutral-700 dark:prose-p:text-neutral-300",
        // 列表优化
        "prose-ul:my-6 prose-ol:my-6",
        "prose-li:my-2 prose-li:leading-relaxed prose-li:text-neutral-700 dark:prose-li:text-neutral-300",
        "prose-li:marker:text-neutral-400 dark:prose-li:marker:text-neutral-500",
        // 引用块优化
        "prose-blockquote:border-l-4 prose-blockquote:border-l-blue-500 dark:prose-blockquote:border-l-blue-400",
        "prose-blockquote:bg-neutral-50 dark:prose-blockquote:bg-neutral-800/30",
        "prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8 prose-blockquote:rounded-r-lg",
        "prose-blockquote:not-italic prose-blockquote:font-normal",
        "prose-blockquote:text-neutral-700 dark:prose-blockquote:text-neutral-300",
        // 代码优化
        "prose-code:text-sm prose-code:font-mono prose-code:font-medium",
        "prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800",
        "prose-code:text-neutral-800 dark:prose-code:text-neutral-200",
        "prose-code:px-2 prose-code:py-1 prose-code:rounded-md",
        "prose-code:before:content-[''] prose-code:after:content-['']", // 移除默认引号
        // 代码块优化
        "prose-pre:bg-neutral-50 dark:prose-pre:bg-neutral-900",
        "prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-700",
        "prose-pre:rounded-xl prose-pre:p-6 prose-pre:my-8 prose-pre:shadow-sm",
        "prose-pre:overflow-x-auto prose-pre:text-sm prose-pre:leading-relaxed",
        // 链接优化
        "prose-a:text-blue-600 dark:prose-a:text-blue-400",
        "prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
        "prose-a:transition-all prose-a:duration-200",
        // 图片优化
        "prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-neutral-200 dark:prose-img:border-neutral-700",
        "prose-img:my-8 prose-img:mx-auto prose-img:max-w-full prose-img:h-auto",
        // 表格优化
        "prose-table:border-collapse prose-table:border prose-table:border-neutral-200 dark:prose-table:border-neutral-700",
        "prose-table:rounded-lg prose-table:overflow-hidden prose-table:my-8 prose-table:text-sm",
        "prose-th:bg-neutral-50 dark:prose-th:bg-neutral-800",
        "prose-th:font-semibold prose-th:text-neutral-900 dark:prose-th:text-neutral-100",
        "prose-th:px-4 prose-th:py-3 prose-th:text-left",
        "prose-td:border-t prose-td:border-neutral-200 dark:prose-td:border-neutral-700",
        "prose-td:px-4 prose-td:py-3 prose-td:text-neutral-700 dark:prose-td:text-neutral-300",
        // 分隔线优化
        "prose-hr:border-neutral-200 dark:prose-hr:border-neutral-700 prose-hr:my-12",
        // 强调样式优化
        "prose-strong:font-semibold prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100",
        "prose-em:italic prose-em:text-neutral-700 dark:prose-em:text-neutral-300",
        // 其他优化
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:break-words [&_div]:break-words [&_span]:break-words",
        "selection:bg-blue-100 dark:selection:bg-blue-900/30",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeKatex,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="scroll-mt-24 text-4xl font-bold leading-tight mb-8 mt-0 text-neutral-900 dark:text-neutral-100"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="scroll-mt-24 text-2xl font-semibold leading-snug mb-6 mt-12 border-b border-neutral-200 dark:border-neutral-700 pb-3 text-neutral-900 dark:text-neutral-100"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="scroll-mt-24 text-xl font-semibold leading-snug mb-4 mt-8 text-neutral-900 dark:text-neutral-100"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="scroll-mt-24 text-lg font-semibold leading-snug mb-3 mt-6 text-neutral-900 dark:text-neutral-100"
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p
              className="text-base leading-relaxed mb-6 text-neutral-700 dark:text-neutral-300"
              {...props}
            >
              {children}
            </p>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-neutral-50 dark:bg-neutral-800/30 py-4 px-6 my-8 rounded-r-lg not-italic font-normal text-neutral-700 dark:text-neutral-300"
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-6 space-y-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 space-y-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li
              className="leading-relaxed text-neutral-700 dark:text-neutral-300"
              {...props}
            >
              {children}
            </li>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="text-sm font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-1 rounded-md"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => {
            // 提取代码内容用于复制功能
            let rawCode = "";
            try {
              if (props.node?.children?.[0]?.children?.[0]?.value) {
                rawCode = props.node.children[0].children[0].value;
              }
            } catch (e) {
              // 忽略提取错误
            }

            const [copied, setCopied] = React.useState(false);

            const handleCopy = () => {
              if (rawCode) {
                copy(rawCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            };

            return (
              <div className="relative group">
                <pre
                  className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 my-8 shadow-sm overflow-x-auto text-sm leading-relaxed"
                  {...props}
                >
                  {children}
                </pre>
                {rawCode && (
                  <button
                    onClick={handleCopy}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1"
                    title={copied ? "已复制" : "复制代码"}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          },
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 no-underline hover:underline font-medium transition-all duration-200"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            const srcString = typeof src === "string" ? src : "";
            if (!srcString) return null;

            const normalizedSrc = normalizeImageUrl(srcString);

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizedSrc}
                alt={alt || ""}
                className="rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 my-8 mx-auto max-w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/images/image-placeholder.svg";
                  e.currentTarget.alt = "图片加载失败";
                }}
              />
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-8 overflow-x-auto">
              <table
                className="border-collapse border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden text-sm w-full"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-neutral-50 dark:bg-neutral-800" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="font-semibold text-neutral-900 dark:text-neutral-100 px-4 py-3 text-left border-r border-neutral-200 dark:border-neutral-700 last:border-r-0"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-700 last:border-r-0"
              {...props}
            >
              {children}
            </td>
          ),
          hr: ({ ...props }) => (
            <hr
              className="border-neutral-200 dark:border-neutral-700 my-12"
              {...props}
            />
          ),
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
