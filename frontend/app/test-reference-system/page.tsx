"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { EnhancedContentReader } from "@/components/ui/EnhancedContentReader";
import { Button } from "@/components/ui/button";
import { contentApi, ContentChunk } from "@/lib/api/content";
import { Loading } from "@/components/ui/loading";
import { AlertCircle } from "lucide-react";

// 分离的组件，使用 useSearchParams
function TestReferenceSystemContent() {
  const searchParams = useSearchParams();
  const contentId = searchParams?.get('contentId') || 'test-content-123';
  
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(false);

  // 测试数据 - 带有ref参数的JSONL内容
  const testJsonlContent = `{"t": "h1", "c": "全文最主要传达的重点是什么？"}
{"t": "insight", "c": "这是一篇2024年度个人成长总结，作者熊鑫伟通过旅居生活、创业经历和跨文化思考，分享了自己从外企离职转型为数字游民的心路历程。核心观点是：人生需要不断突破舒适区，通过实践和反思实现自我蜕变（transformation）。", "ref": "1"}
{"t": "h2", "c": "全文的完整脉络"}
{"t": "p", "lead": "个人定位与转型", "c": "作者详细描述了自己从外企稳定工作离职，选择成为数字游民的心路历程。在尼泊尔ACT徒步时面临生死考验（冰坠路段险些滑落悬崖），开始思考生命意义。通过旅居清迈、大理等地，逐渐找到远程工作与生活平衡的方式。", "ref": "2,3"}
{"t": "p", "lead": "创业与AI产品思考", "c": "分享创业过程中踩过的坑：0到1阶段要快速验证MVP（最小可行产品），1到N阶段需要标准化复制。特别强调AI时代产品设计要注重人机协同，而非简单替代人类工作。", "ref": "4,5"}
{"t": "p", "lead": "跨文化观察与反思", "c": "记录在泰国、尼泊尔等地的文化见闻：清迈的"sabai sabai"（放松）生活方式、大理古城的文艺青年群体、尼泊尔老人晒太阳的朴素幸福。对比中西方价值观差异，反思快节奏生活的弊端。", "ref": "6,7"}
{"t": "p", "lead": "个人成长方法论", "c": "总结出三大成长支柱：保持记录习惯（使用flomo笔记）、定期冥想专注当下、通过徒步等户外活动突破极限。强调要建立动态平衡的价值系统，在自由与安全间找到个人舒适区。", "ref": "8,9"}
{"t": "h2", "c": "有趣的细节"}
{"t": "concept", "c": "生死时刻的顿悟：在尼泊尔ACT徒步时遭遇冰坠路段，险些滑落悬崖。这个濒死体验让作者开始认真思考："如果今天是我最后一天，我有什么遗憾？"最终得出的答案是：已经活得很尽兴，没有遗憾。", "ref": "3"}
{"t": "concept", "c": "清迈的生活哲学：在清迈学会泰国人"sabai sabai"（放松）的生活态度。观察到当地理发店虽然被小红书差评"剪得慢"，但实际上包含洗发、头部按摩等完整服务流程，体现对工作本身的热爱。", "ref": "6"}
{"t": "action", "c": "建议读者尝试数字游民生活方式，但要做好充分准备：财务规划、技能储备、心理建设等。可以先从短期旅居开始，逐步适应远程工作节奏。", "ref": "2,8"}`;

  // 创建与引用编号匹配的原文内容（模拟数据）
  const mockOriginalContent = [
    "这是一篇2024年度个人成长总结，作者熊鑫伟通过旅居生活、创业经历和跨文化思考，分享了自己从外企离职转型为数字游民的心路历程。核心观点是：人生需要不断突破舒适区，通过实践和反思实现自我蜕变（transformation）。", // 对应 ref "1"
    "作者详细描述了自己从外企稳定工作离职，选择成为数字游民的心路历程。通过旅居清迈、大理等地，逐渐找到远程工作与生活平衡的方式。", // 对应 ref "2"
    "在尼泊尔ACT徒步时面临生死考验（冰坠路段险些滑落悬崖），开始思考生命意义。这个濒死体验让作者开始认真思考：'如果今天是我最后一天，我有什么遗憾？'", // 对应 ref "3"
    "分享创业过程中踩过的坑：0到1阶段要快速验证MVP（最小可行产品）。", // 对应 ref "4"
    "1到N阶段需要标准化复制。特别强调AI时代产品设计要注重人机协同，而非简单替代人类工作。", // 对应 ref "5"
    "记录在泰国、尼泊尔等地的文化见闻：清迈的'sabai sabai'（放松）生活方式，体现对工作本身的热爱。", // 对应 ref "6"
    "大理古城的文艺青年群体、尼泊尔老人晒太阳的朴素幸福。对比中西方价值观差异，反思快节奏生活的弊端。", // 对应 ref "7"
    "总结出三大成长支柱：保持记录习惯（使用flomo笔记）。", // 对应 ref "8"
    "定期冥想专注当下、通过徒步等户外活动突破极限。强调要建立动态平衡的价值系统，在自由与安全间找到个人舒适区。", // 对应 ref "9"
  ];

  // 生成匹配的chunks数据（模拟数据，index从1开始以匹配引用）
  const mockChunks = mockOriginalContent.map((content, index) => ({
    id: `chunk-${index + 1}`,
    index: index + 1, // 从1开始，匹配引用编号
    content: content.trim(),
    type: 'paragraph',
  }));

  // 加载真实的 API 数据
  const loadRealData = async () => {
    if (!contentId || contentId === 'test-content-123') {
      setError('请提供有效的 contentId（通过 URL 参数 ?contentId=xxx）');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await contentApi.getAllContentChunks(contentId);
      
      // 转换 API 数据：index 从 0 开始转换为从 1 开始
      const convertedChunks = response.chunks.map((chunk, idx) => ({
        ...chunk,
        index: idx + 1, // 将 0-based index 转换为 1-based
      }));
      
      setChunks(convertedChunks);
      setUseRealData(true);
      
      console.log('✅ 成功加载真实数据:', {
        originalChunks: response.chunks.length,
        convertedChunks: convertedChunks.length,
        firstChunkIndex: convertedChunks[0]?.index,
        lastChunkIndex: convertedChunks[convertedChunks.length - 1]?.index
      });
      
    } catch (err) {
      console.error('❌ 加载真实数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 使用模拟数据
  const useMockData = () => {
    setChunks(mockChunks);
    setUseRealData(false);
    setError(null);
  };

  // 默认使用模拟数据
  useEffect(() => {
    if (chunks.length === 0) {
      useMockData();
    }
  }, []);

  const displayedChunks = chunks.length > 0 ? chunks : mockChunks;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          引用系统测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          测试 ref 参数的解析、跳转和高亮功能 
          {useRealData ? '（使用真实API数据）' : '（使用模拟数据）'}
        </p>
        
        {/* 数据源切换 */}
        <div className="flex justify-center gap-4 mt-4">
          <Button
            onClick={useMockData}
            variant={!useRealData ? "default" : "outline"}
            disabled={loading}
          >
            使用模拟数据
          </Button>
          <Button
            onClick={loadRealData}
            variant={useRealData ? "default" : "outline"}
            disabled={loading}
          >
            {loading ? '加载中...' : '加载真实数据'}
          </Button>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">加载失败</span>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
            <p className="text-red-600 dark:text-red-400 text-xs mt-2">
              当前 contentId: {contentId}
            </p>
          </div>
        )}
        
        {/* 数据状态显示 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div>Content ID: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{contentId}</code></div>
            <div>数据源: {useRealData ? 'API数据' : '模拟数据'}</div>
            <div>段落数量: {displayedChunks.length}</div>
            {displayedChunks.length > 0 && (
              <div>索引范围: {displayedChunks[0].index} - {displayedChunks[displayedChunks.length - 1].index}</div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <ReferenceManagerProvider contentId={contentId}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI分析结果 - 带引用 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🤖 AI分析结果（带引用）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JsonlRenderer 
                  content={testJsonlContent} 
                  contentId={contentId}
                />
              </CardContent>
            </Card>

            {/* 原文内容 - 支持高亮 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📄 原文内容（支持高亮跳转）
                  <span className="text-sm font-normal text-muted-foreground">
                    {displayedChunks.length} 段落
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                <EnhancedContentReader
                  chunks={displayedChunks}
                  contentId={contentId}
                />
              </CardContent>
            </Card>
          </div>

          {/* 流式渲染测试 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚡ 流式渲染测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StreamingJsonlRenderer 
                content={testJsonlContent}
                contentId={contentId}
                isLoading={false}
              />
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>📖 使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    功能特性
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• 自动解析 ref 参数（如："1,2"）</li>
                    <li>• 点击引用数字跳转到原文段落</li>
                    <li>• 自动高亮相关段落</li>
                    <li>• 支持 Tooltip 预览引用内容</li>
                    <li>• 支持多种块类型的引用显示</li>
                    <li>• 兼容 API 数据（index从0开始）和模拟数据</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    操作方式
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• 鼠标悬停查看引用预览</li>
                    <li>• 点击引用数字跳转到对应段落</li>
                    <li>• 右侧原文会自动滚动并高亮</li>
                    <li>• 支持键盘导航和无障碍访问</li>
                    <li>• 响应式设计，移动端友好</li>
                    <li>• 使用 ?contentId=xxx 测试真实数据</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold mb-2">技术实现</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  系统通过 <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ReferenceManager</code> 
                  管理引用状态，使用 <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">CustomEvent</code> 
                  实现组件间通信，通过 CSS 类和 
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">scrollIntoView</code> 
                  实现平滑跳转和高亮效果。自动处理 API 数据的索引转换（0-based → 1-based），确保引用匹配正确。
                </p>
              </div>
              
              {/* API 测试说明 */}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  API 数据测试
                </h4>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                  <p>要测试真实的 API 数据，请在 URL 中添加参数：</p>
                  <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded block">
                    /test-reference-system?contentId=9bef3699-5f9c-406d-b039-e91dfae4f09b
                  </code>
                  
                  <div className="mt-3 text-xs">
                    <div className="font-medium mb-1">测试步骤：</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>确保后端API服务运行在 http://127.0.0.1:8000</li>
                      <li>点击"加载真实数据"按钮</li>
                      <li>观察数据状态面板中的索引信息</li>
                      <li>点击右侧AI分析结果中的引用数字（如 ①、②、③）</li>
                      <li>左侧原文应该自动跳转并高亮对应段落</li>
                      <li>检查浏览器控制台的详细调试日志</li>
                    </ol>
                  </div>
                  
                  <div className="mt-3 text-xs">
                    <div className="font-medium mb-1">索引匹配逻辑：</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>API 数据：index 从 0 开始 → 自动转换为从 1 开始</li>
                      <li>引用编号：始终从 1 开始（ref="1,2,3"）</li>
                      <li>系统支持三种匹配方式确保兼容性</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Debug 信息 */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    🔧 Debug 信息 (开发环境)
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>页面已启用详细调试日志</div>
                    <div>打开浏览器控制台查看引用跳转的完整执行过程</div>
                    <div>右下角会显示当前高亮状态（仅在开发环境）</div>
                    <div>所有DOM查找和事件传播都有详细日志记录</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </ReferenceManagerProvider>
      )}
    </div>
  );
}

// 主页面组件，包裹在 Suspense 中
export default function TestReferenceSystemPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TestReferenceSystemContent />
    </Suspense>
  );
} 