import React, { useState } from "react";
import { StyleRenderer } from "./types";
import { NeumorphicExpandButton } from "../NeumorphicExpandButton";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { EnhancedReferenceIndicator } from "../ReferenceManager";

// ActionCard component that manages its own hover state
interface ActionCardProps {
  shouldShowExpandButton: boolean;
  onExpand: () => void;
  c: React.ReactNode;
  hasReferences: boolean;
  references: number[];
  MarkdownRenderer: typeof MarkdownRenderer;
  EnhancedReferenceIndicator: typeof EnhancedReferenceIndicator;
}

const ActionCard: React.FC<ActionCardProps> = ({
  shouldShowExpandButton,
  onExpand,
  c,
  hasReferences,
  references,
  MarkdownRenderer,
  EnhancedReferenceIndicator,
}) => {
  const [isCardHovered, setIsCardHovered] = useState(false);

  return (
    <div
      className={`my-2 relative group min-h-[140px] flex justify-between items-center rounded-2xl p-5 select-text transition-all duration-300 ease-in-out text-neutral-900 linear-bg-1 ${shouldShowExpandButton ? 'pl-20' : ''}`}
      style={{
        boxShadow: "10px 10px 20px #c2c2c2, -10px -10px 20px #ffffff",
        fontFamily: '"Kalam", "Comic Sans MS", cursive',
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Expand button - only show if expandable */}
      {shouldShowExpandButton && (
        <NeumorphicExpandButton
          side="left"
          onExpand={onExpand}
          isHovered={isCardHovered}
        />
      )}
      
      <div className="text-base leading-relaxed flex-1">
        <MarkdownRenderer content={String(c)} inline={true} />
      </div>
      {hasReferences && (
        <div className="ml-2">
          <EnhancedReferenceIndicator references={references} />
        </div>
      )}
    </div>
  );
};

// ParagraphCard component that manages its own hover state
interface ParagraphCardProps {
  shouldShowExpandButton: boolean;
  onExpand: () => void;
  finalContent: string;
  hasReferences: boolean;
  references: number[];
  MarkdownRenderer: typeof MarkdownRenderer;
  EnhancedReferenceIndicator: typeof EnhancedReferenceIndicator;
}

const ParagraphCard: React.FC<ParagraphCardProps> = ({
  shouldShowExpandButton,
  onExpand,
  finalContent,
  hasReferences,
  references,
  MarkdownRenderer,
  EnhancedReferenceIndicator,
}) => {
  const [isCardHovered, setIsCardHovered] = useState(false);

  return (
    <div
      className={`my-0 bg-neutral-50 rounded-lg shadow-sm border border-neutral-200 select-text relative group transition-all duration-300 ease-in-out ${shouldShowExpandButton ? 'pl-20 p-5' : 'p-3'}`}
      style={{
        background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
        fontFamily: '"Kalam", "Comic Sans MS", cursive',
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Expand button - only show if expandable (same as action) */}
      {shouldShowExpandButton && (
        <NeumorphicExpandButton
          side="left"
          onExpand={onExpand}
          isHovered={isCardHovered}
        />
      )}
      
      <div className="inline-flex items-baseline gap-1 flex-wrap">
        <MarkdownRenderer 
          content={finalContent} 
          inline={true}
          className="text-sm text-neutral-800 [&_strong]:text-neutral-800 [&_strong]:font-black leading-relaxed"
        />
        {hasReferences && (
          <EnhancedReferenceIndicator references={references} />
        )}
      </div>
    </div>
  );
};

export const notebookStyleRenderer: StyleRenderer = ({
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
    case "h1": {
      const element = (
        <div className="relative mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <div className="absolute -left-4 top-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-full shadow-sm" />
          <span
            className="text-xl font-bold text-gray-800 select-text leading-relaxed pl-4"
            style={{ fontFamily: '"Kalam", "Comic Sans MS", cursive' }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "h2": {
      const element = (
        <div className="mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-xl font-bold text-neutral-700 select-text"
            style={{ 
              lineHeight: '1.5',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "h3": {
      const element = (
        <div className="mt-4 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-lg font-bold text-neutral-700 select-text"
            style={{ 
              lineHeight: '1.5',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "h4": {
      const element = (
        <div className="mt-3 mb-2 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-base font-bold text-neutral-600 select-text"
            style={{ 
              lineHeight: '1.4',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "h5": {
      const element = (
        <div className="mt-2 mb-1 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-sm font-bold text-neutral-600 select-text uppercase tracking-wide"
            style={{ 
              lineHeight: '1.4',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "h6": {
      const element = (
        <div className="mt-2 mb-1 inline-flex items-baseline gap-1 flex-wrap">
          <span
            className="text-xs font-bold text-neutral-500 select-text uppercase tracking-wider"
            style={{ 
              lineHeight: '1.4',
              fontFamily: '"Kalam", "Comic Sans MS", cursive'
            }}
          >
            <MarkdownRenderer content={String(c)} inline={true} />
          </span>
          {hasReferences && (
            <EnhancedReferenceIndicator references={references} />
          )}
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "quote": {
      const element = (
        <div className="relative my-2 select-text">
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
            <div className="italic text-neutral-700 text-base" style={{ lineHeight: '1.5' }}>
              <MarkdownRenderer content={String(c)} inline={true} />
            </div>
            {ref && (
              <cite className="block mt-2 text-base text-pink-600 not-italic font-medium">
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
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "list": {
      let items: string[] = [];
      if (Array.isArray(c)) items = c.map(String);
      else if (typeof c === "string")
        items = c
          .split(/[\n,；;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      const element = (
        <div
          className="my-2 bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-200"
          style={{
            background: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)",
          }}
        >
          <ul className="space-y-3 select-text">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 select-text">
                <span className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 shadow-sm" />
                <span
                  className="text-base text-neutral-700"
                  style={{ 
                    lineHeight: '1.5',
                    fontFamily: '"Kalam", "Comic Sans MS", cursive'
                  }}
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
      return {
        element,
        hasCustomExpandButton: false,
      };
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
      const element = (
        <div
          className={`my-2 relative rounded-lg p-4 shadow-md transform rotate-1 border-2 ${colors.bg} ${colors.border} select-text`}
          style={{
            background: colors.gradient,
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
          <div
            className={`inline-flex items-baseline gap-1 flex-wrap ${colors.text}`}
          >
            <span className="text-base" style={{ lineHeight: '1.5' }}>
              <MarkdownRenderer content={String(c)} inline={true} />
            </span>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "concept": {
      const element = (
        <div
          className="my-2 relative bg-purple-50 rounded-lg p-4 shadow-md transform -rotate-1 border-2 border-purple-300 select-text"
          style={{
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            fontFamily: '"Kalam", "Comic Sans MS", cursive',
          }}
        >
          <div className="inline-flex items-baseline gap-1 flex-wrap text-purple-700">
            <span className="text-base leading-loose">
              <MarkdownRenderer content={String(c)} inline={true} />
            </span>
            {hasReferences && (
              <EnhancedReferenceIndicator references={references} />
            )}
          </div>
        </div>
      );
      return {
        element,
        hasCustomExpandButton: false,
      };
    }
    case "qa": {
      if (typeof c === "object" && c !== null) {
        const obj = c as unknown as Record<string, unknown>;
        const q = obj["q"] || obj["question"];
        const a = obj["a"] || obj["answer"];
        const element = (
          <div
            className="my-2 bg-emerald-50 rounded-lg p-4 shadow-sm border-2 border-emerald-200 select-text"
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
                <div className="text-emerald-800 font-medium flex-1 text-base" style={{ lineHeight: '1.5' }}>
                  <MarkdownRenderer content={String(q)} inline={true} />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full text-white text-sm font-bold flex items-center justify-center shadow-sm">
                  A
                </span>
                <div className="text-emerald-700 flex-1 text-base" style={{ lineHeight: '1.5' }}>
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
        return {
          element,
          hasCustomExpandButton: false,
        };
      }
      break;
    }
    case "action": {
      // Check if this action should show expand button
      const shouldShowExpandButton = !!block.expandable && !!onExpand;
      
      const element = (
        <ActionCard
          shouldShowExpandButton={shouldShowExpandButton}
          onExpand={() => onExpand && onExpand(block)}
          c={c}
          hasReferences={hasReferences}
          references={references}
          MarkdownRenderer={MarkdownRenderer}
          EnhancedReferenceIndicator={EnhancedReferenceIndicator}
        />
      );

      return {
        element,
        hasCustomExpandButton: shouldShowExpandButton,
      };
    }
    default: {
      const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
      
      // Check if this paragraph should show expand button (same logic as action)
      const shouldShowExpandButton = !!block.expandable && !!onExpand;
      
      const element = (
        <ParagraphCard
          shouldShowExpandButton={shouldShowExpandButton}
          onExpand={() => onExpand && onExpand(block)}
          finalContent={finalContent}
          hasReferences={hasReferences}
          references={references}
          MarkdownRenderer={MarkdownRenderer}
          EnhancedReferenceIndicator={EnhancedReferenceIndicator}
        />
      );

      return {
        element,
        hasCustomExpandButton: shouldShowExpandButton,
      };
    }
  }
};
