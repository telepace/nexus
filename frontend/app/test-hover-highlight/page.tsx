"use client";

import React, { useEffect } from 'react';
import { ReferenceManagerProvider, useReferenceManagerSafe } from '@/components/ui/ReferenceManager';
import { EnhancedContentReader } from '@/components/ui/EnhancedContentReader';
import { OptimizedReferenceIndicator } from '@/components/ui/OptimizedReferenceIndicator';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// 简单的测试tooltip组件
const SimpleTooltipTest = () => (
  <div className="p-3 bg-gray-50 rounded border">
    <p className="text-sm mb-2">Tooltip测试：</p>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
          悬浮测试
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>这是一个简单的tooltip测试</p>
      </TooltipContent>
    </Tooltip>
  </div>
);

// 内部组件，用于在 Provider 内部加载测试数据
const TestContentInner = ({ testChunks, testContentId }: {
  testChunks: Array<{
    id: string;
    index: number;
    content: string;
    type?: string;
  }>;
  testContentId: string;
}) => {
  const { state, actions } = useReferenceManagerSafe();

  // 模拟加载源段落数据
  useEffect(() => {
    console.log('🔧 TestContentInner: useEffect triggered', {
      sourceParagraphsLength: state.sourceParagraphs.length,
      hasSetTestSourceParagraphs: !!actions.setTestSourceParagraphs,
      testChunksLength: testChunks.length
    });

    // 将 testChunks 转换为 sourceParagraphs 格式
    const mockSourceParagraphs = testChunks.map((chunk, index) => ({
      id: chunk.id,
      content: chunk.content,
      index: chunk.index,
      display_number: chunk.index, // 重要：这个字段用于引用匹配
      position: index,
      content_id: testContentId,
      content_item_id: testContentId,
      start_offset: index * 100,
      end_offset: (index + 1) * 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 直接设置测试数据
    if (actions.setTestSourceParagraphs) {
      console.log('🔧 TestContentInner: 强制设置测试源段落数据', {
        count: mockSourceParagraphs.length,
        sample: mockSourceParagraphs.slice(0, 3)
      });
      
      actions.setTestSourceParagraphs(mockSourceParagraphs);
      
      // 等待一段时间后检查状态
      setTimeout(() => {
        console.log('🔧 TestContentInner: 设置后的状态检查', {
          sourceParagraphsLength: state.sourceParagraphs.length,
          currentContentId: state.currentContentId
        });
      }, 100);
    } else {
      console.warn('⚠️ TestContentInner: setTestSourceParagraphs 方法不可用');
    }
  }, [testChunks, testContentId, actions, state.sourceParagraphs.length]);

  // 测试按钮，手动触发高亮
  const testHighlight = () => {
    console.log('🧪 手动测试高亮功能', {
      sourceParagraphs: state.sourceParagraphs.length,
      testRefs: [3, 4, 5]
    });
    actions.highlightParagraphs([3, 4, 5], true);
  };

  const clearTestHighlight = () => {
    console.log('🧪 清除测试高亮');
    actions.clearHighlights();
  };

  // 直接测试事件系统
  const testDirectEvent = () => {
    console.log('🧪 直接发送高亮事件');
    const event = new CustomEvent('highlightParagraphs', {
      detail: { refIds: [7, 8, 9], isHover: true }
    });
    window.dispatchEvent(event);
  };

  const testDirectClear = () => {
    console.log('🧪 直接发送清除事件');
    const event = new CustomEvent('clearHighlights', {});
    window.dispatchEvent(event);
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：测试引用 */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">悬浮高亮测试</h2>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                将鼠标悬浮在下面的引用上，观察右侧内容区域的高亮效果：
              </p>
              
              {/* 手动测试按钮 */}
              <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                <button 
                  onClick={testHighlight}
                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  测试高亮 [3,4,5]
                </button>
                <button 
                  onClick={clearTestHighlight}
                  className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  清除高亮
                </button>
              </div>
              
              {/* 直接事件测试按钮 */}
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                <button 
                  onClick={testDirectEvent}
                  className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                >
                  直接事件 [7,8,9]
                </button>
                <button 
                  onClick={testDirectClear}
                  className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                >
                  直接清除
                </button>
              </div>

              {/* Tooltip 测试 */}
              <SimpleTooltipTest />

              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded">
                  <p className="text-sm">
                    根据研究数据显示
                    <OptimizedReferenceIndicator 
                      references={[3, 4, 5]} 
                      contentId={testContentId}
                      variant="tooltip"
                    />
                    ，这个方法非常有效。
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded">
                  <p className="text-sm">
                    进一步的分析表明
                    <OptimizedReferenceIndicator 
                      references={[8]} 
                      contentId={testContentId}
                      variant="tooltip"
                    />
                    这一结论是可靠的。
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded">
                  <p className="text-sm">
                    综合考虑多个因素
                    <OptimizedReferenceIndicator 
                      references={[12, 13, 14, 15]} 
                      contentId={testContentId}
                      variant="tooltip"
                    />
                    ，我们得出以下结论。
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded">
                  <p className="text-sm">
                    最终验证显示
                    <OptimizedReferenceIndicator 
                      refString="18-20" 
                      contentId={testContentId}
                      variant="tooltip"
                    />
                    这些发现具有重要意义。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-3">使用说明</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>悬浮高亮</strong>：鼠标悬浮时显示绿色高亮，带有脉动动画，并显示卡片预览</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>点击高亮</strong>：点击跳转时显示蓝色高亮，更加醒目</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>自动清除</strong>：鼠标离开引用时自动清除悬浮高亮</span>
              </li>
            </ul>
          </div>

          {/* 调试信息 */}
          <div className="bg-card rounded-lg border p-4">
            <h4 className="text-sm font-medium mb-2">调试信息</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>源段落数: {state.sourceParagraphs.length}</div>
              <div>当前内容ID: {state.currentContentId}</div>
              <div>高亮段落: [{Array.from(state.highlightedParagraphs).join(', ')}]</div>
            </div>
          </div>
        </div>

        {/* 右侧：内容区域 */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4">文档内容</h3>
          <div className="max-h-[70vh] overflow-y-auto">
            <EnhancedContentReader 
              chunks={testChunks}
              contentId={testContentId}
              className="space-y-3"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

const TestHoverHighlightPage = () => {
  // 模拟段落数据
  const testChunks = Array.from({ length: 20 }, (_, i) => ({
    id: `chunk-${i + 1}`,
    index: i + 1,
    content: `这是第${i + 1}个段落的内容。这里包含了重要的信息，用于测试悬浮高亮功能。当你悬浮在引用指示器上时，对应的段落应该会以绿色高亮显示，而点击时则显示蓝色高亮。这个段落包含了关键的研究数据、分析结果和重要结论，是整个文档中不可或缺的组成部分。`,
    type: 'p'
  }));

  const testContentId = 'test-content-hover';

  return (
    <ReferenceManagerProvider contentId={testContentId}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <TestContentInner testChunks={testChunks} testContentId={testContentId} />
        </div>

        {/* 开发调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 bg-black/90 text-white p-3 rounded text-xs max-w-xs">
            <div className="font-medium mb-2">调试信息</div>
            <div>总段落数: {testChunks.length}</div>
            <div>内容ID: {testContentId}</div>
          </div>
        )}
      </div>
    </ReferenceManagerProvider>
  );
};

export default TestHoverHighlightPage; 