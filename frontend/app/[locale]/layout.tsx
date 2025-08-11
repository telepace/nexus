import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { locales, type Locale } from "@/lib/i18n-config";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <I18nProvider initialLocale={locale as Locale}>{children}</I18nProvider>
  );
}
