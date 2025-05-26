# Backend Scripts

这个目录包含了后端项目的各种脚本工具。

## 脚本说明

### prestart.sh
后端启动前的预处理脚本，用于准备后端环境。

**功能：**
- 等待数据库就绪
- 运行数据库迁移
- 初始化默认数据（管理员账户和基础 prompt）

**使用方法：**
```bash
./scripts/prestart.sh
```

### init-default-data.py
独立的数据初始化脚本，用于初始化默认的管理员账户和基础 prompt 数据。

**功能：**
- 创建默认管理员账户
- 创建基础标签
- 创建基础提示词

**使用方法：**
```bash
./scripts/init-default-data.py
# 或者使用 make 命令
make backend-init-data
```

### backup-and-reinit-data.py
数据备份和重新初始化脚本，用于备份现有数据并重新初始化默认数据。

**功能：**
- 备份现有数据到用户主目录的 `nexus_backups` 文件夹
- 清空数据库中的所有数据
- 重新初始化默认数据
- 需要用户确认才能执行

**使用方法：**
```bash
./scripts/backup-and-reinit-data.py
# 或者使用 make 命令
make backend-reinit-data
```

### test-init-data.py
测试环境的数据初始化脚本。

**使用方法：**
```bash
# 需要设置测试环境变量
TESTING=true TEST_MODE=true python scripts/test-init-data.py
```

## Make 命令

项目根目录的 Makefile 提供了便捷的命令：

```bash
# 初始化默认数据
make backend-init-data

# 备份并重新初始化数据（需要确认）
make backend-reinit-data

# 运行数据库迁移
make backend-migrate

# 创建新的数据库迁移
make backend-migration

# 连接到数据库
make backend-db-shell
```

## 默认数据说明

### 管理员账户
- **邮箱：** admin@telepace.cc（可通过 `FIRST_SUPERUSER` 环境变量自定义）
- **密码：** telepace（可通过 `FIRST_SUPERUSER_PASSWORD` 环境变量自定义）
- **用户ID：** 自动生成（可通过 `FIRST_SUPERUSER_ID` 环境变量指定固定UUID）
- **权限：** 超级用户

### 基础标签
1. **文章分析** - 用于分析文章内容的提示词
2. **内容理解** - 帮助理解复杂内容的提示词
3. **学习辅助** - 辅助学习和记忆的提示词
4. **思维拓展** - 拓展思维和讨论的提示词

### 基础提示词

#### 1. 总结全文 (Summarize Article)
**描述：** 快速为当前文章生成一段简洁明了的核心内容摘要，帮助用户在短时间内把握文章主旨和关键信息。

**标签：** 文章分析、内容理解

#### 2. 提取核心要点 (Extract Key Points)
**描述：** 从文章中识别并列出最重要的几个核心观点、论据、数据或洞察，以项目符号或编号列表的形式呈现，方便用户快速浏览和记忆。

**标签：** 文章分析、学习辅助

#### 3. 用大白话解释 (Explain in Simple Terms)
**描述：** 当用户圈选文章中的特定词语、句子或段落时，或针对全文，用通俗易懂、简单明了的语言解释其含义，尤其适用于复杂概念、专业术语或晦涩难懂的表达。

**标签：** 内容理解、学习辅助

#### 4. 生成讨论问题 (Generate Discussion Questions)
**描述：** 基于文章内容，生成若干具有启发性的开放式问题，帮助用户深入思考文章主题、检验理解程度，或作为后续讨论、研究的起点。

**标签：** 思维拓展、学习辅助

## 环境变量配置

### 管理员账户配置
```bash
# 管理员邮箱（必填）
FIRST_SUPERUSER=admin@telepace.cc

# 管理员密码（必填，最少8位）
FIRST_SUPERUSER_PASSWORD=telepace

# 管理员用户ID（可选，如果不设置则自动生成UUID）
# 示例：指定固定的UUID
FIRST_SUPERUSER_ID=e8ccbeed-f588-4b9a-95ca-000000000000
```

## 数据备份说明

### 备份位置
数据备份会保存在用户主目录下的 `nexus_backups` 文件夹中：
```
~/nexus_backups/
└── backup_20240101_120000/
    ├── backup_info.json      # 备份信息
    ├── users.json           # 用户数据
    ├── tags.json            # 标签数据
    ├── prompts.json         # 提示词数据
    └── prompt_versions.json # 提示词版本数据
```

### 备份内容
- **用户数据：** 包括邮箱、姓名、权限等（不包括密码哈希值）
- **标签数据：** 包括名称、描述、颜色等
- **提示词数据：** 包括名称、内容、类型、可见性等
- **版本数据：** 包括提示词的历史版本信息

## 注意事项

1. 所有脚本都会自动设置正确的 `PYTHONPATH`
2. 如果数据已存在，脚本会跳过创建，不会重复创建
3. 管理员密码可以通过环境变量 `FIRST_SUPERUSER_PASSWORD` 自定义
4. 管理员邮箱可以通过环境变量 `FIRST_SUPERUSER` 自定义
5. 管理员用户ID可以通过环境变量 `FIRST_SUPERUSER_ID` 指定固定UUID
6. 重新初始化操作会要求用户确认，并自动备份现有数据
7. 备份文件不包含密码哈希值，出于安全考虑

## 故障排除

如果遇到模块导入错误，请确保：
1. 在正确的目录下运行脚本（backend 目录）
2. Python 环境已正确安装所有依赖
3. 数据库连接配置正确

如果遇到权限错误，请确保：
1. 脚本文件具有执行权限（`chmod +x scripts/*.py`）
2. 数据库用户具有足够的权限

如果遇到UUID格式错误：
1. 确保 `FIRST_SUPERUSER_ID` 是有效的UUID格式
2. 可以使用在线UUID生成器生成有效的UUID 