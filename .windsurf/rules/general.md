---
trigger: always_on
description: 
globs: 
---
description: Prefer using uv and pnpm for terminal operations, and always set proxy env vars for install commands. Chat responses should be in Chinese; code and comments in English.
globs: 
alwaysApply: true

- Prefer using 'uv' for Python-related operations and 'pnpm' for Node.js tasks in terminal commands.
- For commands that strongly rely on the external network, prepend with:
  `export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890;`
- All code comments, prompts, and code completions should be in English.
- All Chat replies should be in Chinese.
- use `docker compose` not `docker-compose`
- You should focus on four directories: the back-end (api) is `backend/`, the front-end (web) is `frontend/`, the management back-end (admin) is `admin/`, and the browser plugin is `extension/`
