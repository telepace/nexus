"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 返回相对时间字符串以及下一次应当刷新的毫秒数。
 * 规则：
 * - < 1h   ->  显示秒 (xs)，每秒刷新
 * - < 24h  ->  显示小时 (xh)，到下一个整小时刷新
 * - >=24h  ->  显示天 (xd)，到下一个整天刷新
 */
function calcRelativeLabelAndNext(createdAt: number, now: number) {
  const diffSec = Math.max(1, Math.floor((now - createdAt) / 1000));

  // < 1 小时：显示秒
  if (diffSec < 3600) {
    const nextInMs = 1000 - ((now - createdAt) % 1000);
    return { label: `${diffSec}s`, nextMs: nextInMs };
  }

  // < 24 小时：显示小时
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    const secondsToNextHour = 3600 - (diffSec % 3600);
    return { label: `${hours}h`, nextMs: secondsToNextHour * 1000 };
  }

  // >= 1 天：显示天
  const days = Math.floor(diffSec / 86400);
  const secondsToNextDay = 86400 - (diffSec % 86400);
  return { label: `${days}d`, nextMs: secondsToNextDay * 1000 };
}

/**
 * React hook：根据创建时间返回相对时间标签，自动在正确的间隔刷新。
 * @param createdAt ISO 字符串或 Date
 */
export function useRelativeTime(createdAt: string | Date): string {
  const createdMs =
    typeof createdAt === "string"
      ? new Date(createdAt).getTime()
      : createdAt.getTime();
  const [label, setLabel] = useState(() => {
    return calcRelativeLabelAndNext(createdMs, Date.now()).label;
  });

  // 保存最新的 timerId，组件卸载时需要清除
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      const { label: newLabel, nextMs } = calcRelativeLabelAndNext(
        createdMs,
        Date.now(),
      );
      setLabel(newLabel);
      timerRef.current = setTimeout(update, nextMs);
    };

    const { nextMs } = calcRelativeLabelAndNext(createdMs, Date.now());
    timerRef.current = setTimeout(update, nextMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [createdMs]);

  return label;
}

// 为单元测试暴露内部计算函数
export const _internalCalcRelative = calcRelativeLabelAndNext;
