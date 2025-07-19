import React from "react";
import { StyleRenderer } from "./types";

export const notebookStyleRenderer: StyleRenderer = ({
  block,
  references,
  hasReferences,
  MarkdownRenderer,
  EnhancedReferenceIndicator,
}) => {
  const type = (block["type"] || block["t"]) as string | undefined;
  const c = (block["content"] ?? block["c"]) as React.ReactNode;
  const ref = block["ref"] as string | undefined;
  const lead = block["lead"] as string | undefined;

  switch (type) {
    case "h1":
      return (
<<<<<<< HEAD
        <div className="relative my-3 inline-flex items-baseline gap-1 flex-wrap">
          <div className="absolute -left-4 top-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-full shadow-sm" />
          <span
            className="text-xl font-bold text-gray-800 select-text leading-relaxed pl-4"
            style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive' }}
=======
        <div className="mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-2xl font-bold text-neutral-800 select-text"
            style={{ 
              lineHeight: '1.5',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
    case "h2":
      return (
<<<<<<< HEAD
        <div className="relative my-0 inline-flex items-baseline gap-1 flex-wrap pl-6">
          <div className="absolute -left-3 top-1 w-6 h-6 bg-blue-400 rounded-full shadow-md opacity-80" />
          <span
            className="text-lg font-semibold text-gray-700 select-text leading-relaxed"
            style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive' }}
=======
        <div className="mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-xl font-bold text-neutral-700 select-text"
            style={{ 
              lineHeight: '1.5',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
    case "h3":
      return (
<<<<<<< HEAD
        <div className="relative my-0 inline-flex items-baseline gap-1 flex-wrap pl-4">
          <div className="absolute -left-2 top-2 w-4 h-4 bg-green-400 rounded-full shadow-sm opacity-70" />
          <span
            className="text-base font-medium text-gray-700 select-text leading-relaxed"
            style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive' }}
=======
        <div className="mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-lg font-bold text-neutral-700 select-text"
            style={{ 
              lineHeight: '1.5',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
    case "quote":
      return (
        <div className="relative my-0 select-text">
          <div className="absolute -left-1 top-0 text-6xl text-pink-300 opacity-50 leading-none">
            &quot;
          </div>
          <blockquote
            className="bg-pink-50 border-l-4 border-pink-300 rounded-r-lg p-4 ml-4 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
              fontFamily: '"Kalam", "Comic Sans MS", cursive',
            }}
          >
<<<<<<< HEAD
            <div className="italic text-gray-700 leading-relaxed text-sm">
              <MarkdownRenderer content={String(c)} inline={true} />
            </div>
            {ref && (
              <cite className="block mt-2 text-sm text-pink-600 not-italic font-medium">
=======
            <div className="italic text-neutral-700 text-base" style={{ lineHeight: '1.5' }}>
              <MarkdownRenderer content={String(c)} inline={true} />
            </div>
            {ref && (
              <cite className="block mt-2 text-base text-pink-600 not-italic font-medium">
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
                — {ref}
              </cite>
            )}
            {hasReferences && (
              <div className="mt-2 flex justify-end">
                <EnhancedReferenceIndicator references={references} />
              </div>
            )}
          </blockquote>
        </div>
      );
    case "list": {
      let items: string[] = [];
      if (Array.isArray(c)) items = c.map(String);
      else if (typeof c === "string")
        items = c
          .split(/[\n,；;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      return (
        <div
          className="my-0 bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-200"
          style={{
            background: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)",
          }}
        >
          <ul className="space-y-3 select-text">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 select-text">
                <span className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 shadow-sm" />
                <span
<<<<<<< HEAD
                  className="text-sm text-gray-700 leading-relaxed"
                  style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive' }}
=======
                  className="text-base text-neutral-700"
                  style={{ 
                    lineHeight: '1.5',
                    fontFamily: '"Kalam", "Comic Sans MS", cursive'
                  }}
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
                >
                  <MarkdownRenderer content={item} inline={true} />
                </span>
              </li>
            ))}
          </ul>
          {hasReferences && (
            <div className="mt-2 flex justify-end">
              <EnhancedReferenceIndicator references={references} />
            </div>
          )}
        </div>
      );
    }
    case "insight": {
      const blockObj = block as Record<string, unknown>;
      const priority = blockObj["priority"] || "normal";
      const colors =
        priority === "high"
          ? {
              bg: "bg-red-50",
              border: "border-red-300",
              text: "text-red-700",
              accent: "bg-red-400",
              gradient: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)",
            }
          : {
              bg: "bg-blue-50",
              border: "border-blue-300",
              text: "text-blue-700",
              accent: "bg-blue-400",
              gradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            };
      return (
        <div
          className={`my-0 relative rounded-lg p-4 shadow-md transform rotate-1 border-2 ${colors.bg} ${colors.border} select-text`}
          style={{
            background: colors.gradient,
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
          <div
            className={`absolute -top-2 -left-2 w-6 h-6 rounded-full shadow-md ${colors.accent}`}
          />
          <div
            className={`inline-flex items-baseline gap-1 flex-wrap ${colors.text}`}
          >
<<<<<<< HEAD
            <span className="text-sm">
=======
            <span className="text-base" style={{ lineHeight: '1.5' }}>
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
              <MarkdownRenderer content={String(c)} inline={true} />
            </span>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
    }
    case "concept":
      return (
        <div
          className="my-0 relative bg-purple-50 rounded-lg p-4 shadow-md transform -rotate-1 border-2 border-purple-300 select-text"
          style={{
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-400 rounded-full shadow-md" />
          <div className="inline-flex items-baseline gap-1 flex-wrap text-purple-700">
<<<<<<< HEAD
            <span className="text-sm">
=======
            <span className="text-base leading-loose">
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
              <MarkdownRenderer content={String(c)} inline={true} />
            </span>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
    case "qa": {
      if (typeof c === "object" && c !== null) {
<<<<<<< HEAD
        const obj = c as Record<string, unknown>;
=======
        const obj = c as unknown as Record<string, unknown>;
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
        const q = obj["q"] || obj["question"];
        const a = obj["a"] || obj["answer"];
        return (
          <div
            className="my-0 bg-emerald-50 rounded-lg p-4 shadow-sm border-2 border-emerald-200 select-text"
            style={{
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              fontFamily: '"Kalam", "Comic Sans MS", cursive',
            }}
          >
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-400 rounded-full text-white text-sm font-bold flex items-center justify-center shadow-sm">
                  Q
                </span>
<<<<<<< HEAD
                <div className="text-emerald-800 font-medium leading-relaxed flex-1 text-sm">
=======
                <div className="text-emerald-800 font-medium flex-1 text-base" style={{ lineHeight: '1.5' }}>
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
                  <MarkdownRenderer content={String(q)} inline={true} />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full text-white text-sm font-bold flex items-center justify-center shadow-sm">
                  A
                </span>
<<<<<<< HEAD
                <div className="text-emerald-700 leading-relaxed flex-1 text-sm">
=======
                <div className="text-emerald-700 flex-1 text-base" style={{ lineHeight: '1.5' }}>
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
                  <MarkdownRenderer content={String(a)} inline={true} />
                </div>
              </div>
              {hasReferences && (
                <div className="mt-2 flex justify-end">
                  <EnhancedReferenceIndicator references={references} />
                </div>
              )}
            </div>
          </div>
        );
      }
      break;
    }
    case "action":
      return (
        <div
          className="my-0 relative bg-orange-50 rounded-lg p-4 shadow-md transform rotate-1 border-2 border-orange-300 select-text"
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-orange-400 rounded-full shadow-md" />
          <div className="inline-flex items-baseline gap-1 flex-wrap text-orange-700">
<<<<<<< HEAD
            <div className="flex-1 text-sm">
=======
            <div className="flex-1 text-base" style={{ lineHeight: '1.5' }}>
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
              <MarkdownRenderer content={String(c)} inline={true} />
            </div>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
    default: {
      const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
      return (
        <div
<<<<<<< HEAD
          className="my-0 bg-gray-50 rounded-lg p-3 shadow-sm border border-gray-200 select-text"
=======
          className="my-0 bg-neutral-50 rounded-lg p-3 shadow-sm border border-neutral-200 select-text"
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
          style={{
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
<<<<<<< HEAD
          <div className="inline-flex items-baseline gap-1 flex-wrap text-gray-700 leading-relaxed">
            <span className="text-sm">
              <MarkdownRenderer content={finalContent} inline={true} />
            </span>
=======
          <div className="inline-flex items-baseline gap-1 flex-wrap">
            <MarkdownRenderer 
              content={finalContent} 
              inline={true}
              className="text-base text-neutral-800 [&_strong]:text-neutral-800 [&_strong]:font-black leading-[1.5]" // 普通文字更浅，加粗文字更深
            />
>>>>>>> 16a55a9e4ccac58051fcb40085b70fd0d4936544
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
    }
  }
};
