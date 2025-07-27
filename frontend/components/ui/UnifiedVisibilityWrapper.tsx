"use client";

import React, { memo, useMemo, Suspense } from 'react';
import { ReferenceManagerProvider } from '@/components/ui/ReferenceManager';
import { useUnifiedVisibility } from '@/hooks/use-unified-visibility';

interface UnifiedVisibilityWrapperProps {
  contentId: string;
  children: React.ReactNode;
  visible?: boolean;
  priority?: number;
  fallback?: React.ReactNode;
  className?: string;
  enableReferenceManager?: boolean;
}

/**
 * 统一可见性包装器组件
 * 
 * 特点：
 * 1. 统一可见性管理
 * 2. 智能引用管理器包装
 * 3. 性能优化的渲染策略
 * 4. 减少组件层级嵌套
 */
const UnifiedVisibilityWrapper = memo<UnifiedVisibilityWrapperProps>(({
  contentId,
  children,
  visible = true,
  priority = 0,
  fallback = null,
  className = '',
  enableReferenceManager = true
}) => {
  const visibility = useUnifiedVisibility({
    defaultVisible: visible,
    fadeDuration: 200,
    maxVisible: 1
  });

  const wrapperId = `visibility-wrapper-${contentId}`;

  // 当可见性改变时更新状态
  React.useEffect(() => {
    visibility.setVisible(wrapperId, visible, priority);
  }, [visible, priority, wrapperId, visibility.setVisible]);

  const isVisible = visibility.isVisible(wrapperId);

  // 优化的渲染内容
  const renderedContent = useMemo(() => {
    if (!isVisible && fallback) {
      return fallback;
    }

    if (enableReferenceManager && contentId) {
      return (
        <ReferenceManagerProvider contentId={contentId}>
          {children}
        </ReferenceManagerProvider>
      );
    }

    return children;
  }, [isVisible, fallback, enableReferenceManager, contentId, children]);

  return (
    <div
      className={visibility.getVisibilityClasses(wrapperId, className)}
      style={{
        contain: 'layout style paint',
        willChange: isVisible ? 'opacity' : 'auto',
      }}
    >
      <Suspense fallback={fallback}>
        {renderedContent}
      </Suspense>
    </div>
  );
});

UnifiedVisibilityWrapper.displayName = 'UnifiedVisibilityWrapper';

export { UnifiedVisibilityWrapper };

/**
 * 预设配置的可见性包装器变体
 */
export const PreviewWrapper = memo<Omit<UnifiedVisibilityWrapperProps, 'className'>>(
  (props) => (
    <UnifiedVisibilityWrapper
      {...props}
      className="absolute inset-0"
    />
  )
);

PreviewWrapper.displayName = 'PreviewWrapper';

export const CardWrapper = memo<Omit<UnifiedVisibilityWrapperProps, 'className' | 'enableReferenceManager'>>(
  (props) => (
    <UnifiedVisibilityWrapper
      {...props}
      className="transition-all duration-200"
      enableReferenceManager={false}
    />
  )
);

CardWrapper.displayName = 'CardWrapper';

export default UnifiedVisibilityWrapper;