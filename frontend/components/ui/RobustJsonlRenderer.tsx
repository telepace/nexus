"use client";

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, RefreshCw, Lightbulb, Quote, Target, Info } from 'lucide-react';
import { NewEnhancedReferenceIndicator, useReferenceManagerSafe } from './ReferenceManager';

interface ParseResult {
  blocks: JsonlBlock[];
  errors: ParseError[];
  warnings: ParseWarning[];
  stats: ParseStats;
}

interface JsonlBlock {
  type: string;
  content: string;
  lead?: string;
  ref?: string;
  raw: string;
  lineNumber: number;
  isValid: boolean;
  isRecovered?: boolean; // 标记是否通过错误恢复得到
}

interface ParseError {
  lineNumber: number;
  message: string;
  raw: string;
  type: 'syntax' | 'incomplete' | 'missing_field' | 'unknown';
  suggestion?: string;
  recoverable: boolean;
}

interface ParseWarning {
  lineNumber: number;
  message: string;
  type: 'missing_optional' | 'unusual_content' | 'encoding';
}

interface ParseStats {
  totalLines: number;
  validBlocks: number;
  recoveredBlocks: number;
  errorBlocks: number;
  emptyLines: number;
}

export interface RobustJsonlRendererProps {
  content: string;
  className?: string;
  enableHoverEffects?: boolean;
  showErrorDetails?: boolean;
  autoRecover?: boolean;
  maxErrors?: number;
  contentId?: string;
  onError?: (errors: ParseError[]) => void;
  onRecover?: (recoveredBlocks: JsonlBlock[]) => void;
}

/**
 * 增强的JSONL渲染器，具备智能错误恢复和容错处理能力
 * 
 * 特性：
 * 1. 智能检测和修复常见的JSON语法错误
 * 2. 处理不完整的JSON（流式输出中断）
 * 3. 优雅降级显示错误内容
 * 4. 详细的错误报告和恢复建议
 * 5. 支持手动重试和自动恢复
 */
