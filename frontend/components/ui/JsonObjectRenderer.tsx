"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface JsonObjectRendererProps {
  /** JSON object or JSON string to render */
  data: any;
  /** Additional class names for the container */
  className?: string;
  /** Maximum depth to expand by default */
  defaultExpandDepth?: number;
  /** Whether to show copy button */
  showCopyButton?: boolean;
}

interface JsonNodeProps {
  data: any;
  keyName?: string;
  level: number;
  maxExpandDepth: number;
  isLast?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ 
  data, 
  keyName, 
  level, 
  maxExpandDepth, 
  isLast = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(level < maxExpandDepth);
  
  const getDataType = (value: any): string => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case "string": return "text-green-600 dark:text-green-400";
      case "number": return "text-blue-600 dark:text-blue-400";
      case "boolean": return "text-purple-600 dark:text-purple-400";
      case "null": return "text-gray-500 dark:text-gray-400";
      default: return "text-gray-700 dark:text-gray-300";
    }
  };

  const renderValue = (value: any) => {
    const type = getDataType(value);
    
    if (type === "string") {
      return <span className={getValueColor(type)}>"{value}"</span>;
    }
    
    if (type === "number" || type === "boolean") {
      return <span className={getValueColor(type)}>{String(value)}</span>;
    }
    
    if (type === "null") {
      return <span className={getValueColor(type)}>null</span>;
    }
    
    return <span className={getValueColor(type)}>{String(value)}</span>;
  };

  const isPrimitive = (value: any) => {
    const type = getDataType(value);
    return ["string", "number", "boolean", "null"].includes(type);
  };

  const getIndentation = (level: number) => {
    return level * 20; // 20px per level
  };

  if (isPrimitive(data)) {
    return (
      <div 
        className="flex items-center py-1"
        style={{ paddingLeft: `${getIndentation(level)}px` }}
      >
        {keyName && (
          <span className="text-gray-700 dark:text-gray-300 mr-2">
            "{keyName}":
          </span>
        )}
        {renderValue(data)}
        {!isLast && <span className="text-gray-400 ml-1">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const isObject = !isArray && typeof data === "object" && data !== null;
  
  if (!isArray && !isObject) {
    return (
      <div 
        className="flex items-center py-1"
        style={{ paddingLeft: `${getIndentation(level)}px` }}
      >
        {keyName && (
          <span className="text-gray-700 dark:text-gray-300 mr-2">
            "{keyName}":
          </span>
        )}
        {renderValue(data)}
        {!isLast && <span className="text-gray-400 ml-1">,</span>}
      </div>
    );
  }

  const entries = isArray 
    ? data.map((item: any, index: number) => [index, item])
    : Object.entries(data);
    
  const isEmpty = entries.length === 0;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div>
      {/* Header with key name and open bracket */}
      <div 
        className="flex items-center py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        style={{ paddingLeft: `${getIndentation(level)}px` }}
        onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
      >
        {!isEmpty && (
          <span className="mr-1 text-gray-400">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {isEmpty && <span className="w-4" />}
        
        {keyName && (
          <span className="text-gray-700 dark:text-gray-300 mr-2">
            "{keyName}":
          </span>
        )}
        
        <span className="text-gray-500 dark:text-gray-400">
          {openBracket}
        </span>
        
        {!isExpanded && !isEmpty && (
          <span className="text-gray-400 text-sm ml-1">
            {isArray ? `${entries.length} items` : `${entries.length} keys`}
          </span>
        )}
        
        {isEmpty && (
          <span className="text-gray-500 dark:text-gray-400 ml-0">
            {closeBracket}
          </span>
        )}
        
        {!isEmpty && !isExpanded && (
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            {closeBracket}
          </span>
        )}
        
        {(isEmpty || !isExpanded) && !isLast && (
          <span className="text-gray-400 ml-1">,</span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && !isEmpty && (
        <>
          {entries.map(([key, value], index) => (
            <JsonNode
              key={`${keyName || 'root'}-${key}`}
              data={value}
              keyName={isArray ? undefined : String(key)}
              level={level + 1}
              maxExpandDepth={maxExpandDepth}
              isLast={index === entries.length - 1}
            />
          ))}
          
          {/* Closing bracket */}
          <div 
            className="flex items-center py-1"
            style={{ paddingLeft: `${getIndentation(level)}px` }}
          >
            <span className="text-gray-500 dark:text-gray-400">
              {closeBracket}
            </span>
            {!isLast && <span className="text-gray-400 ml-1">,</span>}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * JSON Object Renderer with syntax highlighting and collapsible tree structure
 */
export function JsonObjectRenderer({ 
  data, 
  className,
  defaultExpandDepth = 2,
  showCopyButton = true
}: JsonObjectRendererProps) {
  const handleCopy = async () => {
    try {
      const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      toast.success("已复制JSON内容");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  // Parse data if it's a string
  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      // If parsing fails, treat as plain text
      return (
        <div className={cn("text-sm text-gray-600 dark:text-gray-400", className)}>
          {data}
        </div>
      );
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Copy button */}
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title="复制JSON"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
      
      {/* JSON tree */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96 border border-gray-200 dark:border-gray-700">
        <JsonNode 
          data={parsedData} 
          level={0} 
          maxExpandDepth={defaultExpandDepth}
          isLast={true}
        />
      </div>
    </div>
  );
} 