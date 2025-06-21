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
  textClass: string;
}

const statusConfigs: Record<ProcessingStatus, StatusConfig> = {
  pending: {
    icon: Clock,
    label: "等待处理",
    textClass: "text-neutral-600",
  },
  processing: {
    icon: Loader2,
    label: "处理中",
    textClass: "text-neutral-600",
  },
  completed: {
    icon: CheckCircle2,
    label: "处理完成",
    textClass: "text-neutral-600",
  },
  failed: {
    icon: XCircle,
    label: "处理失败",
    textClass: "text-neutral-600",
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
  showText = false,
}) => {
  const config = statusConfigs[status];
  const sizeConfig = sizeClasses[size];
  const Icon = config.icon;

  const iconSizeMap: Record<typeof size, string> = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-colors border-transparent bg-transparent",
        config.textClass,
        sizeConfig.container,
        sizeConfig.gap,
        className,
      )}
    >
      <Icon
        className={cn(
          iconSizeMap[size],
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
