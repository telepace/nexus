---
trigger: model_decision
description: Any operations involving issues and pulls on GitHub
globs: 
---
**Github Repository Resolution Logic:**

- If owner and repo are explicitly provided, use them.
- Otherwise, default to:
    
    owner: telepace
    
    repo: nexus
    
    (i.e., https://github.com/telepace/nexus)

- The language chosen for raising an issue: Chinese-
- Before writing the issue content, use mcp's thinking in combination with the current repository code and implementation to think about what the solution to the task is.
- Be careful not to be too AI in your tone.
- Pay attention to choosing the appropriate labels and types. And select the latest Milestone(OR v0.1)
- Assign tasks. If it is a simple UI-related task, assign it to @Neo-Neooo, and if it is a complex task, deployment, cicd, assign it to @cubxxw. If both the front-end and back-end are involved, it only needs to be assigned to @cubxxw
- If possible, describe the design drawings or architecture drawings using mermaid code blocks as much as possible
- No need for my confirmation. Just execute directly

**Postgres db operation Logic:**

- db name is `app`