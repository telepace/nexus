#!/bin/bash

# 在生成客户端代码后执行的脚本，用于添加自定义类型的导出

set -e

ADMIN_CLIENT_INDEX="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )/admin/src/client/index.ts"

# 检查index.ts文件是否存在
if [ ! -f "$ADMIN_CLIENT_INDEX" ]; then
  echo "错误: Admin客户端index.ts文件不存在: $ADMIN_CLIENT_INDEX"
  exit 1
fi

# 检查文件中是否已包含导出语句
if grep -q "export \* from \"./types\"" "$ADMIN_CLIENT_INDEX"; then
  echo "Admin客户端index.ts已包含自定义类型导出，无需修改"
else
  # 添加额外的导出语句
  echo -e "export * from \"./types\"\nexport * from \"./utils\"" >> "$ADMIN_CLIENT_INDEX"
  echo "已向Admin客户端index.ts添加自定义类型和工具函数的导出"
fi

echo "✅ Admin客户端修复完成" 