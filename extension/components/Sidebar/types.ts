export type MessageType = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp?: Date;
  contextSource?: string;
  isLoading?: boolean;
}

export interface SuggestionChip {
  id: string;
  text: string;
  action: () => void;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  description?: string;
}

export interface CustomPrompt {
  id: string;
  name: string;
  prompt: string;
  category: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  errorMessage?: string;
}

export interface SidebarContext {
  messages: Message[];
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  isTyping: boolean;
  connectionStatus: ConnectionStatus;
  quickActions: QuickAction[];
  executeQuickAction: (actionId: string) => void;
  customPrompts: CustomPrompt[];
  suggestions: SuggestionChip[];
}

export interface SidebarRootProps {
  initialOpen?: boolean;
  isNativeSidePanel?: boolean;
}

export interface SidebarHeaderProps {
  onMinimize?: () => void;
  connectionStatus?: ConnectionStatus;
  isNativeSidePanel?: boolean;
}

export interface QuickActionPanelProps {
  actions?: QuickAction[];
  onAction?: (actionId: string) => void;
}

export interface ChatContainerProps {
  messages: Message[];
  suggestions?: SuggestionChip[];
}

export interface MessageListProps {
  messages: Message[];
}

export interface MessageProps {
  message: Message;
}

export interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
}

export interface InputAreaProps {
  onSend?: (message: string) => void;
  isTyping?: boolean;
  disabled?: boolean;
}

export interface FooterAreaProps {
  onSettings?: () => void;
  onHelp?: () => void;
  isLoggedIn?: boolean;
} 