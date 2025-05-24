# Nexus Browser Extension

## 重构概述

本次重构旨在优化扩展架构，减少冗余代码，重新设计UI，并提高用户体验。主要内容包括：

1. **架构层面**：
   - 采用模块化设计，清晰区分UI层、业务逻辑层和基础设施层
   - 建立统一的API服务层
   - 简化组件结构，提高可维护性

2. **UI重新设计**：
   - 重新设计侧边栏，使用React Hooks和函数组件
   - 重构选项页面，采用侧边导航样式
   - 实现新的弹出窗口设计，优化用户体验

3. **功能优化**：
   - 增强AI功能，添加多模型支持
   - 改进内容提取算法
   - 添加更丰富的上下文操作
   - 实现统一的暗色模式支持

## 已完成的工作

1. 侧边栏(SidePanel)重构：
   - 使用React Hooks和函数组件替代类组件
   - 实现类似Sider的对话界面
   - 增加对话历史管理
   - 添加暗色模式支持

2. 选项页面(Options)重构：
   - 设计全新的选项页面布局，采用侧边导航样式
   - 设置集中归类管理
   - 实现多AI模型支持和API密钥配置
   - 添加快捷提示管理功能

3. 弹出窗口(Popup)重构：
   - 重新设计界面，简洁现代
   - 优化快速操作功能
   - 增强与侧边栏的联动
   - 改进最近剪藏展示

4. 服务层抽象：
   - 统一API调用到服务层
   - 封装浏览器API，降低组件与基础设施的耦合
   - 建立AI服务模块，处理AI相关功能

5. 配置文件更新：
   - 更新manifest.json，优化权限和资源管理
   - 添加键盘快捷键支持
   - 调整文件路径结构，更符合模块化设计

## 待完成的工作

1. **背景服务(Background Service)优化**：
   - 重构消息处理机制
   - 改进授权流程
   - 优化与AI服务的接口

2. **内容脚本(Content Scripts)优化**：
   - 改进页面内容提取算法
   - 优化DOM操作性能
   - 增强上下文感知能力

3. **状态管理统一**：
   - 实现全局状态管理机制
   - 使用React Context或类似方案管理共享状态
   - 解决组件间通信问题

4. **AI功能增强**：
   - 完善多模型支持
   - 增加提示词模板功能
   - 提高AI响应速度和质量

5. **自动测试**：
   - 添加单元测试和集成测试
   - 实现端到端测试
   - 提高代码质量和稳定性

e2e 测试框架： https://github.com/puppeteer/puppeteer

## 下一步计划

1. 完成背景服务优化，改进消息处理机制
2. 重构内容脚本，提高页面内容提取质量
3. 实现状态管理系统，使用React Context
4. 集成单元测试和端到端测试
5. 进行性能优化和兼容性测试

## 开发指南

### 安装依赖

```bash
cd extension
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 构建扩展

```bash
# 构建扩展
npm run build

# 打包扩展为zip文件
npm run package
```

### 目录结构

```
extension/
├── background/         # 后台脚本
│   ├── index.ts
│   └── messages/       # 消息处理器
├── components/         # 共享组件
│   ├── ui/             # UI基础组件
│   └── ...
├── content-scripts/    # 内容脚本
├── pages/              # 页面
│   ├── options/        # 选项页面
│   └── popup/          # 弹出窗口
├── utils/              # 工具函数和服务
│   ├── interfaces.ts   # 类型定义
│   └── services.ts     # API服务层
├── sidepanel.tsx       # 侧边栏组件
├── manifest.json       # 扩展配置
└── package.json
```

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

## WebSocket连接问题的解决方案

在扩展开发过程中，我们遇到了与WebSocket连接相关的CSP（内容安全策略）问题：

```
Refused to connect to 'ws://localhost:1815/' because it violates the following Content Security Policy directive: "connect-src 'self' http://localhost:8000 https://* http://*".
```

### 问题原因

1. **扩展的CSP限制** - 扩展的manifest.json中的CSP没有包含`ws://`协议的连接权限
2. **开发环境需求** - 开发环境中使用了WebSocket进行热重载和调试（端口1815和1816）

### 解决方案

1. **更新manifest.json中的CSP**
   - 在connect-src指令中添加`ws://localhost:* wss://*`允许WebSocket连接

   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:8000 https://* http://* ws://localhost:* wss://*;"
   }
   ```

2. **添加内联CSP到关键页面**
   - 在onboarding.html页面添加CSP meta标签，确保页面级别允许WebSocket

3. **WebSocket连接包装器**
   - 创建`utils/dev-helper.ts`提供安全的WebSocket创建函数
   - 在`theme-helper.js`中添加全局WebSocket构造函数的包装，优雅处理CSP错误

4. **环境配置**
   - 在`utils/config.ts`中添加环境检测和WebSocket端口配置

### 调试技巧

如果仍然出现WebSocket连接问题：

1. 打开Chrome扩展的隐私错误页面：`chrome://net-export/`
2. 收集日志并分析WebSocket连接尝试
3. 查看扩展的后台脚本控制台（在扩展管理页面点击"检查视图：服务工作程序"）