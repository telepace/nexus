import logging

from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.db_factory import create_db_engine
from app.models import (
    ProcessingJob,
    Project,
    Prompt,
    PromptType,
    PromptVersion,
    Tag,
    User,
    UserCreate,
    Visibility,
)
from app.models.content import AIConversation, ContentItem
from app.utils.timezone import now_utc

# Get the logger
logger = logging.getLogger("app.db")

# Use db_factory to create the engine
engine = create_db_engine()


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def print_db_connection_info(db_url: str | None = None) -> None:
    """Prints database connection information.

    This function retrieves and logs the database connection details, ensuring that
    sensitive information such as passwords is obscured for security reasons. It
    also provides additional configuration details specific to different database
    types, such as Supabase.

    Args:
        db_url: Optional database URL to use instead of settings.SQLALCHEMY_DATABASE_URI
    """
    url = db_url or str(settings.SQLALCHEMY_DATABASE_URI)

    # Hide password information for security
    safe_url = url
    if "@" in url:
        # Find the username and password part and replace the password with ****
        userpass_part = url.split("@")[0]
        if ":" in userpass_part:
            username = userpass_part.split("://")[1].split(":")[0]
            safe_url = url.replace(
                userpass_part, f"{url.split('://')[0]}://{username}:****"
            )

    # Print related configuration information
    logger.info("-" * 50)
    logger.info("Database Connection Information:")
    logger.info(f"Database URL: {safe_url}")
    logger.info(f"Database Type: {settings.DATABASE_TYPE}")

    if settings.DATABASE_TYPE == "supabase":
        logger.info(f"Supabase Pool Mode: {settings.SUPABASE_DB_POOL_MODE}")
        logger.info(
            f"Supabase Port: {settings.SUPABASE_DB_PORT or (6543 if settings.SUPABASE_DB_POOL_MODE == 'transaction' else 5432)}"
        )

    logger.info("-" * 50)


