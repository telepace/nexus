---
trigger: model_decision
description: 
globs: frontend/**
---
description: Frontend Development Code Guidelines

- When writing frontend code, prioritize using Next.js as the framework
- Prefer the combination of shadcn/ui and Tailwind(v4) CSS for UI components, Zustand state management.
- Do not use Next.js API routes (/api); always use backend APIs for all API requests
- If the backend API is unclear or in question, use the MCP api docs tool to find the relevant API definition- 
- The UI library should be isolated from the code base and placed in components/ui
- Try to ensure that the versions of react and next are not changed
- Finally, it is necessary to ensure that make frontend-all passes
