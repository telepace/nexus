import React from 'react';
import { render, screen } from '@testing-library/react';

describe('UI Basic Test', () => {
  it('should render a component', () => {
    render(<div data-testid="test-component">Hello World</div>);
    const component = screen.getByTestId('test-component');
    expect(component).toBeInTheDocument();
    expect(component).toHaveTextContent('Hello World');
  });
}); 