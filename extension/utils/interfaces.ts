import type { Document } from "langchain/document"

export interface WebHistoryState {
  url: string
  title: string
  content: string
  timestamp: number
}

export interface WebHistory {
  tabsessionId: number
  history: WebHistoryState[]
}

export interface ClippedItem {
  id: string
  title: string
  url: string
  content: string
  sourceType: string
  createdAt: string
  userId?: string
  tags?: string[]
  isFavorite?: boolean
  offline?: boolean
}

export interface UserSettings {
  theme: string
  defaultClipAction: string
  openSidebarOnClip: boolean
  autoSummarize: boolean
  defaultLanguage: string
  showBadgeCounter: boolean
  useBrowserLanguage: boolean
  keepSidePanelOpen: boolean
  promptShortcuts: Array<{id: string, label: string, prompt: string}>
}

export interface UserProfile {
  token: string;
  user_id?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  refresh_token?: string;
  syncedFromWeb?: boolean;
  syncedAt?: string;
  loginMethod?: "email" | "google" | "github";
  loginTime?: string;
  isAuthenticated?: boolean;
}

export interface AIResponse {
  type: "summary" | "explanation" | "translation" | "highlights";
  content: string;
  sourceText: string;
  timestamp: number;
}

export interface Message {
  id?: string
  content: string
  role: "user" | "assistant" | "system"
  createdAt?: number
}

export interface Conversation {
  messages: Message[]
  title?: string
  id: string
  createdAt: number
  history?: Document[]
} 