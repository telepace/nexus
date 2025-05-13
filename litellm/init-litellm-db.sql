-- 创建 LiteLLM 数据库（如果不存在）
CREATE DATABASE litellm;

-- 授予 postgres 用户对 litellm 数据库的所有权限
GRANT ALL PRIVILEGES ON DATABASE litellm TO postgres; 