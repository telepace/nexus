import { StyleRenderer } from "./types";
import React from "react";

// 基礎 Neumorphism 樣式
const bg = "linear-bg-1";
const card = `${bg} rounded-2xl shadow-[7px_7px_15px_#bdbdbd,_-7px_-7px_15px_rgba(255,255,255,0.8)] p-4`;
const cardInset = `${bg} rounded-2xl shadow-[inset_7px_7px_15px_#bdbdbd,_inset_-7px_-7px_15px_rgba(255,255,255,0.8)] p-4`;

export const neumorphismStyleRenderer: StyleRenderer = ({
  block,
  references,
  hasReferences,
  MarkdownRenderer,
  EnhancedReferenceIndicator,
}) => {
  const type = (block["type"] || block["t"]) as string | undefined;
  const c = (block["content"] ?? block["c"]) as React.ReactNode;
  const lead = block["lead"] as string | undefined;
  const ref = block["ref"] as string | undefined;
  const text = "text-gray-700 select-text";

  switch (type) {
    case "h1":
      return (
        <h1 className="text-2xl font-bold text-gray-700 select-text my-4 text-center">
          <MarkdownRenderer content={String(c)} inline={true} />
        </h1>
      );
    case "h2":
      return (
        <h2 className="text-lg font-bold text-gray-600 select-text mt-6 mb-2 border-b-2 border-gray-200 pb-1">
          <MarkdownRenderer content={String(c)} inline={true} />
        </h2>
      );
    case "h3":
      return (
        <h3 className="text-base font-semibold text-gray-600 select-text mt-4 mb-1">
          <MarkdownRenderer content={String(c)} inline={true} />
        </h3>
      );
    case "quote":
      return (
        <div className={`${cardInset} my-1 border border-gray-300/30`}>
          <blockquote className={`${text} text-sm italic leading-relaxed`}>
            <MarkdownRenderer content={String(c)} inline={true} />
          </blockquote>
          {ref && (
            <cite className="block text-right mt-4 text-sm text-gray-500 not-italic">
              — {ref}
            </cite>
          )}
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="mt-2"
            />
          )}
        </div>
      );
    case "list": {
      let items: string[] = [];
      if (Array.isArray(c)) items = c.map(String);
      else if (typeof c === "string")
        items = c
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      return (
        <div className={`${card} my-1`}>
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={i} className={`flex items-start gap-3 ${text}`}>
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gray-400 shadow-[1px_1px_2px_#e8e8e8,_-1px_-1px_2px_rgba(255,255,255,0.8)] flex-shrink-0" />
                <span className="flex-1 text-sm leading-relaxed">
                  <MarkdownRenderer content={item} inline={true} />
                </span>
              </li>
            ))}
            {hasReferences && (
              <li>
                <EnhancedReferenceIndicator references={references} />
              </li>
            )}
          </ul>
        </div>
      );
    }
    case "qa": {
      if (typeof c !== "object" || c === null) break;
      const q = (c as any)["q"] || (c as any)["question"];
      const a = (c as any)["a"] || (c as any)["answer"];
      return (
        <div className={`${card} my-1 space-y-3`}>
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-600 shadow-[3px_3px_6px_#e8e8e8,_-3px_-3px_6px_rgba(255,255,255,0.8)]"
              style={{ background: "inherit" }}
            >
              Q
            </div>
            <p className={`${text} flex-1 text-sm font-semibold`}>
              <MarkdownRenderer content={String(q)} inline={true} />
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-600 shadow-[inset_3px_3px_6px_#e8e8e8,_inset_-3px_-3px_6px_rgba(255,255,255,0.8)]"
              style={{ background: "inherit" }}
            >
              A
            </div>
            <p className={`${text} flex-1 text-sm`}>
              <MarkdownRenderer content={String(a)} inline={true} />
            </p>
          </div>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
    }
    case "insight": {
      return (
        <div className={`${card} my-1`}>
          <p className={`${text} text-sm`}>
            <MarkdownRenderer content={String(c)} inline={true} />
          </p>
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="mt-2"
            />
          )}
        </div>
      );
    }
    case "concept":
      return (
        <div className={`${card} my-1`}>
          <p className={`${text} text-sm`}>
            <MarkdownRenderer content={String(c)} inline={true} />
          </p>
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="mt-2"
            />
          )}
        </div>
      );
    case "action":
      return (
        <div className={`${card} my-1`}>
          <p className={`${text} text-sm`}>
            <MarkdownRenderer content={String(c)} inline={true} />
          </p>
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="mt-2"
            />
          )}
        </div>
      );
    default: {
      const contentStr = lead ? `**${lead}:** ${String(c)}` : String(c);
      return (
        <div className={`${card} my-1`}>
          <p className={`${text} text-sm leading-relaxed`}>
            <MarkdownRenderer content={contentStr} inline={true} />
          </p>
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="mt-2"
            />
          )}
        </div>
      );
    }
  }
};
