"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";

interface SegmentReference {
  sentence_index: number;
  segment_ids: string[];
  relevance_score: number;
}

interface SegmentUsed {
  id: string;
  content: string;
  segment_index: number;
}

interface SegmentReferencedMessageProps {
  content: string;
  segmentReferences: SegmentReference[];
  segmentsUsed: SegmentUsed[];
  onSegmentClick?: (segmentId: string, segmentIndex: number) => void;
}

export function SegmentReferencedMessage({
  content,
  segmentReferences,
  segmentsUsed,
  onSegmentClick,
}: SegmentReferencedMessageProps) {
  const [showSegments, setShowSegments] = useState(false);

  // 将内容分割成句子
  const sentences = content
    .split(/[。！？.!?]/)
    .filter((s) => s.trim().length > 0);

  // 为每个句子添加引用信息
  const sentencesWithReferences = sentences.map((sentence, index) => {
    const references = segmentReferences.filter(
      (ref) => ref.sentence_index === index,
    );
    return {
      text: sentence.trim(),
      index,
      references,
    };
  });

  const handleSegmentClick = (segmentId: string) => {
    const segment = segmentsUsed.find((s) => s.id === segmentId);
    if (segment && onSegmentClick) {
      onSegmentClick(segmentId, segment.segment_index);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="space-y-3">
      {/* AI回答内容 */}
      <div className="prose prose-sm max-w-none">
        {sentencesWithReferences.map((sentence, index) => (
          <span key={index} className="inline">
            {sentence.text}
            {sentence.references.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="ml-1 text-xs cursor-help"
                    >
                      [{sentence.references.length}]
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">引用段落:</p>
                      {sentence.references.map((ref, refIndex) => (
                        <div key={refIndex} className="text-xs">
                          {ref.segment_ids.length} 个段落 (相关性:{" "}
                          {(ref.relevance_score * 100).toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {index < sentencesWithReferences.length - 1 && "。 "}
          </span>
        ))}
      </div>

      {/* 引用段落折叠面板 */}
      {segmentsUsed.length > 0 && (
        <Collapsible open={showSegments} onOpenChange={setShowSegments}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                查看引用段落 ({segmentsUsed.length})
              </div>
              {showSegments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {segmentsUsed.map((segment) => {
              // 找到引用这个段落的所有引用信息
              const referencingSegments = segmentReferences.filter((ref) =>
                ref.segment_ids.includes(segment.id),
              );

              const maxRelevance = Math.max(
                ...referencingSegments.map((ref) => ref.relevance_score),
                0,
              );

              return (
                <Card key={segment.id} className="border-l-4 border-l-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>段落 {segment.segment_index + 1}</span>
                      <div className="flex items-center gap-2">
                        {maxRelevance > 0 && (
                          <Badge
                            className={`text-xs ${getRelevanceColor(maxRelevance)}`}
                          >
                            相关性: {(maxRelevance * 100).toFixed(0)}%
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSegmentClick(segment.id)}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {segment.content}
                    </p>
                    {referencingSegments.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        被引用 {referencingSegments.length} 次
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 引用统计 */}
      {segmentReferences.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
          <FileText className="h-3 w-3" />
          <span>
            本回答引用了 {segmentsUsed.length} 个段落， 共{" "}
            {segmentReferences.reduce(
              (acc, ref) => acc + ref.segment_ids.length,
              0,
            )}{" "}
            次引用
          </span>
        </div>
      )}
    </div>
  );
}
