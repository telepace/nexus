#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取项目路径
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

// 确保目录存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 创建manifest.json
const manifest = {
  "manifest_version": 3,
  "name": "Nexus 助手",
  "version": "0.0.1",
  "description": "Nexus 平台的浏览器扩展，提供快速访问和增强功能",
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
};

// 写入manifest.json
fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('✓ 已生成 manifest.json');

// 创建HTML文件
const generateHtml = (scriptName, title) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="__plasmo"></div>
  <script src="${scriptName}.js" type="module"></script>
</body>
</html>
`;

// 写入HTML文件
fs.writeFileSync(
  path.join(distDir, 'popup.html'),
  generateHtml('popup', 'Nexus 助手')
);
console.log('✓ 已生成 popup.html');

fs.writeFileSync(
  path.join(distDir, 'options.html'),
  generateHtml('options', 'Nexus 助手 - 设置')
);
console.log('✓ 已生成 options.html');

console.log('✓ 扩展程序结构生成成功!');
console.log('');
console.log('你现在可以：');
console.log('1. 打开Chrome浏览器，进入 chrome://extensions');
console.log('2. 开启"开发者模式"');
console.log('3. 点击"加载已解压的扩展程序"');
console.log('4. 选择 dist 目录');
console.log('');
console.log('扩展程序将被加载到浏览器中！'); 