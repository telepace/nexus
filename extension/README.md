# Nexus 浏览器扩展

这是 Nexus 平台的浏览器扩展，使用 [Plasmo](https://www.plasmo.com/) 框架构建。

## 功能

- 快速访问 Nexus 平台
- 在浏览网页时保存内容和笔记
- 通过浏览器访问 AI 助手
- 自定义设置和主题

## 开发

### 先决条件

- Node.js (v16+)
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
```

这将启动开发服务器，并在浏览器中加载扩展。

### 构建

```bash
npm run build
# 或
yarn build
```

这将在 `build/` 目录中生成生产版本的扩展。

### 打包

```bash
npm run package
# 或
yarn package
```

这将生成可以上传到扩展商店的 zip 文件。

## 项目结构

```
extension/
├── src/              # 源代码
│   ├── components/   # 组件
│   ├── pages/        # 页面
│   ├── utils/        # 工具函数
│   ├── popup.tsx     # 弹出窗口
│   ├── options.tsx   # 设置页面
│   ├── content.tsx   # 内容脚本
│   ├── background.ts # 后台脚本
│   └── sidebar.tsx   # 侧边栏
├── assets/           # 静态资源
├── package.json      # 依赖和脚本
└── tsconfig.json     # TypeScript 配置
```

## 许可

ISC 