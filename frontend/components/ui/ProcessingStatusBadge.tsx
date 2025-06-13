import { FC } from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  progress?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
  bgClassName: string;
}

const statusConfigs: Record<ProcessingStatus, StatusConfig> = {
  pending: {
    icon: Clock,
    label: "等待处理",
    className: "text-amber-600 border-amber-200",
    bgClassName: "bg-amber-50",
  },
  processing: {
    icon: Loader2,
    label: "处理中",
    className: "text-blue-600 border-blue-200",
    bgClassName: "bg-blue-50",
  },
  completed: {
    icon: CheckCircle2,
    label: "处理完成",
    className: "text-green-600 border-green-200",
    bgClassName: "bg-green-50",
  },
  failed: {
    icon: XCircle,
    label: "处理失败",
    className: "text-red-600 border-red-200",
    bgClassName: "bg-red-50",
  },
};

const sizeClasses = {
  sm: {
    container: "text-xs px-1.5 py-0.5",
    icon: "h-3 w-3",
    gap: "gap-1",
  },
  md: {
    container: "text-sm px-2 py-1",
    icon: "h-4 w-4",
    gap: "gap-1.5",
  },
  lg: {
    container: "text-base px-3 py-1.5",
    icon: "h-5 w-5",
    gap: "gap-2",
  },
};

export const ProcessingStatusBadge: FC<ProcessingStatusBadgeProps> = ({
  status,
  progress,
  className,
  size = "md",
  showText = true,
}) => {
  const config = statusConfigs[status];
  const sizeConfig = sizeClasses[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-colors",
        config.className,
        config.bgClassName,
        sizeConfig.container,
        sizeConfig.gap,
        className,
      )}
    >
      <Icon
        className={cn(
          sizeConfig.icon,
          status === "processing" && "animate-spin",
        )}
      />
      {showText && (
        <span>
          {config.label}
          {status === "processing" && progress !== undefined && (
            <span className="ml-1">({progress}%)</span>
          )}
        </span>
      )}
    </div>
  );
};

// 简化版本，只显示图标
export const ProcessingStatusIcon: FC<ProcessingStatusBadgeProps> = (props) => {
  return <ProcessingStatusBadge {...props} showText={false} />;
};
