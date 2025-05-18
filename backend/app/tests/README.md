# Backend Tests

此目录包含后端 API 测试以及用于测试隔离的工具。

## 测试数据库隔离

为了避免测试污染真实的开发或生产数据库，我们实现了测试数据库隔离机制。当运行测试时：

1. 自动创建一个专用的测试数据库（默认名为 `{POSTGRES_DB}_test`，例如 `app_test`）
2. 应用所有最新的数据库迁移到测试数据库
3. 测试在此隔离环境中运行
4. 测试完成后，清理测试数据
5. 可选择保留或删除测试数据库（默认会删除）

这确保了：
- 测试不会影响开发/生产数据
- 每次测试都在干净的环境中运行
- 测试失败不会污染真实数据

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
- 测试环境通过 `TESTING=true` 和 `TEST_MODE=true` 环境变量标识
- 测试数据库名称为原数据库名称加 `_test` 后缀 