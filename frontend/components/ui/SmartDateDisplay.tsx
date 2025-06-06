"use client";

import React, { useState, useEffect } from "react";
import { formatDate, formatRelativeTime, formatTimeDistance } from "@/lib/date";
import { useTimeZone } from "@/lib/time-zone-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export type SmartDateFormat = "smart" | "relative" | "absolute" | "distance";

interface SmartDateDisplayProps {
  date: string | Date | number;
  format?: SmartDateFormat;
  showTimeZone?: boolean;
  customFormat?: string;
  className?: string;
  updateInterval?: number; // 更新间隔（毫秒），默认30秒
  showTooltip?: boolean; // 是否显示详细信息的提示
}

/**
 * 智能日期展示组件
 *
 * 功能特性：
 * 1. 同时显示相对时间和绝对时间
 * 2. 根据时间距离智能选择显示格式
 * 3. 支持实时更新
 * 4. 支持悬停显示详细信息
 * 5. 根据用户时区显示本地时间
 */
export function SmartDateDisplay({
  date,
  format = "smart",
  showTimeZone = false,
  customFormat,
  className = "",
  updateInterval = 30000, // 30秒更新一次
  showTooltip = true,
}: SmartDateDisplayProps) {
  const { timeZone } = useTimeZone();
  const [now, setNow] = useState(new Date());

  // 定时更新当前时间，用于实时显示相对时间
  useEffect(() => {
    if (format === "smart" || format === "relative" || format === "distance") {
      const timer = setInterval(() => {
        setNow(new Date());
      }, updateInterval);

      return () => clearInterval(timer);
    }
  }, [format, updateInterval]);

  if (!date) {
    return null;
  }

  // 智能格式选择逻辑
  const getSmartFormat = (date: string | Date | number): SmartDateFormat => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffHours =
      Math.abs(now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);

    // 1小时内：显示距离时间（如"5分钟前"）
    if (diffHours < 1) {
      return "distance";
    }
    // 24小时内：显示相对时间（如"今天 15:30"）
    else if (diffHours < 24) {
      return "relative";
    }
    // 超过24小时：显示绝对时间
    else {
      return "absolute";
    }
  };

  // 获取主要显示格式
  const getMainDisplay = (): string => {
    const displayFormat = format === "smart" ? getSmartFormat(date) : format;

    switch (displayFormat) {
      case "relative":
        return formatRelativeTime(date, now, { timeZone });
      case "distance":
        return formatTimeDistance(date, now, { timeZone });
      case "absolute":
      default:
        return formatDate(date, customFormat || "yyyy-MM-dd HH:mm", {
          timeZone,
          showTimeZone,
        });
    }
  };

  // 获取详细信息（用于tooltip）
  const getDetailedInfo = (): string => {
    const absoluteTime = formatDate(date, "yyyy-MM-dd HH:mm:ss", {
      timeZone,
      showTimeZone: true,
    });
    const relativeTime = formatTimeDistance(date, now, { timeZone });

    return `${absoluteTime}\n${relativeTime}`;
  };

  const mainDisplay = getMainDisplay();
  const isoDateTime = new Date(date).toISOString();

  if (!showTooltip) {
    return (
      <time dateTime={isoDateTime} className={className}>
        {mainDisplay}
      </time>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={isoDateTime} className={`cursor-help ${className}`}>
            {mainDisplay}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line text-sm">{getDetailedInfo()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 紧凑型日期显示组件
 * 显示相对时间，悬停显示绝对时间
 */
export function CompactDateDisplay({
  date,
  className = "",
}: {
  date: string | Date | number;
  className?: string;
}) {
  return (
    <SmartDateDisplay
      date={date}
      format="distance"
      className={`text-xs text-muted-foreground ${className}`}
      showTooltip={true}
    />
  );
}

/**
 * 详细日期显示组件
 * 显示绝对时间，悬停显示相对时间
 */
export function DetailedDateDisplay({
  date,
  className = "",
  showTimeZone = false,
}: {
  date: string | Date | number;
  className?: string;
  showTimeZone?: boolean;
}) {
  return (
    <SmartDateDisplay
      date={date}
      format="absolute"
      showTimeZone={showTimeZone}
      className={className}
      showTooltip={true}
    />
  );
}

/**
 * 实时日期显示组件
 * 根据时间远近智能切换显示格式
 */
export function LiveDateDisplay({
  date,
  className = "",
}: {
  date: string | Date | number;
  className?: string;
}) {
  return (
    <SmartDateDisplay
      date={date}
      format="smart"
      className={className}
      showTooltip={true}
      updateInterval={10000} // 10秒更新一次，更实时
    />
  );
}
