#!/bin/bash

# 清除代理环境变量
export https_proxy=
export http_proxy=
export all_proxy=

# 打印当前工作目录
echo "当前工作目录: $(pwd)"

# 检查数据库连接
echo "测试数据库连接..."
python -c "from app.core.config import settings; from sqlalchemy import create_engine, text; db_url = str(settings.SQLALCHEMY_DATABASE_URI); print(f'数据库连接字符串: {db_url}'); engine = create_engine(db_url); conn = engine.connect(); result = conn.execute(text('SELECT 1')); print(f'数据库连接成功: {result.fetchone()}'); conn.close()"

# 如果上一条命令成功执行，启动后端
if [ $? -eq 0 ]; then
  echo "启动后端服务..."
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
  echo "数据库连接失败，无法启动后端服务"
  exit 1
fi 