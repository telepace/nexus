"""
预处理系统独立演示
不依赖外部AI服务的完整预处理流程演示
"""

import asyncio
import json
import re
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


# 模拟的内容类型和状态枚举
class ContentType(Enum):
    ARTICLE = "article"
    RESEARCH_PAPER = "research_paper"
    BLOG_POST = "blog_post"
    WEB_PAGE = "web_page"
    DOCUMENT = "document"


class ProcessingStatus(Enum):
    COMPLETED = "completed"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"


@dataclass
class DocumentMetadata:
    title: str | None = None
    author: str | None = None
    source_url: str | None = None
    content_type: ContentType = ContentType.DOCUMENT
    language: str = "zh"
    domain: str | None = None
    estimated_words: int = 0


class MockPreprocessingPipeline:
    """模拟的预处理流水线"""

    def __init__(self):
        pass

    async def process_content(
        self,
        content: str,
        metadata: DocumentMetadata,
        user_preferences: dict[str, Any] | None = None,
    ):
        """执行完整的预处理流水线"""

        content_id = f"content_{hash(content) % 100000:05d}"
        start_time = datetime.now()

        print(f"🚀 开始预处理内容: {content_id}")
        print(f"📄 内容长度: {len(content)} 字符")
        print(f"📊 估算单词数: {len(content.split())} 词")

        try:
            # 第1层：输入层
            print("\n--- 🔍 第1层：输入层处理 ---")
            await asyncio.sleep(0.1)
            normalized_content = self._normalize_content(content)
            metadata.estimated_words = len(normalized_content.split())
            print("✅ 内容验证通过")
            print("✅ 内容规范化完成")

            # 第2层：解析层
            print("\n--- 📝 第2层：解析层处理 ---")
            await asyncio.sleep(0.2)
            markdown_content = self._convert_to_markdown(normalized_content)
            print("✅ Markdown格式转换完成")
            print("✅ 结构化处理完成")

            # 第3层：智能分段层
            print("\n--- ✂️ 第3层：智能分段层处理 ---")
            await asyncio.sleep(0.3)
            segments = self._segment_content(markdown_content)
            print(f"✅ 内容分为 {len(segments)} 个分段")

            # 第4层：AI初始化层
            print("\n--- 🤖 第4层：AI初始化层处理 ---")
            await asyncio.sleep(0.5)

            # 模拟并行AI任务
            ai_tasks = [
                self._generate_summary(markdown_content),
                self._generate_key_points(markdown_content),
                self._generate_labels(markdown_content),
                self._analyze_difficulty(markdown_content),
            ]

            summary, key_points, labels, difficulty = await asyncio.gather(*ai_tasks)

            print("✅ 摘要生成完成")
            print("✅ 关键点提取完成")
            print("✅ 标签生成完成")
            print("✅ 难度评估完成")

            # 第5层：存储层
            print("\n--- 💾 第5层：存储层处理 ---")
            await asyncio.sleep(0.1)
            print("✅ 数据持久化完成")

            # 第6层：输出层
            print("\n--- 📤 第6层：输出层处理 ---")

            # 计算阅读时间
            reading_time = max(1, metadata.estimated_words // 200)

            # 计算质量分数
            quality_score = self._calculate_quality_score(markdown_content)

            processing_time = (datetime.now() - start_time).total_seconds()

            result = {
                "content_id": content_id,
                "status": ProcessingStatus.COMPLETED.value,
                "processed_at": datetime.now().isoformat(),
                "processing_time": round(processing_time, 2),
                "markdown_content": markdown_content[:200] + "..."
                if len(markdown_content) > 200
                else markdown_content,
                "segments_count": len(segments),
                "summary": summary,
                "key_points": key_points,
                "labels": labels,
                "reading_time_minutes": reading_time,
                "difficulty_level": difficulty,
                "content_quality_score": quality_score,
                "metadata": {
                    "title": metadata.title,
                    "author": metadata.author,
                    "content_type": metadata.content_type.value,
                    "language": metadata.language,
                    "estimated_words": metadata.estimated_words,
                },
            }

            print("✅ 结果格式化完成")
            print(f"\n⏱️ 总处理时间: {processing_time:.2f} 秒")

            return result

        except Exception as e:
            print(f"❌ 预处理失败: {str(e)}")
            return {
                "content_id": content_id,
                "status": ProcessingStatus.FAILED.value,
                "error": str(e),
            }

    def _normalize_content(self, content: str) -> str:
        """内容规范化"""
        # 统一换行符
        content = content.replace("\r\n", "\n").replace("\r", "\n")
        # 清理多余空白
        content = re.sub(r"\n\s*\n", "\n\n", content)
        return content.strip()

    def _convert_to_markdown(self, content: str) -> str:
        """转换为Markdown格式"""
        lines = content.split("\n")
        markdown_lines = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                markdown_lines.append("")
                continue

            # 检测标题
            if (
                len(stripped) < 100
                and not stripped.endswith(".")
                and stripped[0].isupper()
                and "：" in stripped
                or "：" in stripped
            ):
                markdown_lines.append(f"## {stripped}")
            # 检测列表
            elif stripped.startswith(("1.", "2.", "3.", "4.", "5.")):
                markdown_lines.append(stripped)
            elif stripped.startswith(("- ", "* ", "• ")):
                markdown_lines.append(f"- {stripped[2:]}")
            else:
                markdown_lines.append(stripped)

        return "\n".join(markdown_lines)

    def _segment_content(self, content: str) -> list[dict[str, Any]]:
        """智能分段"""
        # 按段落分段
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

        segments = []
        current_segment = ""
        segment_count = 0

        for paragraph in paragraphs:
            # 检查是否需要新分段
            if len(current_segment + paragraph) > 2000 and current_segment:
                segment_count += 1
                segments.append(
                    {
                        "id": f"segment_{segment_count}",
                        "order": segment_count,
                        "content": current_segment.strip(),
                        "word_count": len(current_segment.split()),
                        "type": "paragraph",
                    }
                )
                current_segment = paragraph
            else:
                current_segment += "\n\n" + paragraph if current_segment else paragraph

        # 添加最后一个分段
        if current_segment:
            segment_count += 1
            segments.append(
                {
                    "id": f"segment_{segment_count}",
                    "order": segment_count,
                    "content": current_segment.strip(),
                    "word_count": len(current_segment.split()),
                    "type": "paragraph",
                }
            )

        return segments

    async def _generate_summary(self, content: str) -> dict[str, Any]:
        """生成摘要"""
        await asyncio.sleep(0.1)  # 模拟AI处理时间

        # 提取前几句作为摘要
        sentences = re.split(r"[。！？.!?]", content)
        summary_sentences = [s.strip() for s in sentences[:3] if s.strip()]

        return {
            "main_thesis": summary_sentences[0] if summary_sentences else "内容摘要",
            "key_arguments": summary_sentences[1:3]
            if len(summary_sentences) > 1
            else ["关键论点1", "关键论点2"],
            "word_count": len(" ".join(summary_sentences).split()),
        }

    async def _generate_key_points(self, content: str) -> dict[str, Any]:
        """提取关键点"""
        await asyncio.sleep(0.1)

        # 查找列表项作为关键点
        lines = content.split("\n")
        key_points = []

        for line in lines:
            stripped = line.strip()
            if (
                stripped.startswith(("1.", "2.", "3.", "4.", "5.", "-", "*", "•"))
                and len(stripped) > 10
            ):
                key_points.append(
                    {"point": stripped, "category": "key_concept", "priority": "high"}
                )

        if not key_points:
            # 如果没有找到列表，从标题中提取
            for line in lines:
                if line.startswith("##") and len(line) < 100:
                    key_points.append(
                        {
                            "point": line.replace("##", "").strip(),
                            "category": "section_title",
                            "priority": "medium",
                        }
                    )

        return {"core_concepts": key_points[:5], "total_points": len(key_points)}

    async def _generate_labels(self, content: str) -> list[str]:
        """生成标签"""
        await asyncio.sleep(0.1)

        # 尝试使用jieba
        import jieba

        words = jieba.cut(content)
        word_freq: dict[str, int] = {}

        for word in words:
            if len(word) >= 2 and word.isalpha():
                word_freq[word] = word_freq.get(word, 0) + 1

        # 获取频率最高的词作为标签
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        labels = [word for word, freq in sorted_words[:10] if freq > 1]

        return labels[:8]  # 返回最多8个标签

    async def _analyze_difficulty(self, content: str) -> str:
        """分析难度等级"""
        await asyncio.sleep(0.1)

        # 简单的难度评估
        sentences = content.split("。")
        avg_sentence_length = (
            sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        )

        # 检查技术术语
        technical_terms = [
            "算法",
            "系统",
            "架构",
            "框架",
            "模型",
            "优化",
            "配置",
            "部署",
        ]
        tech_count = sum(1 for term in technical_terms if term in content)

        if avg_sentence_length > 20 or tech_count > 5:
            return "advanced"
        elif avg_sentence_length > 12 or tech_count > 2:
            return "intermediate"
        else:
            return "beginner"

    def _calculate_quality_score(self, content: str) -> float:
        """计算内容质量分数"""
        score = 0.5  # 基础分数

        # 基于长度
        if len(content) > 2000:
            score += 0.2
        elif len(content) > 1000:
            score += 0.1

        # 基于结构
        if "##" in content:  # 有标题
            score += 0.15
        if content.count("\n") > 10:  # 有段落结构
            score += 0.15

        return min(1.0, score)


async def demo_basic_preprocessing():
    """演示基础预处理"""
    print("=" * 60)
    print("🚀 基础预处理演示")
    print("=" * 60)

    sample_content = """
人工智能的发展与应用

人工智能（Artificial Intelligence, AI）是计算机科学的一个重要分支，旨在创建能够模拟人类智能行为的系统。

发展历程

人工智能的发展可以分为几个重要阶段：

1. 萌芽期（1950-1970）：图灵测试的提出，早期符号主义AI的发展
2. 发展期（1970-1990）：专家系统的兴起，知识工程的发展
3. 复兴期（1990-2010）：机器学习算法的突破，统计学习理论的建立
4. 繁荣期（2010至今）：深度学习革命，大模型时代的到来

核心技术

机器学习是AI的核心技术之一，包括：
- 监督学习：通过标记数据进行训练
- 无监督学习：从未标记数据中发现模式
- 强化学习：通过与环境交互学习最优策略

深度学习是机器学习的一个子领域，主要特点：
- 多层神经网络结构
- 自动特征提取能力
- 在图像、语音、文本等领域取得突破

应用领域

人工智能在各个领域都有广泛应用：

计算机视觉：图像识别、目标检测、人脸识别等
自然语言处理：机器翻译、文本生成、情感分析等
语音技术：语音识别、语音合成、对话系统等
推荐系统：个性化推荐、广告投放、内容分发等

未来展望

AI技术将继续快速发展，可能的发展方向包括：
- 通用人工智能（AGI）的实现
- AI与其他技术的深度融合
- 更强的可解释性和安全性
- 更广泛的产业应用

人工智能正在改变我们的生活和工作方式，但同时也带来了伦理、安全等方面的挑战，需要全社会共同关注和解决。
    """

    metadata = DocumentMetadata(
        title="人工智能的发展与应用",
        author="AI研究者",
        content_type=ContentType.ARTICLE,
        language="zh",
        domain="technology",
    )

    pipeline = MockPreprocessingPipeline()
    result = await pipeline.process_content(sample_content, metadata)

    print("\n" + "=" * 60)
    print("📊 预处理结果")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    return result


async def demo_batch_processing():
    """演示批量处理"""
    print("\n" + "=" * 60)
    print("📦 批量处理演示")
    print("=" * 60)

    content_items = [
        {
            "content": "机器学习是人工智能的重要分支，通过算法让计算机能够从数据中学习规律。监督学习、无监督学习和强化学习是三种主要的机器学习方法。",
            "metadata": DocumentMetadata(
                title="机器学习入门", content_type=ContentType.ARTICLE
            ),
        },
        {
            "content": "深度学习使用多层神经网络来模拟人脑的工作方式。卷积神经网络在图像识别中表现优异，循环神经网络适合处理序列数据。",
            "metadata": DocumentMetadata(
                title="深度学习原理", content_type=ContentType.ARTICLE
            ),
        },
        {
            "content": "自然语言处理致力于让计算机理解和生成人类语言。词向量、注意力机制和Transformer模型是NLP领域的重要技术。",
            "metadata": DocumentMetadata(
                title="自然语言处理", content_type=ContentType.ARTICLE
            ),
        },
    ]

    pipeline = MockPreprocessingPipeline()

    start_time = datetime.now()

    # 并行处理
    tasks = [
        pipeline.process_content(item["content"], item["metadata"])
        for item in content_items
    ]

    batch_results = await asyncio.gather(*tasks)

    end_time = datetime.now()
    total_time = (end_time - start_time).total_seconds()

    print("\n📈 批量处理统计:")
    print(f"   总项目数: {len(content_items)}")
    print(f"   处理时间: {total_time:.2f} 秒")
    print(f"   平均耗时: {total_time / len(content_items):.2f} 秒/项")

    success_count = sum(1 for r in batch_results if r.get("status") == "completed")
    print(
        f"   成功率: {success_count}/{len(content_items)} ({success_count / len(content_items) * 100:.1f}%)"
    )

    return batch_results


async def demo_pipeline_architecture():
    """演示流水线架构"""
    print("\n" + "=" * 60)
    print("🏗️ 流水线架构演示")
    print("=" * 60)

    architecture = """
    ┌─────────────────────────────────────────────────────────────┐
    │                     预处理流水线 (Pipeline)                    │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │  输入层 → 解析层 → 智能分段层 → AI初始化层 → 存储层 → 输出层     │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    """

    print(architecture)

    layers = [
        {
            "layer": "第1层：输入层",
            "purpose": "内容验证和规范化",
            "functions": ["长度验证", "格式检测", "字符规范化", "基础统计"],
        },
        {
            "layer": "第2层：解析层",
            "purpose": "转换为统一Markdown格式",
            "functions": ["HTML解析", "PDF转换", "文本结构化", "格式优化"],
        },
        {
            "layer": "第3层：智能分段层",
            "purpose": "长文本智能分段",
            "functions": ["章节分段", "段落分段", "语义分段", "长度控制"],
        },
        {
            "layer": "第4层：AI初始化层",
            "purpose": "生成摘要、要点、标签",
            "functions": ["摘要生成", "要点提取", "标签生成", "难度评估"],
        },
        {
            "layer": "第5层：存储层",
            "purpose": "数据持久化",
            "functions": ["内容存储", "分段存储", "元数据存储", "索引建立"],
        },
        {
            "layer": "第6层：输出层",
            "purpose": "格式化结果输出",
            "functions": ["结果整合", "质量评估", "格式化", "性能统计"],
        },
    ]

    for layer in layers:
        print(f"\n🔸 {layer['layer']}")
        print(f"   目的: {layer['purpose']}")
        print(f"   功能: {' | '.join(layer['functions'])}")

    print("\n📋 系统特性:")
    features = [
        "✅ 异步并行处理",
        "✅ 多格式内容支持",
        "✅ 智能分段算法",
        "✅ AI驱动分析",
        "✅ 批量处理能力",
        "✅ 错误恢复机制",
        "✅ 质量评估体系",
        "✅ RESTful API接口",
    ]

    for feature in features:
        print(f"   {feature}")


async def main():
    """主演示函数"""
    print("🎯 预处理系统完整演示")
    print(
        "🔄 User Input → Content Processing → Agent Preprocessing → Feed Display → User Interaction → Agent Response → Result Rendering"
    )
    print()

    # 运行演示
    await demo_pipeline_architecture()
    await demo_basic_preprocessing()
    await demo_batch_processing()

    print("\n" + "=" * 60)
    print("✨ 预处理系统演示完成")
    print("=" * 60)

    print("\n💡 下一步:")
    print("   1. 集成真实的AI服务")
    print("   2. 实现数据库存储")
    print("   3. 部署API服务")
    print("   4. 配置监控告警")
    print("   5. 优化性能和扩展性")


if __name__ == "__main__":
    asyncio.run(main())
