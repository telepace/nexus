import React from 'react';
import { render, screen, fireEvent } from '../../../tests/test-utils';
import Button from '../../../components/ui/Button';

describe('Button Component', () => {
  it('should render button with default styles', () => {
    render(<Button>测试按钮</Button>);
    
    const button = screen.getByRole('button', { name: /测试按钮/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn'); // 假设默认类名
  });

  it('should render button with primary variant', () => {
    render(<Button variant="primary">主要按钮</Button>);
    
    const button = screen.getByRole('button', { name: /主要按钮/i });
    expect(button).toHaveClass('btn-primary'); // 假设primary变体的类名
  });

  it('should render button with different sizes', () => {
    const { rerender } = render(<Button size="sm">小按钮</Button>);
    
    let button = screen.getByRole('button', { name: /小按钮/i });
    expect(button).toHaveClass('btn-sm'); // 假设small尺寸的类名
    
    rerender(<Button size="lg">大按钮</Button>);
    button = screen.getByRole('button', { name: /大按钮/i });
    expect(button).toHaveClass('btn-lg'); // 假设large尺寸的类名
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>禁用按钮</Button>);
    
    const button = screen.getByRole('button', { name: /禁用按钮/i });
    expect(button).toBeDisabled();
  });
  
  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>点击按钮</Button>);
    
    const button = screen.getByRole('button', { name: /点击按钮/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>禁用点击</Button>);
    
    const button = screen.getByRole('button', { name: /禁用点击/i });
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('should render with custom className', () => {
    render(<Button className="custom-class">自定义类名按钮</Button>);
    
    const button = screen.getByRole('button', { name: /自定义类名按钮/i });
    expect(button).toHaveClass('custom-class');
  });
  
  it('should render as different elements using asChild', () => {
    render(
      <Button asChild>
        <a href="/test">链接按钮</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /链接按钮/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('btn'); // 假设btn类也应用于asChild元素
  });
}); 