def init_db(session: Session, db_url: str | None = None) -> None:
    """Initialize the database by setting up initial data."""
    print_db_connection_info(db_url)

    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    # 创建超级用户
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        # 检查是否配置了自定义的用户ID
        custom_user_id = None
        if settings.FIRST_SUPERUSER_ID:
            try:
                import uuid

                custom_user_id = uuid.UUID(settings.FIRST_SUPERUSER_ID)
                logger.info(f"Using custom user ID: {custom_user_id}")
            except ValueError:
                logger.warning(
                    f"Invalid FIRST_SUPERUSER_ID format: {settings.FIRST_SUPERUSER_ID}, using auto-generated ID"
                )

        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(
            session=session, user_create=user_in, user_id=custom_user_id
        )
        if user is None:
            raise RuntimeError(
                f"Failed to create superuser: {settings.FIRST_SUPERUSER}"
            )
        logger.info(f"Created superuser: {settings.FIRST_SUPERUSER} with ID: {user.id}")

    # Ensure user is not None before proceeding
    if user is None:
        raise RuntimeError("Failed to create or find superuser")

    logger.info(f"Superuser ready: {settings.FIRST_SUPERUSER} with ID: {user.id}")

    # 创建默认标签
    default_tags = [
        {
            "name": "文章分析",
            "description": "用于分析文章内容的提示词",
            "color": "#3B82F6",
        },
        {
            "name": "内容理解",
            "description": "帮助理解复杂内容的提示词",
            "color": "#10B981",
        },
        {
            "name": "学习辅助",
            "description": "辅助学习和记忆的提示词",
            "color": "#F59E0B",
        },
        {
            "name": "思维拓展",
            "description": "拓展思维和讨论的提示词",
            "color": "#8B5CF6",
        },
    ]

    created_tags = {}
    for tag_data in default_tags:
        existing_tag = session.exec(
            select(Tag).where(Tag.name == tag_data["name"])
        ).first()
        if not existing_tag:
            tag = Tag(**tag_data)
            session.add(tag)
            session.flush()
            created_tags[tag_data["name"]] = tag
            logger.info(f"Created tag: {tag_data['name']}")
        else:
            created_tags[tag_data["name"]] = existing_tag
            logger.info(f"Tag already exists: {tag_data['name']}")

    # 创建默认提示词
    default_prompts = [
        {
            "name": "总结全文",
            "description": "快速为当前文章生成一段简洁明了的核心内容摘要，帮助用户在短时间内把握文章主旨和关键信息。",
            "content": """请将以下文章浓缩成一段150-250字的摘要，突出其核心论点、主要发现/信息和结论。摘要应清晰、连贯，避免不必要的细节和专业术语（除非是文章核心概念）。

目标是快速理解"这篇文章讲了什么？"以及"最重要的信息是什么？"

文章内容：
{content}

请提供简洁明了的摘要：""",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": False,
            "input_vars": [
                {"name": "content", "description": "文章内容", "required": True}
            ],
            "tags": ["文章分析", "内容理解"],
        },
        {
            "name": "提取核心要点",
            "description": "从文章中识别并列出最重要的几个核心观点、论据、数据或洞察，以项目符号或编号列表的形式呈现，方便用户快速浏览和记忆。",
            "content": """请从以下文章中提取3-7个最核心的要点。每个要点应简明扼要，能独立表达一个清晰的观点或信息。请使用项目符号列表（bullet points）或编号列表（numbered list）格式输出。

目标是结构化地展示文章的"精华骨架"。

文章内容：
{content}

请提取核心要点：""",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": False,
            "input_vars": [
                {"name": "content", "description": "文章内容", "required": True}
            ],
            "tags": ["文章分析", "学习辅助"],
        },
        {
            "name": "用大白话解释",
            "description": "当用户圈选文章中的特定词语、句子或段落时，或针对全文，用通俗易懂、简单明了的语言解释其含义，尤其适用于复杂概念、专业术语或晦涩难懂的表达。",
            "content": """请用简单易懂的语言解释以下选定文本。假设解释对象是对该领域不熟悉的人。可以使用类比、简化示例等方式来帮助理解。

目标是帮助用户"扫清理解障碍"。

需要解释的内容：
{content}

请用大白话解释：""",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": False,
            "input_vars": [
                {"name": "content", "description": "需要解释的内容", "required": True}
            ],
            "tags": ["内容理解", "学习辅助"],
        },
        {
            "name": "生成讨论问题",
            "description": "基于文章内容，生成若干具有启发性的开放式问题，帮助用户深入思考文章主题、检验理解程度，或作为后续讨论、研究的起点。",
            "content": """请根据以下文章内容，提出3-5个能激发深入思考的讨论问题。这些问题应鼓励批判性思维，探讨文章的潜在含义、局限性或不同观点。

问题可以涉及：
- 文章观点的延伸
- 对不同情境的应用
- 潜在的反驳观点
- 作者未明确说明的假设

目标是"促进深度思考和互动"。

文章内容：
{content}

请生成讨论问题：""",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": False,
            "input_vars": [
                {"name": "content", "description": "文章内容", "required": True}
            ],
            "tags": ["思维拓展", "学习辅助"],
        },
        # 新增启用的 prompt
        {
            "name": "生成摘要",
            "description": "为内容生成简洁的摘要",
            "content": "请为以下内容生成一个简洁明了的摘要，突出主要观点和关键信息：\n\n{content}",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": True,
            "input_vars": [
                {"name": "content", "description": "内容", "required": True}
            ],
            "tags": ["文章分析", "内容理解"],
        },
        {
            "name": "提取要点",
            "description": "提取内容中的关键要点",
            "content": "请从以下内容中提取关键要点，以清晰的列表形式呈现：\n\n{content}",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": True,
            "input_vars": [
                {"name": "content", "description": "内容", "required": True}
            ],
            "tags": ["文章分析", "学习辅助"],
        },
        {
            "name": "生成问题",
            "description": "基于内容生成思考问题",
            "content": "基于以下内容，生成一些深入思考的问题，帮助更好地理解和分析：\n\n{content}",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": True,
            "input_vars": [
                {"name": "content", "description": "内容", "required": True}
            ],
            "tags": ["思维拓展", "学习辅助"],
        },
        {
            "name": "深度洞察",
            "description": "提供深度分析和洞察",
            "content": "请对以下内容进行深度分析，提供有价值的洞察和观点：\n\n{content}",
            "type": PromptType.TEMPLATE,
            "visibility": Visibility.PUBLIC,
            "enabled": True,
            "input_vars": [
                {"name": "content", "description": "内容", "required": True}
            ],
            "tags": ["文章分析", "思维拓展"],
        },
    ]

    for prompt_data in default_prompts:
        existing_prompt = session.exec(
            select(Prompt).where(Prompt.name == prompt_data["name"])
        ).first()
        if not existing_prompt:
            # 提取标签名称
            tag_names = list(prompt_data.pop("tags", []))  # type: ignore

            # 创建提示词
            prompt = Prompt(**prompt_data, created_by=user.id)
            session.add(prompt)
            session.flush()  # 获取ID但不提交事务

            # 添加标签关联
            for tag_name in tag_names:
                tag_name_str = str(tag_name)
                if tag_name_str in created_tags:
                    prompt.tags.append(created_tags[tag_name_str])

            # 创建初始版本
            version = PromptVersion(
                prompt_id=prompt.id,
                version=1,
                content=prompt.content,
                input_vars=prompt.input_vars,
                created_by=user.id,
                change_notes="初始版本",
            )
            session.add(version)

            logger.info(f"Created prompt: {prompt_data['name']}")
        else:
            logger.info(f"Prompt already exists: {prompt_data['name']}")

    # 创建测试内容数据
    test_contents = [
        {
            "type": "pdf",
            "source_uri": "https://arxiv.org/pdf/2301.00234.pdf",
            "title": "Attention Is All You Need - Transformer架构详解",
            "summary": "这是一篇关于Transformer架构的经典论文，详细介绍了注意力机制的工作原理和应用。",
            "content_text": """# Attention Is All You Need

## 摘要
我们提出了一种新的简单网络架构——Transformer，它完全基于注意力机制，完全摒弃了循环和卷积。在两个机器翻译任务上的实验表明，这些模型在质量上更优越，同时更易于并行化，训练时间显著减少。

## 1. 引言
循环神经网络，特别是长短期记忆网络（LSTM）和门控循环单元（GRU），已经被确立为序列建模和转换问题（如语言建模和机器翻译）的最先进方法。

## 2. 背景
减少顺序计算的目标也构成了扩展神经GPU、ByteNet和ConvS2S的基础，它们都使用卷积神经网络作为基本构建块，并行计算所有输入和输出位置的隐藏表示。

## 3. 模型架构
大多数竞争性神经序列转换模型都具有编码器-解码器结构。在这里，编码器将符号表示的输入序列映射到连续表示的序列。给定z，解码器然后一次生成一个元素的输出序列。

### 3.1 编码器和解码器堆栈
**编码器：** 编码器由N=6个相同层的堆栈组成。每层有两个子层。第一个是多头自注意力机制，第二个是简单的位置全连接前馈网络。

**解码器：** 解码器也由N=6个相同层的堆栈组成。除了每个编码器层中的两个子层之外，解码器还插入第三个子层，该子层对编码器堆栈的输出执行多头注意力。

### 3.2 注意力
注意力函数可以描述为将查询和一组键值对映射到输出，其中查询、键、值和输出都是向量。输出计算为值的加权和，其中分配给每个值的权重由查询与相应键的兼容性函数计算。

#### 3.2.1 缩放点积注意力
我们称我们的特定注意力为"缩放点积注意力"。输入包括维度dk的查询和键，以及维度dv的值。我们计算查询与所有键的点积，将每个除以√dk，并应用softmax函数来获得值的权重。

#### 3.2.2 多头注意力
我们发现，与其使用dmodel维度的键、值和查询执行单个注意力函数，不如将查询、键和值线性投影h次到dk、dk和dv维度是有益的。

## 4. 为什么选择自注意力
在本节中，我们将自注意力层的各个方面与循环层和卷积层进行比较，这些层通常用于将一个可变长度的符号表示序列映射到另一个等长序列。

## 5. 训练
本节描述了我们模型的训练制度。

### 5.1 训练数据和批处理
我们在标准的WMT 2014英德数据集上进行训练，该数据集包含大约450万个句子对。

### 5.2 硬件和调度
我们在一台配备8个NVIDIA P100 GPU的机器上训练我们的模型。

## 6. 结果
在本节中，我们展示了Transformer在机器翻译、英语选区解析和其他任务上的结果。

### 6.1 机器翻译
在WMT 2014英德翻译任务上，大型Transformer模型（表2中的Transformer（big））的性能优于之前报告的最佳模型（包括集成模型）超过2.0 BLEU，建立了新的最先进的BLEU分数28.4。

## 7. 结论
在这项工作中，我们提出了Transformer，这是第一个完全基于注意力的序列转换模型，用多头自注意力取代了编码器-解码器架构中最常用的循环层。""",
            "processing_status": "completed",
        },
        {
            "type": "url",
            "source_uri": "https://zh.wikipedia.org/wiki/人工智能",
            "title": "人工智能 - 维基百科",
            "summary": "人工智能（AI）是由机器展现的智能，与人类和动物展现的自然智能形成对比。",
            "content_text": """# 人工智能

人工智能（英语：Artificial Intelligence，缩写为AI）亦称机器智能，指由人制造出来的机器所表现出来的智能。通常人工智能是指通过普通计算机程序来呈现人类智能的技术。

## 定义
人工智能的定义可以分为两部分，即"人工"和"智能"。"人工"比较好理解，争议性也不大。有时我们会要考虑什么是人力所能及制造的，或者人自身的智能程度有没有高到可以创造人工智能的地步，等等。但总的来说，"人工系统"就是通常意义下的人工系统。

## 历史
人工智能的概念最早可以追溯到古代神话和哲学思想。然而，现代人工智能的发展始于20世纪中叶。

### 早期发展（1940-1960年代）
- 1943年：沃伦·麦卡洛克和沃尔特·皮茨发表了第一篇关于人工神经网络的论文
- 1950年：艾伦·图灵发表了著名的论文《计算机器与智能》，提出了图灵测试
- 1956年：达特茅斯会议，约翰·麦卡锡首次提出"人工智能"这一术语

### 第一次AI冬天（1970年代）
由于早期过于乐观的预期与实际进展的差距，AI研究遭遇了第一次低潮期。

### 专家系统时代（1980年代）
专家系统的兴起带来了AI的第二次繁荣，但随后又遭遇了第二次AI冬天。

### 机器学习复兴（1990年代至今）
随着计算能力的提升和大数据的出现，机器学习，特别是深度学习，推动了AI的快速发展。

## 主要技术领域

### 机器学习
机器学习是人工智能的一个分支，它使计算机能够在没有明确编程的情况下学习。

#### 监督学习
使用标记的训练数据来学习从输入到输出的映射函数。

#### 无监督学习
从未标记的数据中发现隐藏的模式或结构。

#### 强化学习
通过与环境的交互来学习最优行为策略。

### 深度学习
深度学习是机器学习的一个子集，使用多层神经网络来模拟人脑的工作方式。

### 自然语言处理
使计算机能够理解、解释和生成人类语言的技术。

### 计算机视觉
使计算机能够从图像或视频中获取有意义信息的技术。

### 机器人学
设计、构造、操作和使用机器人的技术。

## 应用领域

### 医疗健康
- 医学影像诊断
- 药物发现
- 个性化治疗
- 健康监测

### 交通运输
- 自动驾驶汽车
- 交通流量优化
- 智能交通系统

### 金融服务
- 算法交易
- 风险评估
- 欺诈检测
- 客户服务

### 教育
- 个性化学习
- 智能辅导系统
- 自动评分

### 娱乐
- 游戏AI
- 内容推荐
- 虚拟现实

## 伦理和社会影响

### 就业影响
AI的发展可能会导致某些工作岗位的消失，但也会创造新的就业机会。

### 隐私和安全
AI系统的广泛应用引发了对个人隐私和数据安全的担忧。

### 算法偏见
AI系统可能会延续或放大现有的社会偏见。

### 自主武器
AI在军事领域的应用引发了关于自主武器系统的伦理争议。

## 未来展望
人工智能的未来发展方向包括：
- 通用人工智能（AGI）的实现
- 更好的人机交互
- AI的可解释性和透明度
- 更加安全和可靠的AI系统
- AI与其他技术的融合

## 结论
人工智能正在快速发展，并在各个领域产生深远影响。虽然面临诸多挑战，但AI技术的进步为人类社会带来了巨大的机遇和潜力。""",
            "processing_status": "completed",
        },
        {
            "type": "text",
            "source_uri": None,
            "title": "深度学习基础概念",
            "summary": "深度学习是机器学习的一个分支，使用多层神经网络来学习数据的复杂模式。",
            "content_text": """# 深度学习基础概念

深度学习是机器学习的一个子领域，它使用具有多个隐藏层的神经网络来学习数据的复杂表示。这种方法受到人脑神经网络结构的启发，能够自动学习数据的层次化特征表示。

## 1. 神经网络基础

### 1.1 人工神经元
人工神经元是神经网络的基本单元，它模拟生物神经元的工作原理：
- 接收多个输入信号
- 对输入进行加权求和
- 通过激活函数产生输出

### 1.2 多层感知机
多层感知机（MLP）是最简单的深度神经网络：
- 输入层：接收原始数据
- 隐藏层：进行特征变换（可以有多层）
- 输出层：产生最终预测结果

## 2. 激活函数

激活函数为神经网络引入非线性，使其能够学习复杂的模式：

### 2.1 常用激活函数
- **ReLU（修正线性单元）**：f(x) = max(0, x)
  - 优点：计算简单，缓解梯度消失问题
  - 缺点：可能导致神经元死亡

- **Sigmoid**：f(x) = 1/(1 + e^(-x))
  - 优点：输出范围在(0,1)，适合概率输出
  - 缺点：容易饱和，梯度消失

- **Tanh**：f(x) = (e^x - e^(-x))/(e^x + e^(-x))
  - 优点：输出范围在(-1,1)，零中心化
  - 缺点：仍然存在梯度消失问题

## 3. 反向传播算法

反向传播是训练神经网络的核心算法：

### 3.1 前向传播
1. 输入数据通过网络层层传递
2. 每层计算加权和并应用激活函数
3. 最终得到网络输出

### 3.2 损失计算
使用损失函数衡量预测值与真实值的差异：
- 回归问题：均方误差（MSE）
- 分类问题：交叉熵损失

### 3.3 反向传播
1. 计算输出层的梯度
2. 逐层向前传播梯度
3. 使用链式法则计算每个参数的梯度

### 3.4 参数更新
使用梯度下降算法更新网络参数：
- 随机梯度下降（SGD）
- Adam优化器
- RMSprop等

## 4. 深度学习架构

### 4.1 卷积神经网络（CNN）
专门用于处理图像数据：
- **卷积层**：提取局部特征
- **池化层**：降低维度，增强鲁棒性
- **全连接层**：进行最终分类

### 4.2 循环神经网络（RNN）
用于处理序列数据：
- **LSTM**：长短期记忆网络，解决长期依赖问题
- **GRU**：门控循环单元，简化的LSTM
- **双向RNN**：同时考虑前向和后向信息

### 4.3 Transformer
基于注意力机制的架构：
- **自注意力机制**：捕获序列内部的依赖关系
- **多头注意力**：并行处理不同类型的信息
- **位置编码**：为序列添加位置信息

## 5. 训练技巧

### 5.1 正则化技术
防止过拟合：
- **Dropout**：随机丢弃部分神经元
- **L1/L2正则化**：在损失函数中添加惩罚项
- **批量归一化**：标准化每层的输入

### 5.2 学习率调度
- **学习率衰减**：训练过程中逐渐降低学习率
- **余弦退火**：周期性调整学习率
- **预热策略**：开始时使用较小的学习率

### 5.3 数据增强
增加训练数据的多样性：
- 图像：旋转、翻转、缩放、裁剪
- 文本：同义词替换、回译
- 音频：时间拉伸、噪声添加

## 6. 深度学习的优势与挑战

### 6.1 优势
- **自动特征学习**：无需手工设计特征
- **强大的表示能力**：能够学习复杂的非线性映射
- **端到端训练**：整个系统可以联合优化
- **泛化能力强**：在大数据上表现优异

### 6.2 挑战
- **数据需求大**：通常需要大量标注数据
- **计算资源密集**：训练需要强大的硬件支持
- **黑盒性质**：模型决策过程难以解释
- **过拟合风险**：在小数据集上容易过拟合

## 7. 应用领域

### 7.1 计算机视觉
- 图像分类
- 目标检测
- 语义分割
- 人脸识别

### 7.2 自然语言处理
- 机器翻译
- 情感分析
- 问答系统
- 文本生成

### 7.3 语音处理
- 语音识别
- 语音合成
- 说话人识别

### 7.4 推荐系统
- 协同过滤
- 内容推荐
- 序列推荐

## 8. 未来发展方向

### 8.1 模型架构创新
- 更高效的注意力机制
- 神经架构搜索（NAS）
- 可微分编程

### 8.2 训练方法改进
- 自监督学习
- 元学习
- 联邦学习

### 8.3 应用拓展
- 科学计算
- 药物发现
- 气候建模
- 自动驾驶

## 结论

深度学习作为人工智能的重要分支，已经在众多领域取得了突破性进展。随着算法的不断改进、计算能力的提升和数据的积累，深度学习将继续推动人工智能技术的发展，为人类社会带来更多的创新和变革。

理解深度学习的基础概念对于从事相关研究和应用开发至关重要。通过掌握神经网络、激活函数、反向传播等核心概念，我们可以更好地设计和优化深度学习模型，解决实际问题。""",
            "processing_status": "completed",
        },
    ]

    # 创建测试内容项
    for content_data in test_contents:
        # 检查内容是否已存在
        existing_content = session.exec(
            select(ContentItem).where(ContentItem.title == content_data["title"])  # type: ignore
        ).first()

        if not existing_content:
            content_item = ContentItem(user_id=user.id, **content_data)  # type: ignore
            session.add(content_item)
            logger.info(f"Created test content: {content_data['title']}")  # type: ignore
        else:
            logger.info(f"Test content already exists: {content_data['title']}")  # type: ignore

    # 刷新以获取创建的内容项ID
    session.flush()

    # 创建默认项目数据
    default_projects = [
        {
            "title": "AI与机器学习研究",
            "description": "收集和整理人工智能、机器学习、深度学习相关的论文、文章和资料",
            "project_type": "research",
            "is_active": True,
            "ai_context": {
                "domain": "artificial_intelligence",
                "keywords": ["AI", "机器学习", "深度学习", "神经网络", "算法"],
                "focus_areas": ["理论研究", "技术应用", "行业趋势"],
            },
            "tag_id": created_tags["文章分析"].id
            if "文章分析" in created_tags
            else None,
        },
        {
            "title": "技术学习资料",
            "description": "编程、开发、技术教程等学习资料的收集整理",
            "project_type": "learning",
            "is_active": True,
            "ai_context": {
                "domain": "technology",
                "keywords": ["编程", "开发", "教程", "技术", "软件"],
                "focus_areas": ["基础知识", "实战技能", "最佳实践"],
            },
            "tag_id": created_tags["学习辅助"].id
            if "学习辅助" in created_tags
            else None,
        },
        {
            "title": "行业分析报告",
            "description": "收集和分析各行业的发展趋势、市场报告和商业洞察",
            "project_type": "analysis",
            "is_active": True,
            "ai_context": {
                "domain": "business",
                "keywords": ["行业分析", "市场趋势", "商业", "报告", "洞察"],
                "focus_areas": ["趋势分析", "竞争情报", "市场预测"],
            },
            "tag_id": created_tags["思维拓展"].id
            if "思维拓展" in created_tags
            else None,
        },
        {
            "title": "学术论文集",
            "description": "重要学术论文的收集、整理和研究笔记",
            "project_type": "academic",
            "is_active": True,
            "ai_context": {
                "domain": "academic",
                "keywords": ["论文", "学术", "研究", "理论", "方法"],
                "focus_areas": ["理论基础", "研究方法", "创新观点"],
            },
            "tag_id": created_tags["内容理解"].id
            if "内容理解" in created_tags
            else None,
        },
    ]

    created_projects = []
    for project_data in default_projects:
        existing_project = session.exec(
            select(Project).where(Project.title == project_data["title"])
        ).first()

        if not existing_project:
            project = Project(owner_id=user.id, **project_data)
            session.add(project)
            session.flush()  # 获取ID
            created_projects.append(project)
            logger.info(f"Created project: {project_data['title']}")
        else:
            created_projects.append(existing_project)
            logger.info(f"Project already exists: {project_data['title']}")

    # 为内容项分配项目并添加ProcessingJob数据
    content_items = session.exec(
        select(ContentItem).where(ContentItem.user_id == user.id)
    ).all()

    if content_items and created_projects:
        # 为每个内容项分配项目
        for i, content_item in enumerate(content_items):
            if content_item.project_id is None:  # 只为未分配项目的内容项分配
                # 根据内容类型分配合适的项目
                title_lower = content_item.title.lower() if content_item.title else ""
                if "transformer" in title_lower or "attention" in title_lower:
                    content_item.project_id = created_projects[0].id  # AI与机器学习研究
                elif content_item.title and (
                    "人工智能" in content_item.title
                    or "artificial intelligence" in title_lower
                ):
                    content_item.project_id = created_projects[0].id  # AI与机器学习研究
                elif content_item.title and "深度学习" in content_item.title:
                    content_item.project_id = created_projects[1].id  # 技术学习资料
                else:
                    content_item.project_id = created_projects[
                        i % len(created_projects)
                    ].id

                logger.info(f"Assigned project to content: {content_item.title}")

        # 为内容项添加ProcessingJob数据
        processing_jobs_data = [
            {
                "processor_name": "summarizer",
                "status": "completed",
                "parameters": {"model": "gpt-4", "max_length": 500, "language": "zh"},
                "result": {
                    "summary": "AI领域的重要突破性论文，提出了革命性的Transformer架构",
                    "key_points": ["注意力机制", "并行化", "编码器-解码器"],
                    "confidence": 0.95,
                },
                "started_at": now_utc(),
                "completed_at": now_utc(),
            },
            {
                "processor_name": "vectorizer",
                "status": "completed",
                "parameters": {"model": "text-embedding-ada-002", "dimensions": 1536},
                "result": {
                    "embedding_model": "text-embedding-ada-002",
                    "dimensions": 1536,
                    "chunks_processed": 15,
                    "success_rate": 1.0,
                },
                "started_at": now_utc(),
                "completed_at": now_utc(),
            },
            {
                "processor_name": "keyword_extractor",
                "status": "completed",
                "parameters": {"method": "tfidf", "max_keywords": 10},
                "result": {
                    "keywords": [
                        "transformer",
                        "attention",
                        "neural network",
                        "machine learning",
                        "deep learning",
                    ],
                    "scores": [0.95, 0.89, 0.87, 0.85, 0.82],
                    "confidence": 0.92,
                },
                "started_at": now_utc(),
                "completed_at": now_utc(),
            },
        ]

        for content_item in content_items[:3]:  # 只为前3个内容项添加处理任务
            for job_data in processing_jobs_data:
                # 检查是否已存在相同的处理任务
                existing_job = session.exec(
                    select(ProcessingJob).where(
                        ProcessingJob.content_item_id == content_item.id,
                        ProcessingJob.processor_name == job_data["processor_name"],
                    )
                ).first()

                if not existing_job:
                    job = ProcessingJob(content_item_id=content_item.id, **job_data)
                    session.add(job)
                    logger.info(
                        f"Created processing job: {job_data['processor_name']} for {content_item.title}"
                    )
                else:
                    logger.info(
                        f"Processing job already exists: {job_data['processor_name']} for {content_item.title}"
                    )

    # 创建测试AI对话数据
    # 获取第一个内容项用于关联对话
    first_content = session.exec(
        select(ContentItem).where(ContentItem.user_id == user.id)
    ).first()

    if first_content:
        test_conversations = [
            {
                "user_id": user.id,
                "content_item_id": first_content.id,
                "title": "关于Transformer架构的讨论",
                "ai_model_name": "gpt-4",
                "messages": [
                    {
                        "role": "user",
                        "content": "请帮我总结一下这篇关于Transformer的论文的核心要点",
                        "timestamp": "2024-01-15T10:00:00Z",
                    },
                    {
                        "role": "assistant",
                        "content": "这篇论文的核心要点包括：\n\n1. **革命性架构**：Transformer完全基于注意力机制，摒弃了传统的循环和卷积结构\n\n2. **并行化优势**：相比RNN/LSTM，Transformer可以并行处理序列，大大提高训练效率\n\n3. **自注意力机制**：通过缩放点积注意力和多头注意力，模型能够捕获序列内部的长距离依赖关系\n\n4. **编码器-解码器结构**：每个都由6层相同的层堆叠而成，包含自注意力和前馈网络\n\n5. **性能突破**：在机器翻译任务上达到了新的SOTA，BLEU分数达到28.4\n\n这个架构后来成为了现代大语言模型的基础。",
                        "timestamp": "2024-01-15T10:00:30Z",
                    },
                ],
                "summary": "讨论了Transformer论文的核心架构和创新点",
            },
            {
                "user_id": user.id,
                "content_item_id": None,  # 独立对话，不关联特定内容
                "title": "深度学习学习计划咨询",
                "ai_model_name": "claude-3",
                "messages": [
                    {
                        "role": "user",
                        "content": "我是一个编程初学者，想要学习深度学习，应该从哪里开始？",
                        "timestamp": "2024-01-16T14:30:00Z",
                    },
                    {
                        "role": "assistant",
                        "content": "作为编程初学者学习深度学习，我建议按以下路径：\n\n**第一阶段：基础准备（2-3个月）**\n1. Python编程基础\n2. NumPy、Pandas数据处理\n3. Matplotlib数据可视化\n4. 线性代数和概率统计基础\n\n**第二阶段：机器学习入门（1-2个月）**\n1. 使用Scikit-learn学习经典算法\n2. 理解监督学习、无监督学习概念\n3. 实践几个小项目\n\n**第三阶段：深度学习（3-4个月）**\n1. 学习PyTorch或TensorFlow\n2. 理解神经网络、反向传播\n3. 实践CNN、RNN项目\n4. 学习Transformer架构\n\n**推荐资源：**\n- 吴恩达的机器学习课程\n- Fast.ai实用深度学习课程\n- 《深度学习》花书\n\n记住：多动手实践，从简单项目开始！",
                        "timestamp": "2024-01-16T14:32:00Z",
                    },
                ],
                "summary": "为编程初学者制定深度学习学习路径",
            },
        ]

        for conv_data in test_conversations:
            # 检查对话是否已存在
            existing_conv = session.exec(
                select(AIConversation).where(AIConversation.title == conv_data["title"])  # type: ignore
            ).first()

            if not existing_conv:
                # 将messages转换为JSON字符串
                import json

                conv_data["messages"] = json.dumps(  # type: ignore
                    conv_data["messages"],  # type: ignore
                    ensure_ascii=False,
                )

                conversation = AIConversation(**conv_data)  # type: ignore
                session.add(conversation)
                logger.info(f"Created test conversation: {conv_data['title']}")  # type: ignore
            else:
                logger.info(f"Test conversation already exists: {conv_data['title']}")  # type: ignore

    # 提交所有更改
    session.commit()
    logger.info("Database initialization completed successfully")
