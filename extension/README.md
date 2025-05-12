# Nexus 浏览器扩展

Nexus平台的Chrome浏览器扩展，提供快速访问和增强功能。

## 构建说明

本扩展提供了两种构建方法:

### 方法1: 使用优化的构建脚本（推荐）

这种方法使用自定义的构建脚本，可以绕过Node.js版本与sharp模块的兼容性问题:

```bash
# 安装依赖
npm install

# 运行优化的构建脚本
npm run build-complete
```

该脚本会:
1. 使用ImageMagick生成扩展图标
2. 使用esbuild构建JavaScript文件
3. 生成manifest.json和必要的HTML文件
4. 将所有文件输出到dist目录

构建完成后，所有文件都将在`dist`目录中。

### 方法2: 使用Plasmo框架（需要兼容的Node.js版本）

如果您的系统上安装了兼容的Node.js版本(^18.17.0 || ^20.3.0 || >=21.0.0)，您也可以使用原始的Plasmo构建:

```bash
npm run build
```

## 加载扩展到Chrome浏览器

1. 打开Chrome浏览器，进入 `chrome://extensions`
2. 开启"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择`dist`目录
5. 扩展将被加载到浏览器中

## 开发

在开发过程中，您可以使用以下命令:

```bash
# 使用优化的构建脚本进行构建
npm run build-complete

# 如果Node.js版本兼容，可以使用Plasmo开发模式
npm run dev
```

## 排错

如果您在构建过程中遇到"Input file contains unsupported image format"错误，请使用推荐的构建方法（方法1）。

如果ImageMagick生成图标失败，脚本会自动创建简单的图标替代品。

## 依赖项

- Node.js (任何版本都可以使用自定义构建脚本)
- ImageMagick (可选，用于生成高质量图标)

## 功能

- 快速访问 Nexus 平台
- 在浏览网页时保存内容和笔记
- 通过浏览器访问 AI 助手
- 自定义设置和主题

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