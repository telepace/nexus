import type { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span>Nexus</span>, // Project name
  project: {
    link: 'https://github.com/telepace/nexus', // Project's GitHub
  },
  docsRepositoryBase: 'https://github.com/telepace/nexus/tree/main/website', // Link to docs source
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Nexus'
    }
  },
  i18n: [
    { locale: 'en', text: 'English' },
    { locale: 'zh', text: '中文' },
  ],
  // Basic footer, can be customized further
  footer: {
    text: `MIT ${new Date().getFullYear()} © Nexus.`,
  },
  // Enable features like edit this page link, table of contents, etc.
  editLink: {
    text: 'Edit this page on GitHub →'
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback'
  },
  // ... add other configurations from nextra-theme-docs if needed
};

export default config;
