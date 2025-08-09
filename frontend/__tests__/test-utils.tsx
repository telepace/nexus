import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock auth hook
jest.mock('@/lib/client-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
    },
  }),
  getCookie: jest.fn().mockReturnValue('mock-token'),
}));

// Mock the I18n context with simple translations
jest.mock('@/components/providers/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
  useI18n: () => ({
    locale: 'en',
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'favorites.addToFavorites': '添加收藏',
        'favorites.removeFromFavorites': '取消收藏',
        'favorites.favoriteBlock': '收藏块',
        'favorites.unfavoriteBlock': '取消收藏块',
        'auth.loginRequired': '请先登录',
        'auth.sessionExpired': '登录已过期',
        'favorites.blockNotFound': '该块不存在',
        'favorites.contentNotFound': '内容不存在',
        'favorites.blockAlreadyFavorited': '该块已收藏',
        'favorites.alreadyFavorited': '已收藏',
        'messages.serverError': '服务器错误',
        'messages.operationFailed': '操作失败',
        'messages.networkError': '网络错误',
        'content.deepDig': '深入挖掘',
        'content.addContent': 'Add Content',
      };
      return translations[key] || defaultValue || key;
    },
    setLocale: jest.fn(),
    translations: {},
  }),
}));

// Mock the lib/i18n.ts system  
jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'sidebar.home': 'Home',
        'sidebar.contentLibrary': 'Content Library', 
        'sidebar.search': 'Search',
        'sidebar.favorites': 'Favorites',
        'sidebar.settings': 'Settings',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'content.addContent': 'Add Content',
        'navigation.library': 'Library',
        'navigation.home': 'Home',
        'navigation.favorites': 'Favorites',
        'navigation.prompts': 'Prompts',
        'navigation.settings': 'Settings',
      };
      return translations[key] || defaultValue || key;
    },
    locale: 'en',
    setLocale: jest.fn(),
  }),
}));

// Mock prompts API
jest.mock('@/lib/api/services/prompts', () => ({
  getEnabledPrompts: jest.fn().mockResolvedValue([]),
  getDisabledPrompts: jest.fn().mockResolvedValue([]),
}));

// Mock content API
jest.mock('@/lib/api/content', () => ({
  getContentConversations: jest.fn().mockResolvedValue({ conversations: [] }),
}));

// Mock LLM Analysis Store
jest.mock('@/lib/stores/llm-analysis-store', () => ({
  useLLMAnalysisStore: () => ({
    enabledPrompts: [],
    isLoadingPrompts: false,
    loadPrompts: jest.fn(),
  }),
}));

// Mock useTranslationUtils
jest.mock('@/lib/i18n-utils', () => ({
  useTranslationUtils: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'favorites.addToFavorites': '添加收藏',
        'favorites.removeFromFavorites': '取消收藏',
        'favorites.favoriteBlock': '收藏块',
        'favorites.unfavoriteBlock': '取消收藏块',
        'auth.loginRequired': '请先登录',
        'auth.sessionExpired': '登录已过期',
        'favorites.blockNotFound': '该块不存在',
        'favorites.contentNotFound': '内容不存在',
        'favorites.blockAlreadyFavorited': '该块已收藏',
        'favorites.alreadyFavorited': '已收藏',
        'messages.serverError': '服务器错误',
        'messages.operationFailed': '操作失败',
        'messages.networkError': '网络错误',
        'content.deepDig': '深入挖掘',
        'content.addContent': 'Add Content',
      };
      return translations[key] || defaultValue || key;
    },
    tPlural: (key: string, count: number) => `${key} (${count})`,
    tVar: (key: string, variables: Record<string, any>) => key,
  }),
}));

// Create a simple test wrapper with I18n context
interface TestProviderWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

function TestProviderWrapper({ children, queryClient: providedQueryClient }: TestProviderWrapperProps) {
  const queryClient = providedQueryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: (props) => <TestProviderWrapper {...props} queryClient={queryClient} />,
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };