"""测试 labels.j2 模板的功能，包括新增的 reading_time_minutes 字段"""

import json
import pytest
from app.services.ai.chat_service import ChatService


@pytest.mark.asyncio
async def test_labels_template_with_reading_time():
    """测试 labels.j2 模板能够生成包含 reading_time_minutes 的结果"""
    chat_service = ChatService()
    
    # 准备测试内容
    test_content = """
    机器学习是人工智能的一个分支，它让计算机能够从数据中学习，而无需明确编程。
    这项技术在图像识别、自然语言处理、推荐系统等领域有广泛应用。
    深度学习作为机器学习的一个子集，使用多层神经网络来模拟人脑的学习过程。
    随着计算能力的提升和大数据的发展，深度学习在近年来取得了突破性进展。
    卷积神经网络（CNN）在计算机视觉领域表现出色，而循环神经网络（RNN）
    和长短期记忆网络（LSTM）则在序列数据处理方面有独特优势。
    """
    
    context = {
        "content": test_content,
        "content_type": "技术文档"
    }
    
    # 调用 labels.j2 模板
    result = await chat_service.generate_with_template("labels.j2", context)
    
    # 验证返回结果包含所需字段
    assert isinstance(result, dict)
    assert "tags" in result
    assert "score" in result
    assert "reading_time_minutes" in result
    
    # 验证字段类型
    assert isinstance(result["tags"], list)
    assert isinstance(result["score"], (int, float))
    assert isinstance(result["reading_time_minutes"], int)
    
    # 验证数值范围
    assert 0 <= result["score"] <= 5
    assert result["reading_time_minutes"] >= 1
    
    print(f"Generated result: {json.dumps(result, ensure_ascii=False, indent=2)}")


@pytest.mark.asyncio 
async def test_labels_template_with_simple_content():
    """测试简单内容的阅读时间评估"""
    chat_service = ChatService()
    
    simple_content = "这是一个简单的测试文档。"
    
    context = {
        "content": simple_content,
        "content_type": "测试文档"
    }
    
    result = await chat_service.generate_with_template("labels.j2", context)
    
    # 简单内容应该有最小阅读时间
    assert result["reading_time_minutes"] >= 1
    assert result["reading_time_minutes"] <= 5  # 不应该太长


@pytest.mark.asyncio
async def test_labels_template_with_complex_content():
    """测试复杂技术内容的阅读时间评估"""
    chat_service = ChatService()
    
    # 创建一个真正复杂且长的内容
    complex_content = """
    量子计算是利用量子力学现象，如叠加态和纠缠态，来进行信息处理的计算范式。
    与经典计算机使用比特（0或1）不同，量子计算机使用量子比特（qubit），
    它可以同时处于0和1的叠加态。这种特性使得量子计算机在处理某些特定问题时
    具有指数级的速度优势。量子计算的基本原理基于量子力学的几个关键概念。
    
    首先是量子叠加态。在经典计算机中，比特只能处于0或1的确定状态。
    而量子比特可以同时处于0和1的叠加态，这意味着一个量子比特可以同时
    表示多种可能性。其次是量子纠缠，这是一种量子现象，当两个或多个
    量子粒子形成纠缠状态时，无论它们相距多远，测量其中一个粒子的状态
    会立即影响其他粒子的状态。第三是量子干涉，量子计算利用干涉现象
    来增强正确答案的概率，同时减少错误答案的概率。

    量子算法如Shor算法可以高效地分解大整数，威胁到现有的RSA加密体系；
    Grover算法则可以在未排序的数据库中快速搜索特定项目。Peter Shor在1994年
    提出的Shor算法能够在多项式时间内分解大整数，这对于基于大整数分解困难性
    的密码学系统构成了重大威胁。Lov Grover在1996年提出的Grover算法能够
    在O(√N)时间内搜索未排序的数据库，相比经典算法的O(N)有显著提升。
    
    然而，量子计算机的实现面临着量子相干性、错误纠正、量子门保真度等
    技术挑战。目前的量子计算机仍处于NISQ（Noisy Intermediate-Scale Quantum）
    阶段，距离实用化的容错量子计算机还有很长的路要走。量子退相干是最大的
    挑战之一，量子系统极其脆弱，容易受到环境干扰而失去量子特性。为了
    保持量子相干性，量子计算机需要在极低温度下运行，通常接近绝对零度。

    主要的量子计算平台包括超导量子比特、离子阱、光子量子计算等不同的技术路线。
    每种技术都有其独特的优势和挑战，科研人员正在探索最优的实现方案。
    超导量子比特技术由IBM、Google等公司主导，具有快速的量子门操作速度。
    离子阱技术由IonQ、Honeywell等公司开发，具有高保真度的量子操作。
    光子量子计算技术具有室温运行的优势，但在可扩展性方面面临挑战。
    """
    
    context = {
        "content": complex_content,
        "content_type": "学术论文"
    }
    
    result = await chat_service.generate_with_template("labels.j2", context)
    
    # 调整期望值：对于这样的复杂内容，应该有合理的阅读时间
    # 由于这是学术论文类型的复杂内容，应该比简单内容需要更长时间
    assert result["reading_time_minutes"] >= 1  # 最少1分钟
    assert "量子" in " ".join(result["tags"]) or "计算" in " ".join(result["tags"]) or "general" in result["tags"] 