/**
 * Safe I18n hook with fallback for components that might not be wrapped in I18nProvider
 */

// Fallback translations
const fallbackTranslations: Record<string, string> = {
  // Content related
  'content.reprocessRequested': 'Reprocess request submitted',
  'content.reprocessFailed': 'Reprocess failed, please try again later',
  'content.aiAnalysisStarted': 'AI analysis started, please check results later',
  'content.aiAnalysisFailed': 'AI analysis failed, please try again later',
  'content.aiAnalysisRegenerateStarted': 'AI analysis regeneration started, please check results later',
  'content.aiAnalysisRegenerateFailed': 'Failed to regenerate AI analysis, please try again later',
  'content.linkCopied': 'Link copied to clipboard',
  'content.linkCopyFailed': 'Failed to copy link',
  'content.summary': 'Summary',
  'content.content': 'Content',
  'content.source': 'Source',
  'content.contentCopied': 'Content copied to clipboard',
  'content.contentCopyFailed': 'Failed to copy content',
  'content.confirmDelete': 'Confirm Delete',
  'content.cannotUndoAction': 'This action cannot be undone',
  'content.aboutToDelete': 'About to delete:',
  'content.noTitle': 'No Title',
  'content.rememberChoice': 'Remember my choice and delete directly next time',
  'content.deleting': 'Deleting...',
  'content.latest': 'Latest',
  'content.rating': 'Rating',
  'content.title': 'Title',
  'content.popularity': 'Popularity',
  'content.sortBy': 'Sort by',
  'content.filterByTags': 'Filter by tags',
  'content.clearFilter': 'Clear filter',
  'content.searchPlaceholder': 'Search...',
  'content.addContent': 'Add Content',
  'content.aiAnalysis': 'AI Analysis',

  // Analysis related
  'analysis.contentSummary': 'Content Summary',
  'analysis.questionList': 'Question List',
  'analysis.keyPoints': 'Key Points',
  'analysis.contentAnalysis': 'Content Analysis',
  'analysis.readingTime': 'Reading time',
  'analysis.minutes': 'minutes',
  'analysis.difficultyLevel': 'Difficulty level',
  'analysis.beginner': 'Beginner',
  'analysis.intermediate': 'Intermediate',
  'analysis.advanced': 'Advanced',
  'analysis.qualityScore': 'Quality Score',
  'analysis.tags': 'Tags',
  'analysis.noAnalysisResult': 'No AI analysis result available',
  'analysis.analysisResultEmpty': 'AI analysis result is empty',
  'analysis.autoAnalysis': 'Auto Analysis',
  'analysis.userConversation': 'User Conversation',
  'analysis.templateAnalysis': 'Template Analysis',
  'analysis.unknownType': 'Unknown Type',
  'analysis.noUserInput': 'No user input',
  'analysis.untitledConversation': 'Untitled Conversation',
  'analysis.userQuestion': 'User Question',
  'analysis.messages': 'messages',
  'analysis.aiAnalysisResult': 'AI Analysis Result',
  'analysis.conversationContent': 'Conversation Content',
  'analysis.thisConversationEmpty': 'This conversation has no content',
  'analysis.aiConversationHistory': 'AI Conversation History',
  'analysis.noConversationRecords': 'No conversation records',
  'analysis.selectContentForPreview': 'Select content for preview',

  // Actions
  'actions.cancel': 'Cancel',
  'actions.refresh': 'Refresh',

  // Messages
  'messages.loading': 'Loading...',
};

export const useI18nSafe = () => {
  try {
    // Try to use the proper I18n context
    const { useI18n } = require('@/components/providers/I18nProvider');
    const context = useI18n();
    return context;
  } catch (e) {
    // Fallback when I18n context is not available
    return {
      t: (key: string, fallback?: string) => {
        return fallbackTranslations[key] || fallback || key.split('.').pop() || key;
      },
      locale: 'en',
      setLocale: () => {},
      translations: {}
    };
  }
};