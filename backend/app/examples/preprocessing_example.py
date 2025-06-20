"""
预处理系统使用示例
演示如何使用完整的6层预处理流水线
"""

import asyncio
import json
from datetime import datetime


async def basic_preprocessing_example():
    """基础预处理示例"""
    print("=== 基础预处理示例 ===")

    # 模拟内容
    sample_content = """
# 人工智能的发展与应用

人工智能（Artificial Intelligence, AI）是计算机科学的一个重要分支，旨在创建能够模拟人类智能行为的系统。

## 发展历程

人工智能的发展可以分为几个重要阶段：

1. **萌芽期（1950-1970）**：图灵测试的提出，早期符号主义AI的发展
2. **发展期（1970-1990）**：专家系统的兴起，知识工程的发展
3. **复兴期（1990-2010）**：机器学习算法的突破，统计学习理论的建立
4. **繁荣期（2010至今）**：深度学习革命，大模型时代的到来

## 核心技术

### 机器学习
机器学习是AI的核心技术之一，包括：
- 监督学习：通过标记数据进行训练
- 无监督学习：从未标记数据中发现模式
- 强化学习：通过与环境交互学习最优策略

### 深度学习
深度学习是机器学习的一个子领域，主要特点：
- 多层神经网络结构
- 自动特征提取能力
- 在图像、语音、文本等领域取得突破

## 应用领域

人工智能在各个领域都有广泛应用：

**计算机视觉**：图像识别、目标检测、人脸识别等
**自然语言处理**：机器翻译、文本生成、情感分析等
**语音技术**：语音识别、语音合成、对话系统等
**推荐系统**：个性化推荐、广告投放、内容分发等

## 未来展望

AI技术将继续快速发展，可能的发展方向包括：
- 通用人工智能（AGI）的实现
- AI与其他技术的深度融合
- 更强的可解释性和安全性
- 更广泛的产业应用

人工智能正在改变我们的生活和工作方式，但同时也带来了伦理、安全等方面的挑战，需要全社会共同关注和解决。
    """

    # 创建文档元数据
    # metadata = DocumentMetadata(
    #     title="人工智能的发展与应用",
    #     author="AI研究者",
    #     source_url="https://example.com/ai-article",
    #     content_type=ContentType.ARTICLE,
    #     language="zh",
    #     domain="technology"
    # )

    # 用户偏好设置
    # user_preferences = {
    #     "summary_style": "detailed",
    #     "target_length": 300,
    #     "focus_areas": ["技术", "应用", "发展趋势"]
    # }

    try:
        # 创建预处理管线（这里需要实际的ChatService实例）
        # chat_service = None  # 在实际使用中需要初始化ChatService
        # pipeline = PreprocessingPipeline(chat_service)

        # 如果没有ChatService，我们模拟预处理过程
        print("开始预处理...")
        print(f"原始内容长度: {len(sample_content)} 字符")
        print(f"估算单词数: {len(sample_content.split())} 词")

        # 模拟各层处理
        print("\n--- 第1层：输入层处理 ---")
        print("✓ 内容验证通过")
        print("✓ 内容规范化完成")

        print("\n--- 第2层：解析层处理 ---")
        print("✓ Markdown格式优化完成")
        print("✓ 结构化处理完成")

        print("\n--- 第3层：智能分段层处理 ---")
        # 简单分段演示
        sections = sample_content.split("\n\n")
        segments = [s.strip() for s in sections if s.strip()]
        print(f"✓ 内容分为 {len(segments)} 个段落")

        print("\n--- 第4层：AI初始化层处理 ---")
        print("✓ 摘要生成中...")
        print("✓ 关键点提取中...")
        print("✓ 标签生成中...")
        print("✓ 难度评估完成")

        print("\n--- 第5层：存储层处理 ---")
        print("✓ 数据持久化完成")

        print("\n--- 第6层：输出层处理 ---")
        print("✓ 结果格式化完成")

        # 模拟结果
        mock_result = {
            "content_id": "content_example_001",
            "status": "completed",
            "processed_at": datetime.now().isoformat(),
            "reading_time_minutes": 8,
            "difficulty_level": "intermediate",
            "content_quality_score": 0.85,
            "segments_count": len(segments),
            "has_images": False,
            "has_code": False,
            "estimated_words": len(sample_content.split()),
        }

        print("\n--- 预处理结果 ---")
        print(json.dumps(mock_result, indent=2, ensure_ascii=False))

        return mock_result

    except Exception as e:
        print(f"预处理失败: {str(e)}")
        return None


