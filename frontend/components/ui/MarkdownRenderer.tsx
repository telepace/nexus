"use client";

import React, { useEffect, useRef } from "react"; // Added useEffect, useRef
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import remarkToc from "remark-toc"; // Added
import rehypeAutolinkHeadings from "rehype-autolink-headings"; // Added
import remarkMath from "remark-math"; // Added
import rehypeKatex from "rehype-katex"; // Added
import mediumZoom from "medium-zoom"; // Added
import copy from "copy-to-clipboard"; // Added

// 移除 rehypeRaw 插件，避免未知HTML标签错误
// import rehypeRaw from 'rehype-raw'
import { cn } from "@/lib/utils";

// Import highlight.js styles
import "highlight.js/styles/github-dark.css";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css"; // Added KaTeX CSS

interface MarkdownRendererProps {
  content: string | null;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Initialize Medium Zoom
      const images = contentRef.current.querySelectorAll(
        // Targeting images within the prose scope, assuming OptimizedImage renders an <img> tag
        // If OptimizedImage does not render a standard img, this selector needs adjustment
        // or medium-zoom needs to be applied differently, perhaps via a ref to each image.
        ".prose img",
      );
      if (images.length) {
        mediumZoom(images, { background: "rgba(0, 0, 0, 0.7)" });
      }
    }
    // Note: medium-zoom cleanup will happen automatically when DOM elements are removed
  }, [content]); // Re-apply zoom when content changes

  if (!content) {
    return (
      <div
        data-testid="markdown-renderer"
        className={cn(
          "prose prose-slate dark:prose-invert max-w-none",
          className,
        )}
      />
    );
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
      ref={contentRef} // Added ref
      data-testid="markdown-renderer"
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        // 自定义样式
        "prose-headings:scroll-m-20 prose-headings:tracking-tight",
        "prose-h1:text-4xl prose-h1:font-extrabold prose-h1:lg:text-5xl",
        "prose-h2:border-b prose-h2:pb-2 prose-h2:text-3xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:first:mt-0",
        "prose-h3:text-2xl prose-h3:font-semibold prose-h3:tracking-tight",
        "prose-h4:text-xl prose-h4:font-semibold prose-h4:tracking-tight",
        "prose-p:leading-7 prose-p:[&:not(:first-child)]:mt-6",
        "prose-blockquote:mt-6 prose-blockquote:border-l-2 prose-blockquote:pl-6 prose-blockquote:italic",
        "prose-ul:my-6 prose-ul:ml-6 prose-ul:list-disc prose-ul:[&>li]:mt-2",
        "prose-ol:my-6 prose-ol:ml-6 prose-ol:list-decimal prose-ol:[&>li]:mt-2",
        "prose-li:mt-2",
        "prose-table:my-6 prose-table:w-full prose-table:overflow-y-auto",
        "prose-thead:border-b",
        "prose-th:border prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-bold prose-th:[&[align=center]]:text-center prose-th:[&[align=right]]:text-right",
        "prose-td:border prose-td:px-4 prose-td:py-2 prose-td:[&[align=center]]:text-center prose-td:[&[align=right]]:text-right",
        "prose-tr:m-0 prose-tr:border-t prose-tr:p-0 prose-tr:even:bg-muted",
        "prose-code:relative prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-semibold",
        "prose-pre:mt-6 prose-pre:mb-4 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4",
        "prose-pre:code:bg-transparent prose-pre:code:p-0",
        "prose-a:font-medium prose-a:underline prose-a:underline-offset-4",
        "prose-img:rounded-md prose-img:border prose-img:mx-auto prose-img:object-contain prose-img:max-h-[80vh] prose-img:w-auto prose-img:h-auto",
        "prose-hr:my-4 prose-hr:md:my-8",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkBreaks,
          remarkMath,
          [remarkToc, { heading: "toc|table[ -]of[ -]contents?" }],
        ]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeKatex,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ]}
        components={{
          // 自定义组件渲染
          h1: ({ children, ...props }) => (
            <h1
              className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="scroll-m-20 text-2xl font-semibold tracking-tight"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="scroll-m-20 text-xl font-semibold tracking-tight"
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
              {children}
            </p>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic" {...props}>
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="mt-2" {...props}>
              {children}
            </li>
          ),
          table: ({ children, ...props }) => (
            <div className="my-6 w-full overflow-x-auto">
              {" "}
              {/* Changed overflow-y-auto to overflow-x-auto */}
              <table className="w-full" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="border-b" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="border px-4 py-2 [&[align=center]]:text-center [&[align=right]]:text-right"
              {...props}
            >
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="m-0 border-t p-0 even:bg-muted" {...props}>
              {children}
            </tr>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
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
            // Try to extract raw code from children
            let rawCode = "";
            if (
              props.node &&
              props.node.children &&
              props.node.children.length > 0
            ) {
              const codeNode = props.node.children[0];
              if (
                codeNode &&
                codeNode.type === "element" &&
                codeNode.tagName === "code"
              ) {
                if (
                  codeNode.children &&
                  codeNode.children.length > 0 &&
                  codeNode.children[0].type === "text"
                ) {
                  rawCode = codeNode.children[0].value;
                }
              }
            }

            return (
              <pre
                className="mt-6 mb-4 overflow-x-auto rounded-lg bg-muted p-4 relative group" // Added relative and group
                {...props}
              >
                <button
                  className="absolute top-2 right-2 p-1.5 text-xs font-sans bg-gray-700 hover:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (rawCode) {
                      copy(rawCode);
                      // Consider adding a more sophisticated user feedback, like a toast notification
                      alert("Copied to clipboard!");
                    } else {
                      // Fallback or error for unexpected structure
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const el = (props.node as any)?.children?.[0]
                        ?.children?.[0]?.value;
                      if (el) copy(el);
                      else alert("Could not copy code.");
                    }
                  }}
                >
                  Copy
                </button>
                {children}
              </pre>
            );
          },
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="font-medium underline underline-offset-4 hover:text-primary"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            // 确保src是string类型
            const srcString = typeof src === "string" ? src : "";
            
            // 检查是否为外部URL
            const isExternalUrl = srcString && (srcString.startsWith('http://') || srcString.startsWith('https://'));
            const isLocalhost = srcString && (srcString.includes('localhost') || srcString.includes('127.0.0.1'));
            
            // 对于外部URL（非localhost），使用普通img标签避免Next.js域名限制
            if (isExternalUrl && !isLocalhost) {
              return (
                <img
                  src={srcString}
                  alt={alt || ""}
                  className="rounded-md border max-w-full h-auto object-contain block mx-auto"
                  loading="lazy"
                  style={{ 
                    aspectRatio: "auto", 
                    maxHeight: "80vh",
                    width: "auto",
                    height: "auto"
                  }}
                  onError={(e) => {
                    // 如果图片加载失败，显示占位符
                    e.currentTarget.src = "/images/image-placeholder.svg";
                    e.currentTarget.alt = "Image failed to load";
                  }}
                />
              );
            }

            // 对于本地图片或相对路径，使用OptimizedImage组件
            const optimizedImageProps = {
              src: srcString,
              alt: alt || "",
              width: 800, // 提供默认宽度
              height: 600, // 提供默认高度
              className:
                "rounded-md border max-w-full h-auto object-contain block mx-auto",
              loading: "lazy" as const,
              objectFit: "contain" as const,
              preserveAspectRatio: true,
              showLoader: true,
              fallbackSrc: "/images/image-placeholder.svg", // 提供回退图片
            };

            return <OptimizedImage {...optimizedImageProps} />;
          },
          hr: ({ ...props }) => <hr className="my-4 md:my-8" {...props} />,
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
