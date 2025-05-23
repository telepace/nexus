"use client";

import React from "react";
import { formatDate, formatRelativeTime, formatTimeDistance } from "@/lib/date";
import { useTimeZone } from "@/lib/time-zone-context";

export type DateFormat = "absolute" | "relative" | "distance";

interface DateDisplayProps {
  date: string | Date | number;
  format?: DateFormat;
  showTimeZone?: boolean;
  customFormat?: string;
  className?: string;
}

/**
 * 通用日期展示组件
 * 根据设置的时区和格式统一展示日期时间
 */
export function DateDisplay({
  date,
  format = "absolute",
  showTimeZone = false,
  customFormat,
  className = "",
}: DateDisplayProps) {
  const { timeZone } = useTimeZone();

  if (!date) {
    return null;
  }

  let formattedDate: string;

  switch (format) {
    case "relative":
      formattedDate = formatRelativeTime(date, undefined, { timeZone });
      break;
    case "distance":
      formattedDate = formatTimeDistance(date, undefined, { timeZone });
      break;
    case "absolute":
    default:
      formattedDate = formatDate(date, customFormat || "yyyy-MM-dd HH:mm:ss", {
        timeZone,
        showTimeZone,
      });
      break;
  }

  return (
    <time dateTime={new Date(date).toISOString()} className={className}>
      {formattedDate}
    </time>
  );
}
