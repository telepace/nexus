export interface WebHistory {
  tabsessionId: number;
  urlQueue: string[];
  timeQueue?: number[];
}

export interface ClippedItem {
  id: string;
  title: string;
  content: string;
  url: string;
  timestamp: number;
  tags?: string[];
  thumbnailUrl?: string;
  status: 'unread' | 'reading' | 'completed';
  aiProcessed?: boolean;
  aiSummary?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultClipAction: 'save' | 'save-and-summarize' | 'save-and-highlight';
  openSidebarOnClip: boolean;
  autoSummarize: boolean;
  defaultLanguage: string;
  showBadgeCounter: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAuthenticated: boolean;
  token?: string;
  tokenExpiry?: number;
}

export interface AIResponse {
  type: 'summary' | 'explanation' | 'translation' | 'highlights';
  content: string;
  sourceText?: string;
  timestamp: number;
  metadata?: Record<string, any>;
} 