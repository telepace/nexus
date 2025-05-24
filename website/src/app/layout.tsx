import type { ReactNode } from 'react'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // The lang and dir attributes will be handled by the nested [lang]/layout.tsx
    // This root layout is primarily to satisfy Next.js's requirement.
    // It should not include <html> or <body> if those are in [lang]/layout.tsx.
    // However, to be safe and ensure not-found.tsx can use it if needed at the root level,
    // let's make it a complete document for now, and it can be refined if it conflicts
    // with [lang]/layout.tsx. A simpler version might just be <>{children}</>.
    // For now, let's assume [lang]/layout.tsx are true root layouts for their paths.
    // So, this root layout should be extremely simple.
    <html suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
