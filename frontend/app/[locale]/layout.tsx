import { notFound } from 'next/navigation';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { locales, type Locale } from '@/lib/i18n-config';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params: { locale }
}: LocaleLayoutProps) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <I18nProvider initialLocale={locale as Locale}>
      {children}
    </I18nProvider>
  );
}