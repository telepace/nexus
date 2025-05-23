import { format, formatDistance, formatRelative, parseISO } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

// 支持的时区映射
export const TIME_ZONES = {
  UTC: "UTC",
  "Asia/Shanghai": "Asia/Shanghai", // UTC+8
  "America/New_York": "America/New_York",
  "Europe/London": "Europe/London",
  "Australia/Sydney": "Australia/Sydney",
} as const;

export type TimeZone = keyof typeof TIME_ZONES;

// 支持的语言
const LOCALES = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;

export type Locale = keyof typeof LOCALES;

// 获取浏览器默认时区
export const getBrowserTimeZone = (): TimeZone => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions()
      .timeZone as TimeZone;
    return TIME_ZONES[timezone] ? timezone : "UTC";
  } catch (error) {
    return "UTC"; // 默认使用UTC
  }
};

// 获取浏览器默认语言
export const getBrowserLocale = (): Locale => {
  const browserLocale = navigator.language;
  return browserLocale.startsWith("zh") ? "zh-CN" : "en-US";
};

/**
 * 格式化日期时间
 * @param date ISO日期字符串或Date对象
 * @param formatStr 格式化字符串，默认为'yyyy-MM-dd HH:mm:ss'
 * @param options 可选配置
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | number,
  formatStr = "yyyy-MM-dd HH:mm:ss",
  options?: {
    timeZone?: TimeZone;
    locale?: Locale;
    showTimeZone?: boolean;
  },
) {
  if (!date) return "";

  const {
    timeZone = getBrowserTimeZone(),
    locale = getBrowserLocale(),
    showTimeZone = false,
  } = options || {};

  try {
    // 解析日期
    const parsedDate =
      typeof date === "string" ? parseISO(date) : new Date(date);

    // 转换到目标时区
    const zonedDate = toZonedTime(parsedDate, timeZone);

    // 格式化日期
    const formattedDate = format(zonedDate, formatStr, {
      locale: LOCALES[locale],
    });

    // 是否显示时区信息
    if (showTimeZone) {
      const timeZoneOffset = new Date().getTimezoneOffset() / -60;
      const sign = timeZoneOffset >= 0 ? "+" : "-";
      return `${formattedDate} (UTC${sign}${Math.abs(timeZoneOffset)})`;
    }

    return formattedDate;
  } catch (error) {
    console.error("日期格式化错误:", error);
    return String(date);
  }
}

/**
 * 格式化相对时间（如：3小时前）
 * @param date ISO日期字符串或Date对象
 * @param baseDate 基准日期，默认为当前时间
 * @param options 可选配置
 * @returns 相对时间字符串
 */
export function formatRelativeTime(
  date: string | Date | number,
  baseDate?: Date,
  options?: {
    timeZone?: TimeZone;
    locale?: Locale;
  },
) {
  if (!date) return "";

  const { timeZone = getBrowserTimeZone(), locale = getBrowserLocale() } =
    options || {};

  try {
    // 解析日期
    const parsedDate =
      typeof date === "string" ? parseISO(date) : new Date(date);

    // 转换到目标时区
    const zonedDate = toZonedTime(parsedDate, timeZone);
    const zonedBaseDate = baseDate
      ? toZonedTime(baseDate, timeZone)
      : toZonedTime(new Date(), timeZone);

    // 格式化相对时间
    return formatRelative(zonedDate, zonedBaseDate, {
      locale: LOCALES[locale],
    });
  } catch (error) {
    console.error("相对时间格式化错误:", error);
    return String(date);
  }
}

/**
 * 格式化时间距离（如：3 hours ago）
 * @param date ISO日期字符串或Date对象
 * @param baseDate 基准日期，默认为当前时间
 * @param options 可选配置
 * @returns 时间距离字符串
 */
export function formatTimeDistance(
  date: string | Date | number,
  baseDate?: Date,
  options?: {
    timeZone?: TimeZone;
    locale?: Locale;
    addSuffix?: boolean;
  },
) {
  if (!date) return "";

  const {
    timeZone = getBrowserTimeZone(),
    locale = getBrowserLocale(),
    addSuffix = true,
  } = options || {};

  try {
    // 解析日期
    const parsedDate =
      typeof date === "string" ? parseISO(date) : new Date(date);

    // 转换到目标时区
    const zonedDate = toZonedTime(parsedDate, timeZone);
    const zonedBaseDate = baseDate
      ? toZonedTime(baseDate, timeZone)
      : toZonedTime(new Date(), timeZone);

    // 格式化时间距离
    return formatDistance(zonedDate, zonedBaseDate, {
      locale: LOCALES[locale],
      addSuffix,
    });
  } catch (error) {
    console.error("时间距离格式化错误:", error);
    return String(date);
  }
}

/**
 * 将时区时间转换为UTC时间
 * @param date 时区时间
 * @param timeZone 时区
 * @returns UTC时间
 */
export function toUTC(
  date: Date,
  timeZone: TimeZone = getBrowserTimeZone(),
): Date {
  // date-fns-tz 不直接提供 zonedTimeToUtc，我们需要手动实现
  const zonedDate = toZonedTime(date, timeZone);
  const offset = new Date(zonedDate).getTimezoneOffset() * 60000;
  return new Date(zonedDate.getTime() - offset);
}

/**
 * 将UTC时间转换为时区时间
 * @param date UTC时间
 * @param timeZone 时区
 * @returns 时区时间
 */
export function fromUTC(
  date: Date,
  timeZone: TimeZone = getBrowserTimeZone(),
): Date {
  return toZonedTime(date, timeZone);
}
