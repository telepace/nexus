# Nexus 浏览器扩展测试指南

本文档提供了 Nexus 浏览器扩展测试的完整指南，包括单元测试、组件测试和端到端测试的设置和运行方式。

## 测试架构

项目使用以下测试工具和框架：

- **Jest**: 用于单元测试和组件测试
- **React Testing Library**: 用于 React 组件测试
- **Playwright**: 用于端到端测试

测试文件的组织结构如下：

```
extension/
├── __tests__/              # 单元测试和组件测试目录
│   ├── components/         # 组件测试
│   │   ├── Popup/          # Popup组件测试
│   │   ├── Settings/       # Settings组件测试
│   │   ├── Sidebar/        # Sidebar组件测试
│   │   └── ui/             # UI组件测试
│   └── utils/              # 工具函数测试
├── e2e/                    # 端到端测试目录
│   ├── popup.spec.ts       # Popup页面E2E测试
│   └── content-script.spec.ts # 内容脚本E2E测试
├── tests/                  # 测试配置和工具
│   ├── setup.ts            # Jest设置文件
│   └── test-utils.tsx      # 测试工具函数
├── jest.config.js          # Jest配置
└── playwright.config.ts    # Playwright配置
```

## 运行测试

### 单元测试和组件测试

运行所有单元测试和组件测试：

```bash
pnpm test
```

运行测试并监视文件变化：

```bash
pnpm test:watch
```

生成测试覆盖率报告：

```bash
pnpm test:coverage
```

运行特定测试文件：

```bash
pnpm test -- -t "Button Component"
```

### 端到端测试

运行所有端到端测试：

```bash
pnpm exec playwright test
```

运行特定端到端测试文件：

```bash
pnpm exec playwright test e2e/popup.spec.ts
```

在有界面模式下运行测试：

```bash
pnpm exec playwright test --headed
```

## 编写测试

### 单元测试

单元测试主要用于测试独立的功能函数，如 `utils/` 目录中的函数。测试应关注函数的输入和输出。

示例：

```typescript
// __tests__/utils/commons.test.ts
import { truncateText } from '../../utils/commons';

describe('truncateText', () => {
  it('should truncate text when longer than maxLength', () => {
    const text = 'This is a long text that needs to be truncated';
    const result = truncateText(text, 20);
    
    expect(result).toBe('This is a long text...');
  });
});
```

### 组件测试

组件测试主要测试 React 组件的渲染和交互行为。使用 React Testing Library 进行组件渲染和交互模拟。

示例：

```typescript
// __tests__/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '../../../tests/test-utils';
import Button from '../../../components/ui/Button';

describe('Button Component', () => {
  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>点击按钮</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /点击按钮/i }));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 端到端测试

端到端测试模拟真实用户使用浏览器扩展的场景。测试整个工作流程，从页面交互到扩展行为。

运行 E2E 测试前，需要设置扩展 ID：

1. 在开发模式下加载扩展
2. 从 chrome://extensions 页面获取扩展 ID
3. 更新 `playwright.config.ts` 文件中的 ID 或设置环境变量 `EXTENSION_ID`

## 测试覆盖率目标

项目的测试覆盖率目标为：

- **工具函数**: 至少 90% 覆盖率
- **UI 组件**: 至少 70% 覆盖率
- **整体项目**: 至少 75% 覆盖率

查看 `jest.config.js` 中的 `coverageThreshold` 配置以了解具体目标。

## 模拟设置

项目使用以下模拟策略：

1. **API 请求**: 使用 Jest 的 mock 函数模拟 `fetch` 请求
2. **浏览器 API**: 在 `tests/setup.ts` 中模拟 Chrome API
3. **本地存储**: 模拟 `@plasmohq/storage`

测试中可以根据需要覆盖这些模拟的行为。

## 持续集成

测试已集成到 CI/CD 流程中。每次提交都会运行测试，确保代码质量。

CI/CD 流程包含以下步骤：

1. 运行 lint 检查
2. 运行单元测试和组件测试
3. 生成测试覆盖率报告
4. 运行 E2E 测试

## 常见问题解决

### 测试失败常见原因

1. **模拟不正确**: 确保正确模拟了依赖项
2. **异步测试问题**: 使用 `waitFor` 等待异步操作完成
3. **环境差异**: 检查测试环境与开发环境的差异

### 调试测试

1. 使用 `console.log` 输出调试信息
2. 使用 `--debug` 选项运行测试
3. 使用 VS Code 的测试调试功能

### 更新快照测试

如果 UI 有意更改，可以更新快照：

```bash
pnpm test -- -u
``` 