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
