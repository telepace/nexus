# SuperClaude (SC) 工具使用指南

SuperClaude (SC) 是一套强大的 Claude Code 增强命令工具集，为开发者提供智能化的项目管理、代码分析、实施和优化功能。本指南将深入介绍 SC 工具的核心功能、使用方法和最佳实践。

## 📋 目录

1. [快速开始](#quick-start)
2. [核心命令概览](#core-commands)
3. [开发流程命令](#development-commands)
4. [分析与质量保证](#analysis-commands)
5. [项目管理命令](#project-management-commands)
6. [高级功能与集成](#advanced-features)
7. [实用示例](#practical-examples)
8. [最佳实践](#best-practices)

## 🚀 快速开始 {#quick-start}

SC 工具集成于 Claude Code 中，通过 `/sc:` 前缀调用各种专业化命令：

```bash
# 分析项目代码质量
/sc:analyze . --focus quality

# 实现新功能
/sc:implement "用户登录系统" --type feature --with-tests

# 构建项目
/sc:build --type prod --optimize

# 生成项目工作流程
/sc:workflow feature-requirements.md --strategy systematic
```

### 系统要求

- Claude Code 环境
- 项目目录访问权限
- 相关开发工具（如 Node.js, Python 等）

## 🔧 核心命令概览 {#core-commands}

### 开发核心命令

| 命令 | 功能 | 适用场景 |
|------|------|----------|
| `/sc:analyze` | 代码分析 | 质量评估、安全审计、性能分析 |
| `/sc:build` | 项目构建 | 编译、打包、部署准备 |
| `/sc:implement` | 功能实现 | 新功能开发、组件创建 |
| `/sc:improve` | 代码改进 | 重构、优化、技术债务清理 |
| `/sc:test` | 测试执行 | 单元测试、集成测试、E2E测试 |

### 项目管理命令

| 命令 | 功能 | 适用场景 |
|------|------|----------|
| `/sc:task` | 任务管理 | 复杂项目编排、跨会话任务持久化 |
| `/sc:workflow` | 工作流生成 | PRD转换、实施计划制定 |
| `/sc:estimate` | 开发估算 | 时间评估、复杂度分析 |
| `/sc:spawn` | 任务编排 | 复杂任务分解与协调执行 |

### 支持工具命令

| 命令 | 功能 | 适用场景 |
|------|------|----------|
| `/sc:document` | 文档生成 | API文档、使用指南、内联注释 |
| `/sc:cleanup` | 项目清理 | 死代码清除、结构优化 |
| `/sc:troubleshoot` | 问题诊断 | Bug修复、性能问题排查 |
| `/sc:git` | Git操作 | 智能提交、分支管理 |

## 🛠️ 开发流程命令 {#development-commands}

### `/sc:analyze` - 代码分析

深度代码分析，支持多维度质量评估。

```bash
# 基础用法
/sc:analyze [target] [--focus type] [--depth level]

# 示例
/sc:analyze src/ --focus security --depth deep
/sc:analyze . --focus performance --format report
/sc:analyze components/ --focus quality --depth quick
```

#### 分析维度

- **quality**: 代码质量、可维护性、最佳实践
- **security**: 安全漏洞、合规性检查
- **performance**: 性能瓶颈、优化机会
- **architecture**: 架构模式、设计原则

#### 输出格式

- **text**: 结构化文本报告
- **json**: 机器可读的分析数据
- **report**: 详细的HTML报告

### `/sc:implement` - 功能实现

智能化功能实现，自动激活专业角色和框架集成。

```bash
# 基础用法
/sc:implement [feature-description] [--type type] [--framework name]

# 示例
/sc:implement "用户认证系统" --type feature --with-tests
/sc:implement "响应式导航组件" --type component --framework react
/sc:implement "用户管理API" --type api --safe --documentation
```

#### 实现类型

- **component**: UI组件开发
- **api**: REST/GraphQL API实现
- **service**: 后端服务逻辑
- **feature**: 完整功能模块
- **module**: 独立功能模块

#### 自动角色激活

- **Frontend**: UI组件、React/Vue开发
- **Backend**: API、服务、数据库集成
- **Security**: 认证、授权、数据保护
- **Architecture**: 系统设计、模块架构

### `/sc:build` - 项目构建

智能构建系统，支持多环境配置和优化策略。

```bash
# 基础用法
/sc:build [target] [--type environment] [--optimize]

# 示例
/sc:build --type prod --optimize --verbose
/sc:build frontend/ --type dev --clean
/sc:build --type test --validate-dependencies
```

#### 构建类型

- **dev**: 开发环境构建
- **prod**: 生产环境构建  
- **test**: 测试环境构建

#### 构建选项

- **--clean**: 清理构建缓存
- **--optimize**: 启用构建优化
- **--verbose**: 详细构建日志

### `/sc:improve` - 代码改进

系统化代码改进，包括重构、优化和技术债务管理。

```bash
# 基础用法
/sc:improve [target] [--type improvement-type] [--safe]

# 示例
/sc:improve src/ --type quality --preview
/sc:improve . --type performance --safe
/sc:improve components/ --type maintainability
```

#### 改进类型

- **quality**: 代码质量提升
- **performance**: 性能优化
- **maintainability**: 可维护性改进
- **style**: 代码风格统一

### `/sc:test` - 测试执行

全面的测试执行和报告系统。

```bash
# 基础用法
/sc:test [target] [--type test-type] [--coverage]

# 示例
/sc:test --type unit --coverage
/sc:test e2e/ --type e2e --watch
/sc:test . --type all --fix
```

#### 测试类型

- **unit**: 单元测试
- **integration**: 集成测试
- **e2e**: 端到端测试
- **all**: 全面测试

## 📊 分析与质量保证 {#analysis-commands}

### 代码质量分析

```bash
# 综合质量评估
/sc:analyze . --focus quality --depth deep --format report

# 安全漏洞扫描
/sc:analyze . --focus security --depth quick

# 性能瓶颈识别
/sc:analyze src/ --focus performance --format json
```

### 问题诊断与修复

```bash
# 构建问题诊断
/sc:troubleshoot "构建失败" --type build --trace

# 性能问题排查
/sc:troubleshoot "页面加载缓慢" --type performance --fix

# 部署问题诊断
/sc:troubleshoot "部署后无法访问" --type deployment
```

### 项目清理与优化

```bash
# 安全清理（推荐）
/sc:cleanup . --type all --safe --dry-run

# 积极清理
/sc:cleanup src/ --type code --aggressive

# 导入优化
/sc:cleanup . --type imports --safe
```

## 📋 项目管理命令 {#project-management-commands}

### `/sc:task` - 高级任务管理

企业级任务管理，支持跨会话持久化和层次化组织。

```bash
# 基础用法
/sc:task [action] [target] [--strategy type] [--persist]

# 示例
/sc:task create "实现用户认证系统" --hierarchy --persist --strategy systematic
/sc:task execute AUTH-001 --delegate --wave-mode --validate
/sc:task status --all-sessions --detailed-breakdown
/sc:task analytics --project AUTH --optimization-recommendations
```

#### 执行策略

- **systematic**: 系统化方法，适合复杂项目
- **agile**: 敏捷方法，适合迭代开发
- **enterprise**: 企业级策略，适合大型项目

#### 任务层次

- **Epic Level**: 大型项目目标（周到月）
- **Story Level**: 功能特定实现（天到周）  
- **Task Level**: 具体可执行项目（小时到天）
- **Subtask Level**: 细粒度实现步骤（分钟到小时）

### `/sc:workflow` - 工作流程生成

从 PRD 生成结构化实施工作流程，支持多种策略和专家指导。

```bash
# 基础用法
/sc:workflow [prd-file|description] [--strategy type] [--output format]

# 示例
/sc:workflow docs/user-auth-prd.md --strategy systematic --c7 --sequential
/sc:workflow "实时聊天功能" --persona frontend --magic --output detailed
/sc:workflow payment-system --strategy mvp --risks --parallel
```

#### 工作流策略

1. **Systematic Strategy**: 系统化实施
   - 需求分析 → 架构规划 → 依赖映射 → 实施阶段 → 测试策略 → 部署规划

2. **Agile Strategy**: 敏捷开发
   - Epic分解 → Sprint规划 → MVP定义 → 迭代开发 → 利益相关者参与

3. **MVP Strategy**: 最小可行产品
   - 核心功能识别 → 快速原型 → 技术债务规划 → 验证指标 → 扩展路线图

#### 输出格式

- **roadmap**: 阶段性路线图
- **tasks**: 任务化清单
- **detailed**: 详细实施步骤

### `/sc:estimate` - 开发估算

基于复杂度分析的精确开发估算。

```bash
# 基础用法
/sc:estimate [target] [--type estimation-type] [--unit time-unit]

# 示例
/sc:estimate "用户认证功能" --type time --unit hours --breakdown
/sc:estimate . --type complexity --breakdown
/sc:estimate api/users --type effort --unit days
```

#### 估算类型

- **time**: 时间估算
- **effort**: 工作量估算
- **complexity**: 复杂度评估
- **cost**: 成本估算

### `/sc:spawn` - 任务编排

复杂任务分解与协调执行系统。

```bash
# 基础用法
/sc:spawn [task] [--sequential|--parallel] [--validate]

# 示例
/sc:spawn "重构整个认证系统" --parallel --validate
/sc:spawn "多模块性能优化" --sequential --validate
```

## 🚀 高级功能与集成 {#advanced-features}

### Wave 系统集成

SC 工具集支持 Wave 模式，用于复杂多阶段任务执行：

```bash
# 启用 Wave 模式的命令
/sc:task execute complex-project --wave-mode --adaptive-waves
/sc:workflow large-system-refactor --wave-strategy systematic --wave-validation
```

#### Wave 策略类型

- **progressive**: 渐进式增强
- **systematic**: 系统化分析
- **adaptive**: 自适应配置
- **enterprise**: 企业级编排

### MCP 服务器集成

SC 工具智能集成多个 MCP 服务器：

- **Context7**: 框架模式和最佳实践
- **Sequential**: 复杂分析和多步推理
- **Magic**: UI 组件生成
- **Playwright**: 浏览器自动化和测试

```bash
# 显式启用 MCP 服务器
/sc:implement dashboard --magic --c7  # UI + 框架模式
/sc:analyze security-issues --sequential --ultrathink  # 深度安全分析
```

### 智能角色激活

SC 工具根据任务类型自动激活专业角色：

- **architect**: 系统架构专家
- **frontend**: 前端开发专家  
- **backend**: 后端开发专家
- **security**: 安全专家
- **performance**: 性能优化专家
- **qa**: 质量保证专家

### 文档与知识管理

```bash
# 项目文档生成
/sc:document . --type project --style detailed
/sc:index . --type structure --format md

# API 文档生成  
/sc:document src/api/ --type api --template swagger

# 内联文档更新
/sc:document src/utils.js --type inline --style brief
```

## 💡 实用示例 {#practical-examples}

### 完整功能开发流程

```bash
# 1. 从 PRD 生成工作流
/sc:workflow user-authentication-prd.md --strategy systematic --output roadmap

# 2. 创建项目级任务
/sc:task create "用户认证系统" --hierarchy --persist --strategy systematic

# 3. 分析现有代码基础  
/sc:analyze . --focus architecture --depth deep

# 4. 实现核心功能
/sc:implement "JWT 认证服务" --type api --with-tests --safe

# 5. 执行全面测试
/sc:test . --type all --coverage --fix

# 6. 代码质量改进
/sc:improve src/auth/ --type quality --safe

# 7. 构建生产版本
/sc:build --type prod --optimize --validate

# 8. 生成文档
/sc:document src/auth/ --type api --style detailed
```

### 性能优化专项

```bash
# 1. 性能问题诊断
/sc:troubleshoot "应用响应缓慢" --type performance --trace

# 2. 深度性能分析
/sc:analyze . --focus performance --depth deep --format report

# 3. 性能优化实施
/sc:improve . --type performance --preview
/sc:improve . --type performance  # 确认后执行

# 4. 性能测试验证
/sc:test . --type performance --benchmark

# 5. 生成性能报告
/sc:document performance-analysis --type report
```

### 安全审计流程

```bash
# 1. 全面安全扫描
/sc:analyze . --focus security --depth deep --format json

# 2. 安全问题修复
/sc:troubleshoot security-vulnerabilities --type security --fix

# 3. 安全代码改进
/sc:improve . --type security --validate

# 4. 安全测试执行
/sc:test security/ --type security --comprehensive

# 5. 安全文档生成
/sc:document security-measures --type security-guide
```

### 大型项目重构

```bash
# 1. 重构工作流规划
/sc:workflow "系统架构现代化" --strategy enterprise --wave-mode --output detailed

# 2. 创建企业级任务
/sc:task create "系统重构" --strategy enterprise --delegate --wave-mode

# 3. 架构分析
/sc:analyze . --focus architecture --depth ultrathink

# 4. 分阶段重构执行
/sc:spawn "模块化重构" --parallel --validate

# 5. 质量持续改进
/sc:improve . --type maintainability --iterative

# 6. 全面测试覆盖
/sc:test . --type all --coverage --regression
```

## 📈 最佳实践 {#best-practices}

### 项目初始阶段

1. **项目分析优先**
   ```bash
   /sc:load . --type project --cache  # 加载项目上下文
   /sc:analyze . --focus quality --depth quick  # 快速质量评估
   ```

2. **建立工作流程**
   ```bash
   /sc:workflow requirements.md --strategy systematic --output roadmap
   /sc:task create project-name --hierarchy --persist
   ```

### 开发过程中

1. **增量分析与改进**
   ```bash
   /sc:analyze changed-files/ --focus quality
   /sc:improve . --type style --safe --preview
   ```

2. **持续测试**
   ```bash
   /sc:test new-features/ --type unit --coverage
   /sc:test . --type integration --watch
   ```

### 发布前准备

1. **全面质量检查**
   ```bash
   /sc:analyze . --focus all --depth deep --format report
   /sc:test . --type all --coverage --fix
   ```

2. **生产构建优化**
   ```bash
   /sc:build --type prod --optimize --validate
   /sc:cleanup . --type all --safe
   ```

3. **文档完善**
   ```bash
   /sc:document . --type project --comprehensive
   /sc:index . --type api --format swagger
   ```

### 团队协作

1. **任务分解与跟踪**
   ```bash
   /sc:spawn complex-feature --parallel --delegate
   /sc:task status --team --detailed-breakdown
   ```

2. **代码审查支持**
   ```bash
   /sc:analyze pull-request-files/ --focus quality --format review
   /sc:troubleshoot code-review-issues --type quality --suggestions
   ```

### 性能与资源优化

1. **使用缓存与批处理**
   ```bash
   /sc:load . --cache  # 缓存项目上下文
   /sc:analyze multiple-dirs/ --batch  # 批量分析
   ```

2. **渐进式分析**
   ```bash
   /sc:analyze . --depth quick  # 快速概览
   /sc:analyze critical-parts/ --depth deep  # 深度分析关键部分
   ```

### 错误处理与恢复

1. **安全模式执行**
   ```bash
   /sc:improve . --safe --dry-run  # 预览更改
   /sc:cleanup . --safe  # 安全清理
   ```

2. **验证与回滚**
   ```bash
   /sc:test . --validate  # 验证更改
   /sc:git status --verify  # 检查 Git 状态
   ```

## 🎯 总结

SC 工具集为 Claude Code 提供了企业级的开发工具链，通过智能化的命令系统、专业角色激活和 MCP 服务器集成，显著提升了开发效率和代码质量。

### 核心优势

- **智能化**: 自动角色激活和工具选择
- **全面性**: 覆盖开发全生命周期
- **可扩展**: 支持 Wave 模式和 MCP 集成
- **企业级**: 支持复杂项目和团队协作

### 建议使用场景

- **中大型项目开发**: 利用任务管理和工作流功能
- **代码质量提升**: 使用分析和改进工具
- **团队协作**: 使用任务分解和跟踪功能
- **性能优化**: 使用专业的性能分析工具

通过合理使用 SC 工具集，开发团队可以实现更高效、更高质量的软件开发流程。建议从核心命令开始，逐步探索高级功能，并根据项目需求定制工作流程。