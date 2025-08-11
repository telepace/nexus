"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Locale,
  defaultLocale,
  loadTranslations,
  getLocaleFromPath,
  getPathnameWithLocale,
  detectLocale,
  I18nContextType,
  Translations,
  I18nContext,
} from "@/lib/i18n";

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window !== "undefined") {
      const pathLocale = getLocaleFromPath(pathname);
      return pathLocale !== defaultLocale ? pathLocale : detectLocale();
    }
    return defaultLocale;
  });

  const [translations, setTranslations] = useState<
    Record<string, Translations>
  >({});
  const [loadingNamespaces, setLoadingNamespaces] = useState<Set<string>>(
    new Set(),
  );

  // Load default namespaces
  useEffect(() => {
    const loadDefaultNamespaces = async () => {
      const namespaces = ["common", "ai", "content"];
      const newTranslations: Record<string, Translations> = {};

      await Promise.all(
        namespaces.map(async (namespace) => {
          try {
            const translation = await loadTranslations(locale, namespace);
            newTranslations[namespace] = translation;
          } catch (error) {
            console.warn(`Failed to load ${namespace} translations:`, error);
            newTranslations[namespace] = {};
          }
        }),
      );

      setTranslations(newTranslations);
    };

    loadDefaultNamespaces();
  }, [locale]);

  // Load additional namespace on demand
  const loadNamespace = async (namespace: string) => {
    if (translations[namespace] || loadingNamespaces.has(namespace)) {
      return;
    }

    setLoadingNamespaces((prev) => new Set(prev).add(namespace));

    try {
      const translation = await loadTranslations(locale, namespace);
      setTranslations((prev) => ({
        ...prev,
        [namespace]: translation,
      }));
    } catch (error) {
      console.warn(`Failed to load ${namespace} translations:`, error);
      setTranslations((prev) => ({
        ...prev,
        [namespace]: {},
      }));
    } finally {
      setLoadingNamespaces((prev) => {
        const newSet = new Set(prev);
        newSet.delete(namespace);
        return newSet;
      });
    }
  };

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Store preference
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred-language", newLocale);
    }

    setLocaleState(newLocale);

    // Navigate to new locale
    const newPath = getPathnameWithLocale(pathname, newLocale);
    router.push(newPath);
  };

  const t = (
    key: string,
    defaultValue?: string,
    namespace: string = "common",
  ) => {
    // Load namespace if not loaded
    if (!translations[namespace] && !loadingNamespaces.has(namespace)) {
      loadNamespace(namespace);
    }

    const namespaceTranslations = translations[namespace] || {};
    const keys = key.split(".");
    let current: any = namespaceTranslations;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return defaultValue || key;
      }
    }

    return typeof current === "string" ? current : defaultValue || key;
  };

  const contextValue: I18nContextType = {
    locale,
    translations,
    setLocale,
    t,
  };

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
