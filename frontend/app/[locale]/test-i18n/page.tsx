"use client";

import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function TestI18nPage() {
  const { t, locale } = useTranslation("common");
  const { t: tAI } = useTranslation("ai");
  const { t: tContent } = useTranslation("content");

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">i18n Implementation Test</h1>
          <p className="text-lg text-gray-600 mb-4">
            Current locale:{" "}
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {locale}
            </span>
          </p>
          <LanguageSwitcher />
        </div>

        <div className="space-y-8">
          {/* Navigation Tests */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Navigation Translations
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Home:</span>{" "}
                {t("navigation.home")}
              </div>
              <div>
                <span className="font-medium">Library:</span>{" "}
                {t("navigation.library")}
              </div>
              <div>
                <span className="font-medium">Favorites:</span>{" "}
                {t("navigation.favorites")}
              </div>
              <div>
                <span className="font-medium">Prompts:</span>{" "}
                {t("navigation.prompts")}
              </div>
              <div>
                <span className="font-medium">Settings:</span>{" "}
                {t("navigation.settings")}
              </div>
            </div>
          </div>

          {/* Action Tests */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Action Translations</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Save:</span> {t("actions.save")}
              </div>
              <div>
                <span className="font-medium">Cancel:</span>{" "}
                {t("actions.cancel")}
              </div>
              <div>
                <span className="font-medium">Delete:</span>{" "}
                {t("actions.delete")}
              </div>
              <div>
                <span className="font-medium">Search:</span>{" "}
                {t("actions.search")}
              </div>
              <div>
                <span className="font-medium">Sync:</span> {t("actions.sync")}
              </div>
              <div>
                <span className="font-medium">Logout:</span> {t("auth.logout")}
              </div>
            </div>
          </div>

          {/* Status Tests */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Status Translations</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Loading:</span>{" "}
                {t("status.loading")}
              </div>
              <div>
                <span className="font-medium">Saving:</span>{" "}
                {t("status.saving")}
              </div>
              <div>
                <span className="font-medium">Error:</span> {t("status.error")}
              </div>
              <div>
                <span className="font-medium">Success:</span>{" "}
                {t("status.success")}
              </div>
              <div>
                <span className="font-medium">Syncing:</span>{" "}
                {t("status.syncing")}
              </div>
            </div>
          </div>

          {/* AI Translations */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">AI Translations</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Analysis:</span>{" "}
                {tAI("analysis.title")}
              </div>
              <div>
                <span className="font-medium">Summary:</span>{" "}
                {tAI("analysis.summary")}
              </div>
              <div>
                <span className="font-medium">Key Points:</span>{" "}
                {tAI("analysis.keyPoints")}
              </div>
              <div>
                <span className="font-medium">Chat Placeholder:</span>{" "}
                {tAI("chat.placeholder")}
              </div>
            </div>
          </div>

          {/* Content Translations */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Content Translations</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Add Content:</span>{" "}
                {tContent("library.addContent")}
              </div>
              <div>
                <span className="font-medium">Search Placeholder:</span>{" "}
                {tContent("library.searchPlaceholder")}
              </div>
              <div>
                <span className="font-medium">View Content:</span>{" "}
                {tContent("actions.viewContent")}
              </div>
              <div>
                <span className="font-medium">Share Content:</span>{" "}
                {tContent("actions.shareContent")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
