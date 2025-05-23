import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './[lang]/styles/index.css' // Assuming this path is valid for global styles from a root layout

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

interface Props {
  children: ReactNode
}

/**
 * Root layout component that applies global styles, font settings, and structure for the application.
 *
 * Wraps all pages with the Inter font, English language, left-to-right direction, and a minimal HTML scaffold.
 *
 * @param children - The content to render within the layout.
 *
 * @remark If themed components are used on the not-found page, a ThemeProvider may be required.
 */
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} font-sans`} suppressHydrationWarning>
      <head />
      <body>
        {/* Minimal wrapper, ThemeProvider might be needed if not-found page uses themed components */}
        {children}
      </body>
    </html>
  )
}
