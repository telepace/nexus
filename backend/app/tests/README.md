# Backend Tests

此目录包含后端 API 测试以及用于测试隔离的工具。

## 测试数据库隔离

为了避免测试污染真实的开发或生产数据库，我们实现了测试数据库隔离机制。当运行测试时：

1. 自动创建一个专用的测试数据库（默认名为 `{POSTGRES_DB}_test`，例如 `app_test`）
2. 直接使用 SQLModel.metadata.create_all() 创建所有表结构，避免使用 Alembic 迁移
3. 测试在此隔离环境中运行
4. 测试完成后，清理测试数据
5. 测试完成后，删除测试数据库

这确保了：
- 测试不会影响开发/生产数据
- 每次测试都在干净的环境中运行
- 测试失败不会污染真实数据
- 启用了完整的隔离

## 实现方式

测试数据库隔离的实现包括以下几个关键组件：

1. **test_db.py** - 测试数据库管理工具，提供了：
   - 创建测试数据库（基于主数据库名称加 `_test` 后缀）
   - 创建所有表结构
   - 测试完成后清理并删除测试数据库

2. **conftest.py** - pytest 配置：
   - 使用 `setup_test_environment` fixture 自动设置测试环境
   - 测试前创建测试数据库并初始化表结构
   - 测试后清理并删除测试数据库
   - 测试期间替换全局数据库引擎，指向测试数据库

3. **启动脚本** - 在 `scripts/test.sh` 和 `scripts/tests-start.sh` 中：
   - 设置 `TESTING=true` 环境变量，标记测试环境
   - 可选择设置 `SKIP_MIGRATIONS=true` 环境变量（现在默认跳过 Alembic 迁移）

## 运行测试

要运行后端测试，使用以下命令：

```bash
make backend-test
```

或直接：

```bash
cd backend
bash scripts/tests-start.sh
```

这两个命令都会自动设置必要的测试环境变量，创建测试数据库，并执行测试。

## 测试工具

- `tests/utils/test_db.py`: 测试数据库管理工具
- `tests/conftest.py`: pytest 配置和测试 fixtures
- `tests_pre_start.py`: 测试前环境准备

## 手动控制测试数据库

如需手动控制测试数据库（例如，在测试后保留数据库），可以修改 `test_db.py` 中的 `teardown_test_db` 函数，注释掉删除数据库的步骤。

## 注意事项

- 确保 PostgreSQL 用户有创建和删除数据库的权限
- 测试环境通过 `TESTING=true` 环境变量标识
- 测试数据库名称为原数据库名称加 `_test` 后缀
- 我们使用 SQLModel.metadata.create_all() 创建表结构，而不是使用 Alembic 迁移
- 如果需要迁移，您可以修改 `apply_migrations` 函数来适应项目的 Alembic 配置 