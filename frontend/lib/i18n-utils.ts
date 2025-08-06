import { useI18n } from "@/components/providers/I18nProvider";

/**
 * 翻译工具函数，支持复数形式和变量插值
 */
export function useTranslationUtils() {
  const { t } = useI18n();

  /**
   * 支持复数形式的翻译函数
   * @param key 翻译键
   * @param count 数量
   * @param variables 变量对象
   * @param namespace 命名空间
   */
  const tPlural = (
    key: string,
    count: number,
    variables?: Record<string, any>,
    namespace?: string,
  ): string => {
    // 根据数量决定使用单数还是复数形式
    const pluralKey = count === 1 ? key : `${key}_plural`;
    let translation = t(pluralKey, undefined, namespace);

    // 如果复数形式不存在，回退到单数形式
    if (translation === pluralKey && pluralKey !== key) {
      translation = t(key, undefined, namespace);
    }

    // 替换变量
    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        translation = translation.replace(`{{${varKey}}}`, String(value));
      });
    }

    // 替换 count 变量
    translation = translation.replace(/\{\{count\}\}/g, String(count));

    return translation;
  };

  /**
   * 支持变量插值的翻译函数
   * @param key 翻译键
   * @param variables 变量对象
   * @param namespace 命名空间
   */
  const tVar = (
    key: string,
    variables: Record<string, any>,
    namespace?: string,
  ): string => {
    let translation = t(key, undefined, namespace);

    // 替换变量
    Object.entries(variables).forEach(([varKey, value]) => {
      translation = translation.replace(`{{${varKey}}}`, String(value));
    });

    return translation;
  };

  return {
    t,
    tPlural,
    tVar,
  };
}

/**
 * 直接使用的翻译工具函数（无需hook）
 */
export class TranslationUtils {
  private t: (key: string, defaultValue?: string, namespace?: string) => string;

  constructor(
    tFunction: (
      key: string,
      defaultValue?: string,
      namespace?: string,
    ) => string,
  ) {
    this.t = tFunction;
  }

  /**
   * 支持复数形式的翻译
   */
  tPlural(
    key: string,
    count: number,
    variables?: Record<string, any>,
    namespace?: string,
  ): string {
    const pluralKey = count === 1 ? key : `${key}_plural`;
    let translation = this.t(pluralKey, undefined, namespace);

    if (translation === pluralKey && pluralKey !== key) {
      translation = this.t(key, undefined, namespace);
    }

    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        translation = translation.replace(`{{${varKey}}}`, String(value));
      });
    }

    translation = translation.replace(/\{\{count\}\}/g, String(count));

    return translation;
  }

  /**
   * 支持变量插值的翻译
   */
  tVar(
    key: string,
    variables: Record<string, any>,
    namespace?: string,
  ): string {
    let translation = this.t(key, undefined, namespace);

    Object.entries(variables).forEach(([varKey, value]) => {
      translation = translation.replace(`{{${varKey}}}`, String(value));
    });

    return translation;
  }
}

/**
 * 路径生成工具函数
 * 根据语言生成正确的路径格式
 */
export function generateLocalePath(locale: string, path: string): string {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (locale === "en") {
    // 英文使用根路径
    return normalizedPath;
  } else {
    // 其他语言添加前缀
    return `/${locale}${normalizedPath}`;
  }
}

/**
 * 从路径中提取语言和无语言路径
 */
export function parseLocalePath(pathname: string): {
  locale: string;
  pathWithoutLocale: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  const supportedLocales = ["en", "zh"];

  if (
    segments.length > 0 &&
    supportedLocales.includes(segments[0]) &&
    segments[0] !== "en"
  ) {
    return {
      locale: segments[0],
      pathWithoutLocale: "/" + segments.slice(1).join("/"),
    };
  }

  return {
    locale: "en",
    pathWithoutLocale: pathname,
  };
}

/**
 * 获取当前语言
 */
export function getCurrentLocale(pathname: string): string {
  const { locale } = parseLocalePath(pathname);
  return locale;
}
