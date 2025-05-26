import createWithNextra from 'nextra'
// path import removed

const withNextra = createWithNextra({
  // theme and themeConfig removed to match subtask example
  defaultShowCopyCode: true,
  staticImage: true,
  unstable_shouldAddLocaleToLinks: false,
  contentDirBasePath: '/content',
})

/**
 * @type {import("next").NextConfig}
 */
export default withNextra({
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  cleanDistDir: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  i18n: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
  },
  // sassOptions removed
  // webpack function removed
  experimental: {
    // serverActions removed
    scrollRestoration: true,
    esmExternals: true,
  },
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.tsx'
    }
  },
})