export function RobustJsonlRenderer({
  content,
  className,
  enableHoverEffects = true,
  showErrorDetails = false,
  autoRecover = true,
  maxErrors = 10,
  contentId,
  onError,
  onRecover,
}: RobustJsonlRendererProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [attemptedRecovery, setAttemptedRecovery] = useState(false);
  const { actions } = useReferenceManagerSafe();

  // 高级JSON清理和修复函数
  const smartJsonFixer = {
    // 修复不完整的JSON
    fixIncompleteJson: (line: string): string | null => {
      const trimmed = line.trim();
      
      // 检查是否看起来像JSON开始
      if (trimmed.startsWith('{')) {
        // 尝试补全简单的不完整情况
        if (!trimmed.endsWith('}')) {
          // 尝试添加缺失的字段和结束符
          if (trimmed.includes('"t":') || trimmed.includes('"type":')) {
            // 尝试补全常见的模式
            let fixed = trimmed;
            
            // 如果有未闭合的字符串
            const openQuotes = (fixed.match(/"/g) || []).length;
            if (openQuotes % 2 !== 0) {
              fixed += '"';
            }
            
            // 如果没有结束符
            if (!fixed.endsWith('}')) {
              fixed += '}';
            }
            
            // 验证修复结果
            try {
              JSON.parse(fixed);
              return fixed;
            } catch {
              // 修复失败，尝试更激进的修复
              return smartJsonFixer.aggressiveFix(trimmed);
            }
          }
        }
      }
      
      return null;
    },

    // 激进的JSON修复
    aggressiveFix: (line: string): string | null => {
      try {
        // 尝试提取可能的字段
        const typeMatch = line.match(/"(?:t|type)"\s*:\s*"([^"]*)/);
        const contentMatch = line.match(/"(?:c|content)"\s*:\s*"([^"]*)/);
        const leadMatch = line.match(/"lead"\s*:\s*"([^"]*)/);
        const refMatch = line.match(/"ref"\s*:\s*"([^"]*)/);

        if (typeMatch || contentMatch) {
          const recovered: any = {};
          
          if (typeMatch) recovered.t = typeMatch[1];
          if (contentMatch) recovered.c = contentMatch[1];
          if (leadMatch) recovered.lead = leadMatch[1];
          if (refMatch) recovered.ref = refMatch[1];

          return JSON.stringify(recovered);
        }
      } catch (e) {
        // 最后的努力：尝试提取任何看起来像内容的部分
        const contentPattern = /"([^"]+)"/g;
        const matches = Array.from(line.matchAll(contentPattern));
        
        if (matches.length >= 2) {
          // 假设第一个是类型，第二个是内容
          return JSON.stringify({
            t: matches[0][1],
            c: matches[1][1]
          });
        }
      }
      
      return null;
    },

    // 修复常见的语法错误
    fixSyntaxErrors: (line: string): string => {
      let fixed = line;

      // 修复单引号
      fixed = fixed.replace(/:\s*'([^']*?)'/g, (match, content) => {
        const escaped = content.replace(/"/g, '\\"');
        return `: "${escaped}"`;
      });

      // 修复未引用的键
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // 修复多余的逗号
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      // 修复缺失的逗号
      fixed = fixed.replace(/("\s*)\s*("[a-zA-Z_])/g, '$1,$2');

      // 修复转义问题
      fixed = fixed.replace(/\\"/g, '"').replace(/([^\\])"/g, '$1\\"');
      fixed = fixed.replace(/\\\\"/g, '\\"');

      return fixed;
    }
  };

  // 解析JSONL内容
  const parseJsonlContent = useMemo((): ParseResult => {
    if (!content?.trim()) {
      return {
        blocks: [],
        errors: [],
        warnings: [],
        stats: { totalLines: 0, validBlocks: 0, recoveredBlocks: 0, errorBlocks: 0, emptyLines: 0 }
      };
    }

    const lines = content.split('\n');
    const blocks: JsonlBlock[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    let recoveredCount = 0;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (!trimmed) {
        return; // 跳过空行
      }

      try {
        // 首先尝试直接解析
        const parsed = JSON.parse(trimmed);
        
        if (isValidJsonlBlock(parsed)) {
          blocks.push({
            type: parsed.t || parsed.type || 'p',
            content: parsed.c || parsed.content || '',
            lead: parsed.lead,
            ref: parsed.ref,
            raw: trimmed,
            lineNumber,
            isValid: true
          });
        } else {
          warnings.push({
            lineNumber,
            message: '缺少必需字段 (t/type 和 c/content)',
            type: 'missing_optional'
          });

          // 尝试补全字段
          const fixed = {
            t: parsed.t || parsed.type || 'p',
            c: parsed.c || parsed.content || trimmed,
            ...parsed
          };

          blocks.push({
            type: fixed.t,
            content: fixed.c,
            lead: fixed.lead,
            ref: fixed.ref,
            raw: trimmed,
            lineNumber,
            isValid: false,
            isRecovered: true
          });
          recoveredCount++;
        }
      } catch (originalError) {
        // 解析失败，尝试错误恢复
        let recovered = false;

        if (autoRecover) {
          // 尝试语法修复
          const syntaxFixed = smartJsonFixer.fixSyntaxErrors(trimmed);
          if (syntaxFixed !== trimmed) {
            try {
              const parsed = JSON.parse(syntaxFixed);
              if (isValidJsonlBlock(parsed)) {
                blocks.push({
                  type: parsed.t || parsed.type || 'p',
                  content: parsed.c || parsed.content || '',
                  lead: parsed.lead,
                  ref: parsed.ref,
                  raw: trimmed,
                  lineNumber,
                  isValid: false,
                  isRecovered: true
                });
                recovered = true;
                recoveredCount++;
              }
            } catch {}
          }

          // 如果语法修复失败，尝试不完整JSON修复
          if (!recovered) {
            const incompleteFixed = smartJsonFixer.fixIncompleteJson(trimmed);
            if (incompleteFixed) {
              try {
                const parsed = JSON.parse(incompleteFixed);
                blocks.push({
                  type: parsed.t || parsed.type || 'p',
                  content: parsed.c || parsed.content || '(内容不完整)',
                  lead: parsed.lead,
                  ref: parsed.ref,
                  raw: trimmed,
                  lineNumber,
                  isValid: false,
                  isRecovered: true
                });
                recovered = true;
                recoveredCount++;

                warnings.push({
                  lineNumber,
                  message: '检测到不完整的JSON，已自动补全',
                  type: 'unusual_content'
                });
              } catch {}
            }
          }
        }

        if (!recovered) {
          // 完全无法恢复，记录错误并创建回退块
          const errorType = trimmed.startsWith('{') ? 'incomplete' : 'syntax';
          const suggestion = errorType === 'incomplete' 
            ? '内容可能被截断，请重新生成'
            : '检查JSON语法错误，特别是引号和逗号';

          errors.push({
            lineNumber,
            message: `JSON解析失败: ${(originalError as Error).message}`,
            raw: trimmed,
            type: errorType,
            suggestion,
            recoverable: errorType === 'incomplete'
          });

          // 创建错误回退块
          blocks.push({
            type: 'error',
            content: trimmed,
            raw: trimmed,
            lineNumber,
            isValid: false
          });
        }
      }
    });

    const stats: ParseStats = {
      totalLines: lines.length,
      validBlocks: blocks.filter(b => b.isValid).length,
      recoveredBlocks: recoveredCount,
      errorBlocks: errors.length,
      emptyLines: lines.filter(line => !line.trim()).length
    };

    // 触发回调
    if (errors.length > 0 && onError) {
      onError(errors);
    }
    if (recoveredCount > 0 && onRecover) {
      onRecover(blocks.filter(b => b.isRecovered));
    }

    return { blocks, errors, warnings, stats };
  }, [content, autoRecover, onError, onRecover]);

  // 检查是否为有效的JSONL块
  function isValidJsonlBlock(obj: any): boolean {
    return obj && 
           typeof obj === 'object' && 
           (obj.t || obj.type) && 
           (obj.c || obj.content !== undefined);
  }

  // 渲染单个块
  const renderBlock = (block: JsonlBlock, index: number) => {
    const references = actions.parseReferences(block.ref);
    const hasReferences = references.length > 0;

    // 错误块的特殊渲染
    if (block.type === 'error') {
      return (
        <Alert key={index} variant="destructive" className="my-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">第 {block.lineNumber} 行解析失败</p>
              <code className="block p-2 bg-muted rounded text-xs overflow-x-auto">
                {block.content}
              </code>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // 恢复块的特殊标记
    const isRecovered = block.isRecovered;

    return (
      <div
        key={index}
        className={cn(
          "group relative rounded-lg transition-all duration-200",
          enableHoverEffects && "hover:bg-muted/30 px-2 -mx-2",
          isRecovered && "border-l-2 border-amber-400 pl-3"
        )}
      >
        {/* 恢复标记 */}
        {isRecovered && (
          <div className="absolute -left-2 top-0 flex items-center">
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              已恢复
            </Badge>
          </div>
        )}

        {renderBlockContent(block, hasReferences, references)}
      </div>
    );
  };

  // 渲染块内容
  const renderBlockContent = (block: JsonlBlock, hasReferences: boolean, references: number[]) => {
    const { type, content, lead } = block;

    const referenceElement = hasReferences && contentId ? (
      <NewEnhancedReferenceIndicator
        references={references}
        contentId={contentId}
        className="inline-block"
      />
    ) : hasReferences ? (
      <Badge variant="secondary" className="text-xs ml-1">
        [{references.join(',')}]
      </Badge>
    ) : null;

    switch (type) {
      case 'h1':
        return (
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            {content}
            {referenceElement}
          </h1>
        );

      case 'h2':
        return (
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            {content}
            {referenceElement}
          </h2>
        );

      case 'insight':
        return (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/30 shadow-sm my-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                  核心洞察
                </div>
                <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                  {content}
                </p>
                {referenceElement && (
                  <div className="mt-3 flex items-center gap-2">
                    <Quote className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    {referenceElement}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'p':
        return (
          <div className="my-3">
            {lead && (
              <div className="font-medium text-sm text-primary mb-2">
                {lead}
              </div>
            )}
            <p className="text-sm leading-relaxed text-foreground">
              {content}
              {referenceElement}
            </p>
          </div>
        );

      default:
        return (
          <div className="my-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {type}
              </span>
              {referenceElement}
            </div>
            <p className="text-sm leading-relaxed">
              {content}
            </p>
          </div>
        );
    }
  };

  // 渲染错误摘要
  const renderErrorSummary = () => {
    const { errors, warnings, stats } = parseJsonlContent;
    
    if (errors.length === 0 && warnings.length === 0) return null;

    return (
      <div className="mb-4 space-y-2">
        {/* 统计摘要 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>📊 总行数: {stats.totalLines}</span>
          <span>✅ 有效块: {stats.validBlocks}</span>
          {stats.recoveredBlocks > 0 && (
            <span className="text-amber-600">🔧 已恢复: {stats.recoveredBlocks}</span>
          )}
          {stats.errorBlocks > 0 && (
            <span className="text-destructive">❌ 错误: {stats.errorBlocks}</span>
          )}
        </div>

        {/* 错误详情 */}
        {(errors.length > 0 || warnings.length > 0) && (
          <Collapsible open={showErrors} onOpenChange={setShowErrors}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {errors.length > 0 && `${errors.length} 个错误`}
                    {errors.length > 0 && warnings.length > 0 && ', '}
                    {warnings.length > 0 && `${warnings.length} 个警告`}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">第 {error.lineNumber} 行: {error.message}</p>
                      {error.suggestion && (
                        <p className="text-xs text-muted-foreground">💡 {error.suggestion}</p>
                      )}
                      <code className="block p-1 bg-muted rounded text-xs">
                        {error.raw}
                      </code>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              
              {warnings.map((warning, index) => (
                <Alert key={index}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="text-sm">第 {warning.lineNumber} 行: {warning.message}</p>
                  </AlertDescription>
                </Alert>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  const { blocks } = parseJsonlContent;

  if (!content?.trim()) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-muted-foreground text-sm">暂无内容</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showErrorDetails && renderErrorSummary()}
      
      <div className="space-y-1">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {blocks.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            内容无法解析。请检查JSONL格式是否正确。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 