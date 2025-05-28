interface BlogMeta {
  title: string;
  type: string;
}

interface BlogMetaConfig {
  [key: string]: BlogMeta;
}

const blogMeta: BlogMetaConfig = {
  'getting-started-with-quick-forge-ai': {
    title: 'Quick Forge AI 入门指南',
    type: 'page',
  },
};

export default blogMeta; 