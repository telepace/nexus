import logging

from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.db_factory import create_db_engine
from app.models import (
    Prompt,
    PromptType,
    PromptVersion,
    Tag,
    User,
    UserCreate,
    Visibility,
)

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
            "input_vars": [
                {"name": "content", "description": "文章内容", "required": True}
            ],
            "tags": ["思维拓展", "学习辅助"],
        },
    ]

    for prompt_data in default_prompts:
        existing_prompt = session.exec(
            select(Prompt).where(Prompt.name == prompt_data["name"])
        ).first()
        if not existing_prompt:
            # 提取标签名称
            tag_names = list(prompt_data.pop("tags", []))

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

    # 提交所有更改
    session.commit()
    logger.info("Database initialization completed successfully")
