import React from "react";
import { StyleRenderer, StyleRenderResult } from "./types";

// Helper to create render result
const wrapElement = (element: React.ReactNode): StyleRenderResult => ({
  element,
  hasCustomExpandButton: false,
});

/**
 * Headspace 風格：使用漸變、大圓角、旋轉動畫等溫暖友好的視覺。
 * 僅示範常用區塊（其餘區塊可參考 notebook.tsx 擴充）。
 */
export const headspaceStyleRenderer: StyleRenderer = ({
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

  const gradientWrapper = (
    children: React.ReactNode,
    from: string,
    to: string,
    rotate: boolean = false,
  ) => (
    <div className="my-6 relative">
      <div
        className={`bg-gradient-to-r ${from} ${to} rounded-3xl p-6 shadow-lg transition-all duration-300 ${
          rotate ? "transform rotate-1 hover:rotate-0" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );

  switch (type) {
    case "h1":
      // 與 H2 視覺完全一致
      return wrapElement(gradientWrapper(
        <h1 className="text-xl font-medium text-white select-text leading-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-white rounded-full" />
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </h1>,
        "from-green-400",
        "to-teal-400",
        true)
      );
    case "h2":
      return wrapElement(gradientWrapper(
        <h2 className="text-2xl font-semibold text-white select-text leading-tight flex items-center gap-2">
          <span className="w-3 h-3 bg-white rounded-full" />
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </h2>,
        "from-blue-400",
        "to-purple-400",
        true)
      );
    case "h3":
      return wrapElement(gradientWrapper(
        <h3 className="text-xl font-medium text-white select-text leading-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-white rounded-full" />
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </h3>,
        "from-green-400",
        "to-teal-400",
        true)
      );
    case "quote":
      return wrapElement(gradientWrapper(
        <blockquote className="text-lg text-gray-800 leading-relaxed select-text">
          <MarkdownRenderer content={String(c)} inline={true} />
          {ref && (
            <cite className="block mt-2 text-sm text-gray-700">— {ref}</cite>
          )}
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </blockquote>,
        "from-yellow-200",
        "to-orange-200",
        true)
      );
    case "list": {
      let items: string[] = [];
      if (Array.isArray(c)) items = c.map(String);
      else if (typeof c === "string")
        items = c
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      return wrapElement(gradientWrapper(
        <ul className="space-y-3 select-text">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-gray-800 leading-relaxed"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full mt-2" />
              <MarkdownRenderer content={item} inline={true} />
            </li>
          ))}
          {hasReferences && (
            <li>
              <EnhancedReferenceIndicator references={references} />
            </li>
          )}
        </ul>,
        "from-yellow-200",
        "to-orange-200",
        true)
      );
    }
    case "insight": {
      const blockObj = block as Record<string, unknown>;
      const priority = blockObj["priority"] || "normal";
      const icon = priority === "high" ? "⚡" : "💡";

      return wrapElement(gradientWrapper(
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="flex-1 text-gray-800 select-text">
            <MarkdownRenderer content={String(c)} inline={true} />
            {hasReferences && (
              <EnhancedReferenceIndicator
                references={references}
                className="ml-2"
              />
            )}
          </div>
        </div>,
        "from-yellow-200",
        "to-orange-200",
        true)
      );
    }
    case "concept":
      return wrapElement(gradientWrapper(
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧠</span>
          <div className="text-gray-800 select-text">
            <MarkdownRenderer content={String(c)} inline={true} />
            {hasReferences && (
              <EnhancedReferenceIndicator
                references={references}
                className="ml-2"
              />
            )}
          </div>
        </div>,
        "from-purple-300",
        "to-pink-300",
        true)
      );
    case "qa": {
      if (typeof c === "object" && c !== null) {
        const obj = c as Record<string, unknown>;
        const q = obj["q"] || obj["question"];
        const a = obj["a"] || obj["answer"];
        return wrapElement(gradientWrapper(
          <div className="space-y-4 select-text text-gray-800">
            <p>
              <strong>Q:</strong>{" "}
              <MarkdownRenderer content={String(q)} inline={true} />
            </p>
            <p>
              <strong>A:</strong>{" "}
              <MarkdownRenderer content={String(a)} inline={true} />
            </p>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>,
          "from-green-300",
          "to-emerald-300",
          true)
        );
      }
      break;
    }
    case "action":
      return wrapElement(gradientWrapper(
        <div className="flex items-start gap-3 text-gray-800 select-text">
          <span className="text-2xl">🎯</span>
          <MarkdownRenderer content={String(c)} inline={true} />
          {hasReferences && (
            <EnhancedReferenceIndicator
              references={references}
              className="ml-2"
            />
          )}
        </div>,
        "from-orange-300",
        "to-red-300",
        true)
      );
    default: {
      const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
      return wrapElement(gradientWrapper(
        <MarkdownRenderer content={finalContent} inline={true} />,
        "from-gray-100",
        "to-gray-200",
        true)
      );
    }
  }
};
