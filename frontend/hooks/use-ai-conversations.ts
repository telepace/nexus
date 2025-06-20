import { useState, useEffect, useCallback } from "react";
import AIConversationsAPI, {
  ConversationPublic,
  ConversationDetail,
  CreateConversationRequest,
  ConversationListParams,
} from "@/lib/api/ai-conversations";
import { useToast } from "@/hooks/use-toast";

interface UseAIConversationsOptions {
  contentItemId?: string;
  autoLoad?: boolean;
}

interface UseAIConversationsReturn {
  conversations: ConversationPublic[];
  conversationDetails: Map<string, ConversationDetail>;
  loading: boolean;
  error: string | null;
  refreshing: boolean;

  // Actions
  loadConversations: (showRefreshIndicator?: boolean) => Promise<void>;
  createConversation: (
    data: CreateConversationRequest,
  ) => Promise<ConversationDetail | null>;
  getConversationDetail: (
    conversationId: string,
  ) => Promise<ConversationDetail | null>;
  refreshConversations: () => Promise<void>;
  clearError: () => void;
}

export const useAIConversations = (
  options: UseAIConversationsOptions = {},
): UseAIConversationsReturn => {
  const { contentItemId, autoLoad = true } = options;
  const { toast } = useToast();

  // State
  const [conversations, setConversations] = useState<ConversationPublic[]>([]);
  const [conversationDetails, setConversationDetails] = useState<
    Map<string, ConversationDetail>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load conversations
  const loadConversations = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        if (showRefreshIndicator) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params: ConversationListParams = {};
        if (contentItemId) {
          params.content_item_id = contentItemId;
        }

        const data = await AIConversationsAPI.list(params);
        setConversations(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "加载对话失败";
        setError(errorMessage);

        if (showRefreshIndicator) {
          toast({
            title: "刷新失败",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contentItemId, toast],
  );

  // Create conversation
  const createConversation = useCallback(
    async (
      data: CreateConversationRequest,
    ): Promise<ConversationDetail | null> => {
      try {
        const newConversation = await AIConversationsAPI.create(data);

        // Add to conversations list
        setConversations((prev) => [newConversation, ...prev]);

        // Add to details cache
        setConversationDetails((prev) =>
          new Map(prev).set(newConversation.id, newConversation),
        );

        toast({
          title: "创建成功",
          description: "AI 对话已创建",
        });

        return newConversation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "创建对话失败";
        setError(errorMessage);
        toast({
          title: "创建失败",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  // Get conversation detail
  const getConversationDetail = useCallback(
    async (conversationId: string): Promise<ConversationDetail | null> => {
      // Check cache first
      const cached = conversationDetails.get(conversationId);
      if (cached) {
        return cached;
      }

      try {
        const detail = await AIConversationsAPI.getDetail(conversationId);

        // Update cache
        setConversationDetails((prev) =>
          new Map(prev).set(conversationId, detail),
        );

        return detail;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "加载对话详情失败";
        setError(errorMessage);
        toast({
          title: "加载失败",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    [conversationDetails, toast],
  );

  // Refresh conversations
  const refreshConversations = useCallback(async () => {
    await loadConversations(true);
  }, [loadConversations]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto load on mount
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  return {
    conversations,
    conversationDetails,
    loading,
    error,
    refreshing,
    loadConversations,
    createConversation,
    getConversationDetail,
    refreshConversations,
    clearError,
  };
};

export default useAIConversations;
