import { FC } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Lightbulb,
  Tags,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

interface ProcessingStep {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: ProcessingStatus;
  progress?: number;
  error?: string;
  details?: string;
}

interface DetailedProcessingStatusProps {
  overallStatus: ProcessingStatus;
  steps?: {
    content_extraction?: ProcessingStatus;
    summary?: ProcessingStatus;
    key_points?: ProcessingStatus;
    labels?: ProcessingStatus;
  };
  progress?: number;
  className?: string;
  compact?: boolean;
}

const getStatusIcon = (status: ProcessingStatus) => {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "processing":
      return Loader2;
    case "failed":
      return XCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: ProcessingStatus) => {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "processing":
      return "text-blue-600 dark:text-blue-400";
    case "failed":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
};

const getStatusBadgeVariant = (status: ProcessingStatus) => {
  switch (status) {
    case "completed":
      return "default";
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

export const DetailedProcessingStatus: FC<DetailedProcessingStatusProps> = ({
  overallStatus,
  steps,
  progress,
  className,
  compact = false,
}) => {
  const processingSteps: ProcessingStep[] = [
    {
      name: "内容提取",
      icon: FileText,
      status: steps?.content_extraction || overallStatus,
      details: "提取和解析内容",
    },
    {
      name: "摘要生成",
      icon: BarChart3,
      status:
        steps?.summary ||
        (overallStatus === "completed" ? "completed" : "pending"),
      details: "AI 生成内容摘要",
    },
    {
      name: "要点提取",
      icon: Lightbulb,
      status:
        steps?.key_points ||
        (overallStatus === "completed" ? "completed" : "pending"),
      details: "AI 提取关键要点",
    },
    {
      name: "标签分析",
      icon: Tags,
      status:
        steps?.labels ||
        (overallStatus === "completed" ? "completed" : "pending"),
      details: "AI 生成标签和分类",
    },
  ];

  const completedSteps = processingSteps.filter(
    (step) => step.status === "completed",
  ).length;
  const totalSteps = processingSteps.length;
  const calculatedProgress =
    progress ?? Math.round((completedSteps / totalSteps) * 100);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
          {processingSteps.map((step) => {
            const Icon = getStatusIcon(step.status);
            return (
              <div
                key={step.name}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2",
                  step.status === "completed" &&
                    "bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-700",
                  step.status === "processing" &&
                    "bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700",
                  step.status === "failed" &&
                    "bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-700",
                  step.status === "pending" &&
                    "bg-gray-100 border-gray-200 dark:bg-gray-900/20 dark:border-border",
                )}
              >
                <Icon
                  className={cn(
                    "w-3 h-3",
                    getStatusColor(step.status),
                    step.status === "processing" && "animate-spin",
                  )}
                />
              </div>
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground">
          {completedSteps}/{totalSteps} 完成
        </span>
        {overallStatus === "processing" && progress !== undefined && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {progress}%
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">处理进度</CardTitle>
          <Badge variant={getStatusBadgeVariant(overallStatus)}>
            {overallStatus === "processing"
              ? "处理中"
              : overallStatus === "completed"
                ? "已完成"
                : overallStatus === "failed"
                  ? "失败"
                  : "等待中"}
          </Badge>
        </div>
        {overallStatus === "processing" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>总体进度</span>
              <span>{calculatedProgress}%</span>
            </div>
            <Progress value={calculatedProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {processingSteps.map((step) => {
          const Icon = step.icon;
          const StatusIcon = getStatusIcon(step.status);

          return (
            <div
              key={step.name}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
            >
              <div className="flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{step.name}</span>
                  <StatusIcon
                    className={cn(
                      "w-3 h-3",
                      getStatusColor(step.status),
                      step.status === "processing" && "animate-spin",
                    )}
                  />
                </div>
                {step.details && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.details}
                  </p>
                )}
                {step.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {step.error}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <Badge
                  variant={getStatusBadgeVariant(step.status)}
                  className="text-xs"
                >
                  {step.status === "processing"
                    ? "进行中"
                    : step.status === "completed"
                      ? "完成"
                      : step.status === "failed"
                        ? "失败"
                        : "等待"}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DetailedProcessingStatus;
