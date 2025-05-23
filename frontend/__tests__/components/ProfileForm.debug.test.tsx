import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileForm } from '@/app/customers/components/ProfileForm';
import type { User } from '@/lib/auth';

// Mock all external dependencies
jest.mock('react-nice-avatar', () => ({
  __esModule: true,
  default: function MockNiceAvatar(props: any) {
    return <div data-testid="nice-avatar">MockNiceAvatar</div>;
  },
  genConfig: jest.fn(() => ({
    sex: 'man',
    faceColor: '#F9C9B6',
  }))
}));

jest.mock('lucide-react', () => ({
  Upload: () => <div>Upload</div>,
  Edit2: () => <div>Edit2</div>,
  RefreshCw: () => <div>RefreshCw</div>,
  Palette: () => <div>Palette</div>,
  User: () => <div>User</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
  AvatarFallback: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

const mockUser: User = {
  id: '1',
  full_name: 'John Doe',
  email: 'john@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2023-01-01T00:00:00Z',
  avatar_url: 'https://example.com/avatar.jpg'
};

const mockOnSubmit = jest.fn();

describe('ProfileForm Debug', () => {
  it('renders without crashing', () => {
    try {
      const { container } = render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);
      console.log('Component rendered successfully');
      console.log('Container HTML:', container.innerHTML);
      
      // Basic check
      expect(container).toBeDefined();
    } catch (error) {
      console.error('Component render error:', error);
      throw error;
    }
  });

  it('checks for basic text content', () => {
    const { container } = render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);
    
    // Debug output
    console.log('Full rendered HTML:', container.innerHTML);
    
    // Try to find any text
    const allText = container.textContent;
    console.log('All text content:', allText);
    
    expect(container).toBeDefined();
  });
}); 