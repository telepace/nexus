"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { JsonObjectRenderer } from "@/components/ui/JsonObjectRenderer";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";

export default function TestJsonRendererPage() {
  // 测试数据
  const testJsonObject = {
    "title": "AI分析结果",
    "summary": "这是一个复杂的AI分析结果对象",
    "data": {
      "key_points": [
        "第一个要点",
        "第二个要点",
        "第三个要点"
      ],
      "metadata": {
        "created_at": "2024-01-15",
        "confidence": 0.95,
        "sources": ["source1", "source2"],
        "is_verified": true
      },
      "nested_object": {
        "level1": {
          "level2": {
            "level3": "深层嵌套数据"
          }
        }
      }
    },
    "statistics": {
      "word_count": 1500,
      "reading_time": 6,
      "complexity_score": null
    }
  };

  const testJsonlContent = `{"type": "h2", "content": "核心观点", "mapping": "h2-1"}
{"type": "insight", "content": "这是一个重要的洞察", "priority": "high", "mapping": "insight1"}
{"type": "p", "content": "这是一段普通的段落文本", "mapping": "p1"}
{"type": "list", "content": ["项目一", "项目二", "项目三"], "mapping": "list1"}
{"type": "concept", "content": "这是一个关键概念", "mapping": "concept1"}`;

  const testStringifiedJson = JSON.stringify(testJsonObject);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          JSON 渲染器测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          测试不同格式JSON内容的渲染效果
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 测试1: JSON对象直接渲染 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 JSON对象 - 直接传入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JsonObjectRenderer data={testJsonObject} />
          </CardContent>
        </Card>

        {/* 测试2: JSON字符串渲染 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📄 JSON字符串 - 通过JsonObjectRenderer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JsonObjectRenderer data={testStringifiedJson} />
          </CardContent>
        </Card>

        {/* 测试3: 通过UniversalContentRenderer渲染JSON字符串 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 JSON字符串 - 通过UniversalContentRenderer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UniversalContentRenderer content={testStringifiedJson} />
          </CardContent>
        </Card>

        {/* 测试4: JSONL内容渲染 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 JSONL内容 - 通过UniversalContentRenderer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UniversalContentRenderer content={testJsonlContent} />
          </CardContent>
        </Card>

        {/* 测试5: 模拟实际使用场景 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 实际场景模拟 - 分析结果数据
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                原始JSON数据:
              </h4>
              <JsonObjectRenderer 
                data={testJsonObject} 
                defaultExpandDepth={1}
                className="mb-4"
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                字符串化后的效果 (模拟后端返回):
              </h4>
              <UniversalContentRenderer content={testStringifiedJson} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 说明文档 */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            📚 使用说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
          <p><strong>JsonObjectRenderer:</strong> 专门用于渲染JSON对象，支持语法高亮、层级展开/折叠、复制功能</p>
          <p><strong>UniversalContentRenderer:</strong> 自动检测内容格式，支持JSONL、JSON对象、Markdown等格式</p>
          <p><strong>特性:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>🎨 语法高亮 - 不同类型数据使用不同颜色</li>
            <li>📁 可折叠树结构 - 点击展开/折叠嵌套对象</li>
            <li>📋 一键复制 - 点击右上角复制按钮</li>
            <li>🌙 深色模式支持</li>
            <li>📱 响应式设计</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 