async def batch_preprocessing_example():
    """批量预处理示例"""
    print("\n=== 批量预处理示例 ===")

    # 多个内容项目
    content_items = [
        {
            "content": "这是第一篇关于机器学习的文章，介绍了基本概念和应用场景。机器学习是人工智能的重要分支...",
            "metadata": {
                "title": "机器学习入门",
                "content_type": "article",
                "language": "zh",
            },
        },
        {
            "content": "深度学习是机器学习的一个子领域，通过多层神经网络来模拟人脑的工作方式。近年来深度学习取得了突破性进展...",
            "metadata": {
                "title": "深度学习原理",
                "content_type": "article",
                "language": "zh",
            },
        },
        {
            "content": "自然语言处理（NLP）是人工智能的一个重要应用领域，致力于让计算机理解和生成人类语言...",
            "metadata": {
                "title": "自然语言处理概述",
                "content_type": "article",
                "language": "zh",
            },
        },
    ]

    print(f"批量处理 {len(content_items)} 个内容项目")

    # 模拟并行处理
    start_time = datetime.now()

    results = []

    for i, item in enumerate(content_items):
        print(f"\n处理项目 {i + 1}: {item['metadata']['title']}")

        # 模拟处理时间
        await asyncio.sleep(0.1)

        # 模拟结果
        result = {
            "index": i,
            "success": True,
            "content_id": f"batch_content_{i + 1:03d}",
            "title": item["metadata"]["title"],
            "word_count": len(item["content"].split()),
            "processing_time": 0.5 + i * 0.2,
        }

        results.append(result)
        print(f"✓ 处理完成: {result['content_id']}")

    end_time = datetime.now()
    total_time = (end_time - start_time).total_seconds()

    print("\n--- 批量处理结果 ---")
    print(f"总耗时: {total_time:.2f} 秒")
    print(f"成功处理: {len(results)} 个项目")

    for result in results:
        print(
            f"- {result['content_id']}: {result['title']} ({result['word_count']} 词)"
        )

    return results


