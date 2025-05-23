'use client'

import { Layout as DocsLayoutComponent, useConfig } from 'nextra-theme-docs' // Changed NextraDocsTheme to Layout as DocsLayoutComponent
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation' // For dynamic head elements
import Head from 'next/head' // For adding dynamic head elements

// Migrated configurations from theme.config.tsx

const logo = (
  <span className="font-bold">
    nexus 文档
  </span>
)

interface DocsLayoutProps {
  children: ReactNode
  params: {
    lang: string
  }
}

// Component for dynamic head elements, using useConfig and usePathname
const DynamicAppHead = () => {
  const config = useConfig()
  const pathname = usePathname()

  // Retrieve frontMatter and title from useConfig according to Nextra 4 docs
  const frontMatter = config.normalizePagesResult?.activeMetadata || {}
  const pageTitleFromConfig = frontMatter?.title // Title should come from frontMatter

  // Default title if not otherwise set by a page
  const title = pageTitleFromConfig || 'nexus' // Fallback to site name
  
  // Construct social card URL, similar to original logic
  // Note: In App Router, asPath is not directly available. pathname can be used.
  // The base URL for social card generation might need to be absolute.
  const socialCardUrl = `https://nextra.site/api/og?title=${encodeURIComponent(title)}`
  // Fallback for root or untitled pages
  const defaultSocialCard = 'https://nextra.site/og.jpeg'
  const image = pathname === '/' || !title ? defaultSocialCard : socialCardUrl

  // Default description
  const description = frontMatter?.description || 'nexus documentation'

  return (
    <Head>
      <meta name="msapplication-TileColor" content="#fff" />
      <meta name="theme-color" content="#fff" />
      {/* viewport and Content-Language are often in root layout or handled by Next.js */}
      <meta name="description" content={description} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site:domain" content="quickforgeai.com" /> {/* Consider making this configurable if needed */}
      <meta name="twitter:url" content="https://quickforgeai.com" /> {/* Consider making this configurable */}
      <meta property="og:title" content={title ? `${title} – nexus` : 'nexus'} />
      <meta property="og:image" content={image} />
      <meta name="apple-mobile-web-app-title" content="nexus" />
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      {/* Any other dynamic tags from original head function */}
    </Head>
  )
}


export default function DocsLayout({ children, params }: DocsLayoutProps) {
  const themeOptions = {
    logo,
    project: {
      link: 'https://github.com/telepace/nexus',
    },
    docsRepositoryBase: 'https://github.com/telepace/nexus',
    editLink: '编辑此页面 →', // From theme.config.tsx - Changed to be direct ReactNode (string)
    feedback: {
      content: '问题反馈' // From theme.config.tsx
    },
    footer: ( // From theme.config.tsx - Changed to be direct ReactNode
      <div className="flex w-full flex-col items-center sm:items-start">
        <p className="mt-6 text-xs">
          © {new Date().getFullYear()} nexus. All rights reserved.
        </p>
      </div>
    ),
    i18n: [ // From theme.config.tsx - Changed 'text' to 'name'
      { locale: 'en', name: 'English' },
      { locale: 'zh', name: '简体中文' },
    ],
    sidebar: { // From theme.config.tsx
      titleComponent({ title, type }: { title: string, type?: string }) {
        if (type === 'separator') {
          return <span className="cursor-default">{title}</span>
        }
        return <>{title}</>
      },
      defaultMenuCollapseLevel: 1,
      toggleButton: true,
    },
    toc: { // From theme.config.tsx
      title: '页面目录',
      backToTop: true,
    },
    primaryHue: 212, // From theme.config.tsx
    primarySaturation: 100, // From theme.config.tsx
    banner: ( // From theme.config.tsx - Changed to be direct ReactNode (text part)
      // The dismissible and key props might need to be handled by a custom banner component
      // if Nextra's Layout doesn't support them directly on the banner ReactNode.
      <p>
        使用最新 Nextra + Next.js 15 构建 🎉
      </p>
    ),
    // head is not a direct option in Nextra 4 themeConfig in the same way.
    // It's handled by Next.js metadata API and specific components like DynamicAppHead.
    // useNextSeoProps is also handled by metadata API.
  // The Layout component from nextra-theme-docs takes these options directly as props.
  }
  const config = useConfig() // Already present for DynamicAppHead, reuse for pageMap

  return (
    <DocsLayoutComponent
      {...themeOptions} // Spread the themeOptions as props
      // locale={params.lang} // Locale might be handled by Nextra's context or main config
      pageMap={config.normalizePagesResult?.docsDirectories || []} // Pass pageMap
    >
      <DynamicAppHead /> {/* Component to inject dynamic head tags */}
      {children}
    </DocsLayoutComponent>
  )
}

// Static metadata for the docs layout
// This replicates parts of the original head and useNextSeoProps
export const metadata = {
  title: {
    default: 'nexus',
    template: '%s – nexus', // From original useNextSeoProps
  },
  // description: 'nexus documentation', // Default description, can be overridden by pages or DynamicAppHead
  // Other static meta tags from the original head that don't depend on page content
  // For example, if twitter:site or other properties were static:
  // twitter: {
  //   site: '@Nextra', // Example, if it was static
  // },
  // openGraph: {
  //   images: ['https://nextra.site/og.jpeg'], // Default OG image
  // },
}
