import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarRoot } from '../../../components/Sidebar/SidebarRoot';
import { SidebarHeader } from '../../../components/Sidebar/SidebarHeader';
import { QuickActionPanel } from '../../../components/Sidebar/QuickActionPanel';
import { ChatContainer } from '../../../components/Sidebar/ChatContainer';
import { InputArea } from '../../../components/Sidebar/InputArea';
import { FooterArea } from '../../../components/Sidebar/FooterArea';

describe('Sidebar Components', () => {
  describe('SidebarRoot', () => {
    it('renders sidebar with all main components', () => {
      render(<SidebarRoot />);
      
      expect(screen.getByTestId('sidebar-root')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-panel')).toBeInTheDocument();
      expect(screen.getByTestId('chat-container')).toBeInTheDocument();
      expect(screen.getByTestId('input-area')).toBeInTheDocument();
      expect(screen.getByTestId('footer-area')).toBeInTheDocument();
    });
  });

  describe('SidebarHeader', () => {
    it('renders logo, connection status and minimize button', () => {
      render(<SidebarHeader />);
      
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('minimize-button')).toBeInTheDocument();
    });

    it('calls onMinimize when minimize button is clicked', () => {
      const onMinimize = jest.fn();
      render(<SidebarHeader onMinimize={onMinimize} />);
      
      fireEvent.click(screen.getByTestId('minimize-button'));
      expect(onMinimize).toHaveBeenCalled();
    });
  });

  describe('QuickActionPanel', () => {
    it('renders all quick action buttons', () => {
      render(<QuickActionPanel />);
      
      expect(screen.getByTestId('page-summary-button')).toBeInTheDocument();
      expect(screen.getByTestId('extract-key-points-button')).toBeInTheDocument();
      expect(screen.getByTestId('explain-selection-button')).toBeInTheDocument();
      expect(screen.getByTestId('translate-button')).toBeInTheDocument();
      expect(screen.getByTestId('custom-prompt-selector')).toBeInTheDocument();
    });

    it('triggers action when button is clicked', () => {
      const onAction = jest.fn();
      render(<QuickActionPanel onAction={onAction} />);
      
      fireEvent.click(screen.getByTestId('page-summary-button'));
      expect(onAction).toHaveBeenCalledWith('summarize');
    });
  });

  describe('ChatContainer', () => {
    it('renders message list and suggestion chips', () => {
      const messages = [
        { id: '1', type: 'user', content: 'Hello' },
        { id: '2', type: 'ai', content: 'Hi there!' }
      ];
      
      render(<ChatContainer messages={messages} />);
      
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-chips')).toBeInTheDocument();
    });
  });

  describe('InputArea', () => {
    it('renders input field and send button', () => {
      render(<InputArea />);
      
      expect(screen.getByTestId('text-input')).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    it('calls onSend with input value when send button is clicked', () => {
      const onSend = jest.fn();
      render(<InputArea onSend={onSend} />);
      
      const input = screen.getByTestId('text-input');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByTestId('send-button'));
      
      expect(onSend).toHaveBeenCalledWith('Test message');
    });
  });

  describe('FooterArea', () => {
    it('renders settings and help buttons', () => {
      render(<FooterArea />);
      
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
      expect(screen.getByTestId('help-button')).toBeInTheDocument();
    });
  });
}); 