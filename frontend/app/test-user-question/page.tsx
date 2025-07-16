"use client";

import React from "react";
import { UserQuestionDisplay } from "@/components/ui/user-question-display";
import { CompactQuestionDisplay } from "@/components/ui/compact-question-display";

export default function TestUserQuestionPage() {
  const shortQuestion = "这是一个简短的问题？";

  const longQuestion = `我已经很保守的做这件事一天了，我已经让它等一天都不前进随的做过了，感怕很平常的一天，走在任何评上，看着小朋友和小狗嘻嘻的身影我觉得已经很泽了。

世界上只有一种英雄主义，就是你认清了生活的真相之后仍然爱它。

幸福其实源于自己的内心，我并不觉得肯定有得超越的幸福煤炭早期的幸福，但是我觉得有自己所创造的幸福是我最想要的幸福。

做我所爱，便是幸福。

世界上也只有一种可笑的悲剧：对生活抱有不可实现的美好期待，幻想着一个完美的"地上天国"，而当发现实并非如此时美好时，又过度将生活视为一无是处的丑恶。

我们这一代人尚未经历经济萧条，裁员，日本泡沫经济已经历三十年GDP没有增长了，这可是整代人的时间，如今，仍有很多人幻想着明年经济会转好，但也有经济永远不会合理。

幸福不仅仅是通俗不幸福，更需要主动去创造和体验幸福。`;

  const veryLongQuestion = `现在的用户提问，好像 LLM 不能优雅的显示出来，我希望可以显示出用户的提问，如果很长就隐藏起来，折叠起来。并且可以展开，参考 UI 组件生成规范，思考如何优雅的显示出来？

我需要一个组件能够：
1. 自动检测文本长度
2. 超过阈值时自动折叠
3. 提供展开/收起功能
4. 智能截断，优先在句号等标点符号处截断
5. 显示字符数统计
6. 支持复制功能
7. 遵循项目的 UI 设计规范

这个组件应该能够处理各种长度的用户提问，从简短的问题到非常长的详细描述都能优雅地展示。同时要保持良好的用户体验，让用户能够轻松地查看完整内容或者快速浏览摘要。

组件的设计应该简洁明了，符合现代 UI 设计的美学标准，同时具有良好的可访问性和响应式设计。`;

  const mediumQuestion =
    "我想了解一下这个功能的具体实现原理，以及在实际项目中如何使用这个组件来优化用户体验？";

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">用户提问展示组件测试</h1>
        <p className="text-muted-foreground">
          测试不同长度的用户提问如何优雅地展示，包括完整版和紧凑版两种样式
        </p>
      </div>

      {/* 完整版组件 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">
          完整版组件 (UserQuestionDisplay)
        </h2>

        <div className="space-y-6">
          {/* 短问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">短问题（无需折叠）</h3>
            <UserQuestionDisplay question={shortQuestion} />
          </div>

          {/* 中等长度问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">中等长度问题（需要折叠）</h3>
            <UserQuestionDisplay
              question={mediumQuestion}
              collapseThreshold={80}
              previewLength={60}
            />
          </div>

          {/* 很长的问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">很长的问题（需要折叠）</h3>
            <UserQuestionDisplay
              question={veryLongQuestion}
              title="详细需求描述"
              collapseThreshold={200}
              previewLength={150}
            />
          </div>
        </div>
      </div>

      {/* 紧凑版组件 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">
          紧凑版组件 (CompactQuestionDisplay)
        </h2>

        <div className="space-y-6">
          {/* 短问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">短问题 - 不同变体</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">默认样式</p>
                <CompactQuestionDisplay question={shortQuestion} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">最小化样式</p>
                <CompactQuestionDisplay
                  question={shortQuestion}
                  variant="minimal"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">气泡样式</p>
                <CompactQuestionDisplay
                  question={shortQuestion}
                  variant="bubble"
                />
              </div>
            </div>
          </div>

          {/* 中等长度问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">中等长度问题 - 需要折叠</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">默认样式</p>
                <CompactQuestionDisplay
                  question={mediumQuestion}
                  collapseThreshold={50}
                  previewLength={40}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">最小化样式</p>
                <CompactQuestionDisplay
                  question={mediumQuestion}
                  variant="minimal"
                  collapseThreshold={50}
                  previewLength={40}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">气泡样式</p>
                <CompactQuestionDisplay
                  question={mediumQuestion}
                  variant="bubble"
                  collapseThreshold={50}
                  previewLength={40}
                />
              </div>
            </div>
          </div>

          {/* 长问题 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">长问题 - 模拟聊天场景</h3>
            <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                聊天消息中的用户提问
              </p>
              <CompactQuestionDisplay
                question={longQuestion}
                variant="bubble"
                collapseThreshold={120}
                previewLength={80}
              />
              <div className="text-xs text-muted-foreground">
                AI 回复会在这里显示...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 对比展示 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">对比展示</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">完整版 - 适合独立展示</h3>
            <UserQuestionDisplay
              question={longQuestion}
              title="用户详细咨询"
              collapseThreshold={200}
              previewLength={120}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">紧凑版 - 适合聊天消息</h3>
            <CompactQuestionDisplay
              question={longQuestion}
              variant="bubble"
              collapseThreshold={120}
              previewLength={80}
            />
          </div>
        </div>
      </div>

      {/* 使用建议 */}
      <div className="space-y-4 bg-muted/30 p-6 rounded-lg">
        <h2 className="text-lg font-semibold">使用建议</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>完整版 (UserQuestionDisplay)：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
            <li>适合独立展示用户问题的场景</li>
            <li>客服系统、问答页面、反馈表单等</li>
            <li>需要突出显示问题重要性的场合</li>
          </ul>

          <p className="mt-4">
            <strong>紧凑版 (CompactQuestionDisplay)：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
            <li>适合聊天消息、对话历史等场景</li>
            <li>需要节省空间但保持可读性</li>
            <li>多个问题连续展示的情况</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
