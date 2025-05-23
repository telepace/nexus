import type { I18nLangKeys } from '@/i18n'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getDictionary, getDirection } from '../_dictionaries/get-dictionary'
import { ThemeProvider } from './_components/ThemeProvider'
import './styles/index.css'

export const metadata = {
  metadataBase: new URL('https://nextjs-nextra-starter-green.vercel.app'),
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', url: '/img/favicon.svg', type: 'image/svg+xml' }
  ],
} satisfies Metadata

interface Props {
  children: ReactNode
  params: Promise<{ lang: I18nLangKeys }>
}

/**
 * Renders the root HTML layout for the application with localization and theming support.
 *
 * Wraps the application content in a localized `<html>` structure, setting language and direction attributes, and provides theming context at the root level.
 *
 * @param children - The React nodes to display within the layout.
 * @param params - A promise resolving to an object containing the current language key.
 * @returns The root JSX layout element with localization and theming applied.
 */
export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params
  await getDictionary(lang)

  return (
    // The className for font handling is now managed by the root layout: website/src/app/layout.tsx
    <html
      lang={lang}
      dir={getDirection(lang)}
      suppressHydrationWarning
    >
      <head />
      <body suppressHydrationWarning>
        <ThemeProvider>
          <div className="nextra-container main">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
