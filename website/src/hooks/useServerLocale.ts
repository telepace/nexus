/* eslint-disable react-hooks-extra/no-unnecessary-use-prefix */
import type { AllLocales, I18nLangKeys, LocaleKeys, PathValue } from '@/i18n'
import { getNestedValue, i18nConfig, interpolateString } from '@/i18n'

// 类型获取给定键的本地化值的类型
type LocalizedValue<T, K extends LocaleKeys> = PathValue<T, K> extends string
  ? string
  : PathValue<T, K>

/**
 * Initializes localization for the server using the specified language key.
 *
 * This function sets up a localization context by defining a translation function `t`.
 * It retrieves localized values based on the provided language key and optional data.
 *
 * @param lang - The language key to initialize the locale with.
 */
export async function useServerLocale(lang: I18nLangKeys) {
  // 从参数中获取当前语言
  const currentLocale = lang

  function t<K extends LocaleKeys>(
    key: K,
    withData: Record<string, any> = {},
  ): LocalizedValue<AllLocales, K> {
    const template = getNestedValue(i18nConfig[currentLocale], key)

    if (typeof template === 'string') {
      return interpolateString(template, withData) as LocalizedValue<AllLocales, K>
    }

    return template as LocalizedValue<AllLocales, K>
  }

  return {
    currentLocale,
    t,
  }
}
