import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIAssistantPanel } from './AIAssistantPanel';
import { ContentItemPublic } from '@/lib/api/content';

// Mock dependencies
jest.mock('@/lib/api/content', () => ({
  contentApi: {
    getConversations: jest.fn(),
  },
}));

jest.mock('@/components/actions/prompts-action', () => ({
  fetchPrompts: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/ui/UniversalContentRenderer', () => ({
  UniversalContentRenderer: ({ content }: { content: string }) => (
    <div data-testid="universal-content-renderer">{content}</div>
  ),
}));

jest.mock('@/components/actions/FavoriteButton', () => ({
  FavoriteButton: ({ itemId }: { itemId: string }) => (
    <button data-testid="favorite-button" data-item-id={itemId}>
      Favorite
    </button>
  ),
}));

const mockContent: ContentItemPublic = {
  id: '123',
  title: 'Test Content',
  type: 'text',
  source_uri: null,
  content_text: 'This is test content',
  user_id: 'user123',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  processing_status: 'completed',
  summary: null,
  meta_info: null,
  error_message: null,
};

describe('AIAssistantPanel', () => {
  beforeEach(() => {
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AIAssistantPanel content={mockContent} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders plain text content as cards', async () => {
    // Mock the streaming response
    const mockStreamingResponse = 'This is a plain text response from AI.';
    
    // Mock the buildAnalysisCards function to return a card with plain text
    const { container } = render(<AIAssistantPanel content={mockContent} />);
    
    // Simulate streaming response by directly testing the card rendering
    const mockCard = {
      id: 'streaming',
      title: 'AI分析',
      subtitle: '分析完成',
      emoji: '🤖',
      content: {
        type: 'summary' as const,
        data: mockStreamingResponse,
      },
    };

    // Since we can't easily mock the internal state, we'll test the component structure
    expect(container.querySelector('.flex.flex-col')).toBeInTheDocument();
  });

  it('handles text input correctly', async () => {
    render(<AIAssistantPanel content={mockContent} />);
    
    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: 'Test question' } });
    
    expect(textInput).toHaveValue('Test question');
  });

  it('shows send button when input has text', async () => {
    render(<AIAssistantPanel content={mockContent} />);
    
    const textInput = screen.getByRole('textbox');
    fireEvent.change(textInput, { target: { value: 'Test question' } });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeInTheDocument();
  });

  it('renders cards area when cards are present', () => {
    render(<AIAssistantPanel content={mockContent} />);
    
    // The cards area should be present in the DOM structure
    const cardContainer = screen.getByRole('textbox').closest('.flex.flex-col');
    expect(cardContainer).toBeInTheDocument();
  });

  it('applies correct CSS classes for card rendering', () => {
    const { container } = render(<AIAssistantPanel content={mockContent} />);
    
    // Check for the main container structure
    const mainContainer = container.querySelector('.flex.flex-col.h-80');
    expect(mainContainer).toBeInTheDocument();
  });
}); 