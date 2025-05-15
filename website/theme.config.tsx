'use client'

import type { PageTheme } from 'nextra'
import { useRouter } from 'next/navigation'
import { useConfig } from 'nextra-theme-docs'

const logo = (
  <span className="font-bold">
    nexus 文档
  </span>
)

const config = {
  project: {
    link: 'https://github.com/telepace/nexus',
  },
  docsRepositoryBase: 'https://github.com/telepace/nexus',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – nexus'
    }
  },
  logo,
  head: function useHead() {
    const config = useConfig()
    const { asPath } = useRouter()
    const { frontMatter } = config
    const title = frontMatter?.title || 'nexus'
    
    const socialCard = asPath === '/' || !title
      ? 'https://nextra.site/og.jpeg'
      : `https://nextra.site/api/og?title=${title}`

    return (
      <>
        <meta name="msapplication-TileColor" content="#fff" />
        <meta name="theme-color" content="#fff" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="description" content="nexus documentation" />
        <meta name="og:description" content="nexus documentation" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={socialCard} />
        <meta name="twitter:site:domain" content="quickforgeai.com" />
        <meta name="twitter:url" content="https://quickforgeai.com" />
        <meta name="og:title" content={title ? title + ' – nexus' : 'nexus'} />
        <meta name="og:image" content={socialCard} />
        <meta name="apple-mobile-web-app-title" content="nexus" />
        <link rel="icon" href="/favicon.ico" type="image/svg+xml" />
      </>
    )
  },
  editLink: {
    text: '编辑此页面 →'
  },
  feedback: {
    content: '问题反馈'
  },
  footer: {
    text: (
      <div className="flex w-full flex-col items-center sm:items-start">
        <p className="mt-6 text-xs">
          © {new Date().getFullYear()} nexus. All rights reserved.
        </p>
      </div>
    )
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'zh', text: '简体中文' },
  ],
  sidebar: {
    titleComponent({ title, type }: { title: string, type?: string }) {
      if (type === 'separator') {
        return <span className="cursor-default">{title}</span>
      }
      return <>{title}</>
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    title: '页面目录',
    backToTop: true,
  },
  primaryHue: 212,
  primarySaturation: 100,
  banner: {
    dismissible: true,
    key: 'quick-forge-banner',
    text: (
      <p>
        使用最新 Nextra + Next.js 15 构建 🎉
      </p>
    )
  }
} satisfies PageTheme

export default config 