async def advanced_preprocessing_example():
    """高级预处理示例 - 包含复杂内容"""
    print("\n=== 高级预处理示例 ===")

    # 复杂的技术文档
    complex_content = """
# 分布式系统设计原理

## 概述

分布式系统是由多个独立的计算机节点组成的系统，这些节点通过网络连接，协同工作以完成共同的任务。

## 核心挑战

### 1. 一致性问题

在分布式环境中，数据一致性是最大的挑战之一：

```python
# CAP定理示例
class DistributedSystem:
    def __init__(self):
        self.consistency = True    # 一致性
        self.availability = True   # 可用性
        self.partition_tolerance = True  # 分区容错性

    def cap_theorem(self):
        # 只能同时满足其中两个
        return "最多只能同时保证两个特性"
```

### 2. 网络分区

网络分区是分布式系统必须面对的现实：
- **脑裂问题**：网络分区导致集群分裂
- **数据同步**：分区恢复后的数据合并
- **故障检测**：区分网络故障和节点故障

### 3. 负载均衡

```bash
# Nginx负载均衡配置示例
upstream backend {
    server 192.168.1.100:8080 weight=3;
    server 192.168.1.101:8080 weight=2;
    server 192.168.1.102:8080 weight=1;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

## 设计模式

### 1. 主从模式（Master-Slave）

优点：
- 读写分离，提高性能
- 主节点负责写操作，从节点负责读操作
- 实现相对简单

缺点：
- 主节点单点故障
- 数据同步延迟

### 2. 对等模式（Peer-to-Peer）

特点：
1. 所有节点地位平等
2. 去中心化架构
3. 高可用性和容错性

应用场景：
- BitTorrent文件下载
- 区块链网络
- 分布式存储系统

## 一致性算法

### Raft算法

Raft是一种用于分布式系统的一致性算法：

1. **领导者选举**：在集群中选出一个领导者
2. **日志复制**：领导者向跟随者复制日志条目
3. **安全性**：保证已提交的日志不会丢失

关键特性：
- 强一致性保证
- 相比Paxos更容易理解和实现
- 广泛应用于现代分布式系统

### PBFT算法

实用拜占庭容错算法，适用于存在恶意节点的环境。

## 微服务架构

微服务是分布式系统设计的重要模式：

### 优势
- **独立部署**：每个服务可以独立开发和部署
- **技术多样性**：不同服务可以使用不同技术栈
- **故障隔离**：单个服务的故障不会影响整个系统

### 挑战
- **服务通信**：需要处理网络延迟和故障
- **数据管理**：分布式事务处理复杂
- **运维复杂性**：需要管理更多的服务实例

## 最佳实践

1. **设计原则**
   - 无状态服务设计
   - 幂等性保证
   - 优雅降级

2. **监控和观察**
   - 分布式链路追踪
   - 指标收集和告警
   - 日志聚合分析

3. **容错处理**
   - 超时和重试机制
   - 熔断器模式
   - 服务降级策略

## 总结

分布式系统设计需要在一致性、可用性和分区容错性之间做出权衡。选择合适的架构模式和算法，结合完善的监控和运维体系，才能构建出稳定可靠的分布式系统。

> "分布式系统的核心在于管理不确定性和复杂性" - 分布式系统专家
    """

    # 创建元数据
    # metadata = DocumentMetadata(
    #     title="分布式系统设计原理",
    #     author="系统架构师",
    #     source_type="technical_document",
    #     content_type=ContentType.DOCUMENTATION,
    #     language="zh",
    #     domain="computer_science"
    # )

    print("处理复杂技术文档...")
    print(f"内容长度: {len(complex_content)} 字符")
    print(f"包含代码块: {'```' in complex_content}")
    print(f"包含标题层级: {complex_content.count('#')} 个")

    # 模拟高级处理
    print("\n--- 高级特性处理 ---")
    print("✓ 代码块检测和格式化")
    print("✓ 多级标题结构分析")
    print("✓ 引用和列表处理")
    print("✓ 技术术语识别")
    print("✓ 复杂度评估")

    # 模拟分段结果
    sections = []
    current_section = ""
    lines = complex_content.split("\n")

    for line in lines:
        if line.startswith("##") and current_section:
            sections.append(current_section.strip())
            current_section = line + "\n"
        else:
            current_section += line + "\n"

    if current_section:
        sections.append(current_section.strip())

    print(f"\n智能分段结果: {len(sections)} 个章节")
    for i, section in enumerate(sections[:3]):  # 只显示前3个
        title = section.split("\n")[0].replace("#", "").strip()
        print(f"  {i + 1}. {title} ({len(section)} 字符)")

    result = {
        "content_id": "advanced_content_001",
        "content_type": "technical_document",
        "complexity": "advanced",
        "has_code": True,
        "has_diagrams": False,
        "sections_count": len(sections),
        "estimated_reading_time": 15,
        "technical_keywords": ["分布式", "一致性", "算法", "架构", "微服务"],
    }

    print("\n--- 高级处理结果 ---")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    return result


async def main():
    """主函数 - 运行所有示例"""
    print("🚀 预处理系统演示开始")
    print("=" * 60)

    # 运行各种示例
    await basic_preprocessing_example()
    await batch_preprocessing_example()
    await advanced_preprocessing_example()

    print("\n" + "=" * 60)
    print("✨ 预处理系统演示完成")

    # 性能统计
    print("\n--- 系统特性总结 ---")
    features = [
        "✓ 6层流水线架构",
        "✓ 多格式内容解析",
        "✓ 智能分段算法",
        "✓ AI驱动的内容分析",
        "✓ 批量并行处理",
        "✓ 可配置的用户偏好",
        "✓ 完整的错误处理",
        "✓ RESTful API接口",
    ]

    for feature in features:
        print(feature)


if __name__ == "__main__":
    asyncio.run(main())
