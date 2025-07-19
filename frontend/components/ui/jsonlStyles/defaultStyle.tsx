import React from "react";
import { StyleRenderer, StyleRenderResult } from "./types";

// Helper to create render result
const wrapElement = (element: React.ReactNode): StyleRenderResult => ({
  element,
  hasCustomExpandButton: false,
});

export const defaultStyleRenderer: StyleRenderer = ({
  block,
  references,
  hasReferences,
  MarkdownRenderer,
  EnhancedReferenceIndicator,
  onExpand,
}) => {
  const type = (block["type"] || block["t"]) as string | undefined;
  const c = (block["content"] ?? block["c"]) as React.ReactNode;
  const ref = block["ref"] as string | undefined;
  const lead = block["lead"] as string | undefined;

  switch (type) {
    case "h1":
      return wrapElement(
        <h1 className="scroll-m-16 text-xl font-bold tracking-tight lg:text-2xl select-text leading-[1.3]">
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </h1>
      );
    case "h2":
      return wrapElement(
        <h2 className="scroll-m-16 border-b pb-1.5 text-lg font-semibold tracking-tight first:mt-0 select-text leading-[1.3]">
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </h2>
      );
    case "h3":
      return wrapElement(
        <h3 className="scroll-m-16 text-base font-semibold tracking-tight select-text leading-[1.3]">
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </h3>
      );
    case "quote":
      return wrapElement(
        <blockquote className="italic border-l-2 pl-4 my-2 select-text">
          <MarkdownRenderer content={String(c)} inline={true} />
          {ref && <cite className="text-xs text-gray-500 ml-2">— {ref}</cite>}
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </blockquote>
      );
    case "list": {
      let items: string[] = [];
      if (Array.isArray(c)) items = c.map(String);
      else if (typeof c === "string")
        items = c
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      return wrapElement(
        <ul className="list-disc ml-4 space-y-1 my-2 select-text">
          {items.map((item, i) => (
            <li key={i} className="select-text">
              <MarkdownRenderer content={item} inline={true} />
            </li>
          ))}
          {hasReferences && (
            <li>
              <EnhancedReferenceIndicator references={references} />
            </li>
          )}
        </ul>
      );
    }
    case "insight":
      return wrapElement(
        <div className="my-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-3 select-text">
          <strong className="text-blue-600 text-sm font-medium mr-2">
            💡 洞察:
          </strong>
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </div>
      );
    case "concept":
      return wrapElement(
        <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 select-text">
          <strong className="text-purple-600 text-sm font-medium mr-2">
            🎯 概念:
          </strong>
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </div>
      );
    case "qa": {
      if (typeof c === "object" && c !== null) {
        const obj = c as Record<string, unknown>;
        const q = obj["q"] || obj["question"];
        const a = obj["a"] || obj["answer"];
        return wrapElement(
          <div className="my-3 space-y-1 select-text">
            <p className="font-semibold select-text">
              Q: <MarkdownRenderer content={String(q)} inline={true} />
            </p>
            <p className="select-text">
              A: <MarkdownRenderer content={String(a)} inline={true} />
            </p>
            {hasReferences && (
              <div className="mt-2 flex justify-end">
                <EnhancedReferenceIndicator references={references} />
              </div>
            )}
          </div>
        );
      }
      break;
    }
    case "action":
      return wrapElement(
        <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 select-text">
          <strong className="text-green-600 text-sm font-medium mr-2">
            ⚡ 行动:
          </strong>
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </div>
      );
    default: {
      const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
      return wrapElement(
        <p className="my-2 select-text">
          <MarkdownRenderer content={finalContent} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </p>
      );
    }
  }
};
