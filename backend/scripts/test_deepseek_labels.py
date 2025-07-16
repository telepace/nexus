#!/usr/bin/env python3
"""
DeepSeek V3 Ensemble 标签处理测试脚本

用于测试和验证 deepseek-v3-ensemble 模型在标签生成、
质量评分和阅读时间估算方面的性能表现。
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.services.ai.chat_service import ChatService

# 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DeepSeekLabelsTestSuite:
    """DeepSeek V3 Ensemble 标签测试套件"""

    def __init__(self):
        self.chat_service = ChatService()

        # 测试用例：不同类型和复杂度的内容
        self.test_cases = [
            {
                "name": "技术文档",
                "content": """
                深度学习是机器学习的一个重要分支，它基于人工神经网络的研究。
                近年来，随着计算能力的提升和大数据的发展，深度学习在计算机视觉、
                自然语言处理、语音识别等领域取得了突破性进展。

                卷积神经网络(CNN)在图像识别任务中表现出色，能够自动学习图像的
                层次特征。循环神经网络(RNN)及其改进版本LSTM、GRU则在序列数据
                处理方面展现了强大的能力。

                Transformer架构的提出彻底改变了自然语言处理的格局，BERT、GPT
                等预训练模型在各种NLP任务中刷新了性能记录。这些模型通过在大规模
                语料库上进行预训练，学习到了丰富的语言表示。
                """,
                "content_type": "技术文档",
                "expected_tags": ["深度学习", "机器学习", "人工智能", "技术文档"],
            },
            {
                "name": "产品分析",
                "content": """
                随着移动互联网的快速发展，短视频平台成为了用户获取信息和娱乐的
                重要渠道。抖音作为行业领头羊，通过精准的算法推荐和丰富的内容生态，
                吸引了数亿用户的关注。

                产品设计方面，抖音采用了沉浸式的全屏播放模式，配合智能的推荐算法，
                能够精准匹配用户喜好，提升用户粘性。内容创作者通过多样化的创作工具，
                能够制作出高质量的短视频内容。

                商业模式上，抖音主要通过广告变现、直播打赏、电商带货等方式实现盈利。
                这种多元化的变现模式为平台的可持续发展提供了保障。
                """,
                "content_type": "产品分析",
                "expected_tags": ["产品分析", "短视频", "移动互联网", "商业模式"],
            },
            {
                "name": "学术论文",
                "content": """
                量子计算是基于量子力学原理的计算模式，具有处理某些特定问题时
                相比经典计算机呈指数级加速的潜力。量子比特(qubit)是量子计算的
                基本单位，与经典比特不同，量子比特可以同时处于0和1的叠加态。

                量子门操作是量子计算中的基本操作，通过组合不同的量子门可以构建
                复杂的量子算法。著名的Shor算法能够高效地分解大整数，对现有的
                RSA加密体系构成威胁。Grover算法则可以在无序数据库中进行量子搜索，
                提供平方根级别的加速。

                当前量子计算面临的主要挑战包括量子退相干、错误率控制、扩展性等问题。
                IBM、Google、微软等科技巨头都在积极投入量子计算的研发，
                努力实现量子优势(quantum advantage)。
                """,
                "content_type": "学术论文",
                "expected_tags": ["量子计算", "量子力学", "算法", "学术研究"],
            },
        ]

    async def test_model_performance(self) -> dict[str, Any]:
        """测试模型性能"""
        logger.info("🚀 开始 DeepSeek V3 Ensemble 标签处理性能测试")

        results = {
            "model_name": "deepseek-v3-ensemble",
            "test_timestamp": time.time(),
            "test_cases": [],
            "summary": {
                "total_tests": len(self.test_cases),
                "successful_tests": 0,
                "average_response_time": 0.0,
                "average_score": 0.0,
                "tag_accuracy": 0.0,
            },
        }

        total_response_time = 0.0
        total_score = 0.0
        successful_tests = 0

        for i, test_case in enumerate(self.test_cases, 1):
            logger.info(f"📝 测试用例 {i}/{len(self.test_cases)}: {test_case['name']}")

            start_time = time.time()

            try:
                # 构建测试上下文
                context = {
                    "content": test_case["content"],
                    "content_type": test_case["content_type"],
                }

                # 调用 labels.j2 模板生成标签
                result = await self.chat_service.generate_with_template(
                    "labels.j2", context
                )

                response_time = time.time() - start_time
                total_response_time += response_time

                if result and isinstance(result, dict):
                    successful_tests += 1

                    # 提取评分
                    score = result.get("score", 0.0)
                    if isinstance(score, int | float) and score > 0:
                        total_score += score

                    # 计算标签匹配度
                    generated_tags = result.get("tags", [])
                    expected_tags = test_case["expected_tags"]
                    tag_match_rate = self._calculate_tag_similarity(
                        generated_tags, expected_tags
                    )

                    test_result = {
                        "test_name": test_case["name"],
                        "success": True,
                        "response_time": response_time,
                        "result": result,
                        "tag_match_rate": tag_match_rate,
                        "content_length": len(test_case["content"]),
                        "expected_tags": expected_tags,
                        "generated_tags": generated_tags,
                    }

                    logger.info(f"✅ {test_case['name']} 测试成功")
                    logger.info(f"   响应时间: {response_time:.2f}s")
                    logger.info(f"   质量评分: {score}")
                    logger.info(f"   标签匹配率: {tag_match_rate:.2%}")
                    logger.info(f"   生成标签: {generated_tags}")

                else:
                    test_result = {
                        "test_name": test_case["name"],
                        "success": False,
                        "response_time": response_time,
                        "error": "Invalid response format",
                        "result": result,
                    }
                    logger.error(f"❌ {test_case['name']} 测试失败: 无效响应格式")

            except Exception as e:
                response_time = time.time() - start_time
                test_result = {
                    "test_name": test_case["name"],
                    "success": False,
                    "response_time": response_time,
                    "error": str(e),
                }
                logger.error(f"❌ {test_case['name']} 测试失败: {e}")

            results["test_cases"].append(test_result)

        # 计算汇总统计
        if successful_tests > 0:
            results["summary"]["successful_tests"] = successful_tests
            results["summary"]["average_response_time"] = total_response_time / len(
                self.test_cases
            )
            results["summary"]["average_score"] = total_score / successful_tests

            # 计算平均标签匹配率
            total_tag_accuracy = sum(
                tc.get("tag_match_rate", 0)
                for tc in results["test_cases"]
                if tc.get("success", False)
            )
            results["summary"]["tag_accuracy"] = total_tag_accuracy / successful_tests

        return results

    def _calculate_tag_similarity(
        self, generated_tags: list, expected_tags: list
    ) -> float:
        """计算标签相似度"""
        if not generated_tags or not expected_tags:
            return 0.0

        # 计算交集
        generated_set = set(generated_tags)
        expected_set = set(expected_tags)
        intersection = generated_set.intersection(expected_set)

        # 计算相似度 (交集 / 并集)
        union = generated_set.union(expected_set)
        return len(intersection) / len(union) if union else 0.0

    async def run_comprehensive_test(self) -> None:
        """运行综合测试"""
        logger.info("🔍 开始 DeepSeek V3 Ensemble 综合测试")

        # 检查基础配置
        logger.info("📊 测试配置:")
        logger.info(f"   LiteLLM代理: {settings.LITELLM_PROXY_URL}")
        logger.info(f"   默认模型: {settings.DEFAULT_LLM_MODEL}")
        logger.info(f"   测试用例数: {len(self.test_cases)}")

        # 运行性能测试
        performance_results = await self.test_model_performance()

        # 输出测试报告
        self._generate_test_report(performance_results)

    def _generate_test_report(self, results: dict[str, Any]) -> None:
        """生成测试报告"""
        logger.info("\n" + "=" * 60)
        logger.info("📊 DeepSeek V3 Ensemble 标签处理测试报告")
        logger.info("=" * 60)

        summary = results["summary"]

        logger.info("🎯 测试概览:")
        logger.info(f"   总测试数: {summary['total_tests']}")
        logger.info(f"   成功测试: {summary['successful_tests']}")
        logger.info(
            f"   成功率: {summary['successful_tests'] / summary['total_tests']:.1%}"
        )

        if summary["successful_tests"] > 0:
            logger.info("\n⚡ 性能指标:")
            logger.info(f"   平均响应时间: {summary['average_response_time']:.2f}秒")
            logger.info(f"   平均质量评分: {summary['average_score']:.1f}/5.0")
            logger.info(f"   标签准确率: {summary['tag_accuracy']:.1%}")

            logger.info("\n📝 详细结果:")
            for test_case in results["test_cases"]:
                if test_case["success"]:
                    result = test_case["result"]
                    logger.info(f"   ✅ {test_case['test_name']}:")
                    logger.info(f"      标题: {result.get('optimized_title', 'N/A')}")
                    logger.info(
                        f"      描述: {result.get('brief_description', 'N/A')[:50]}..."
                    )
                    logger.info(f"      标签: {result.get('tags', [])}")
                    logger.info(f"      评分: {result.get('score', 'N/A')}")
                    logger.info(
                        f"      阅读时间: {result.get('reading_time_minutes', 'N/A')}分钟"
                    )
                    logger.info(f"      响应时间: {test_case['response_time']:.2f}秒")
                else:
                    logger.info(
                        f"   ❌ {test_case['test_name']}: {test_case.get('error', 'Unknown error')}"
                    )

        # 保存详细结果到文件
        output_file = (
            Path(__file__).parent.parent
            / "_output"
            / "tmp"
            / "deepseek_labels_test_results.json"
        )
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        logger.info(f"\n💾 详细结果已保存到: {output_file}")
        logger.info("=" * 60)


async def main():
    """主函数"""
    try:
        test_suite = DeepSeekLabelsTestSuite()
        await test_suite.run_comprehensive_test()

    except Exception as e:
        logger.error(f"测试执行失败: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
