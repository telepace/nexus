#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

// 获取项目路径
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const assetsDir = path.join(projectRoot, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

// 确保目录存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 确保 assets 目录存在
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

// 复制标准图标
console.log('📦 复制图标文件...');
// 这里我们创建一个占位图标，避免使用原始的可能有问题的图标
const createIconFile = (size) => {
  console.log(`✓ 创建 ${size}x${size} 图标`);
  
  // 创建一个1x1像素的最小PNG图标（Base64编码）
  const minimumPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAKJJlUuHAAAAABJRU5ErkJggg==';
  const iconData = Buffer.from(minimumPngBase64, 'base64');
  
  fs.writeFileSync(path.join(distAssetsDir, `icon${size}.png`), iconData);
};

// 创建各种尺寸的图标
[16, 32, 48, 128].forEach(size => createIconFile(size));

// 开始执行 esbuild
console.log('🛠 开始构建 JS...');
esbuild.build({
  entryPoints: [
    'src/popup.tsx', 
    'src/content.tsx', 
    'src/background.ts', 
    'src/options.tsx'
  ],
  bundle: true,
  outdir: distDir,
  target: 'es2020',
  format: 'esm',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.gif': 'dataurl',
    '.svg': 'dataurl',
    '.webp': 'dataurl',
  },
  minify: false,
  sourcemap: true,
})
.then(() => {
  console.log('✅ JS 构建成功！');
  
  // 创建manifest.json
  console.log('📝 生成 manifest.json...');
  
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
      "default_popup": "popup.html",
      "default_icon": {
        "16": "assets/icon16.png",
        "32": "assets/icon32.png",
        "48": "assets/icon48.png",
        "128": "assets/icon128.png"
      }
    },
    "icons": {
      "16": "assets/icon16.png",
      "32": "assets/icon32.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
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
  
  console.log('✅ 扩展程序构建成功!');
  console.log('');
  console.log('你现在可以：');
  console.log('1. 打开Chrome浏览器，进入 chrome://extensions');
  console.log('2. 开启"开发者模式"');
  console.log('3. 点击"加载已解压的扩展程序"');
  console.log('4. 选择 dist 目录');
  console.log('');
  console.log('扩展程序将被加载到浏览器中！');
})
.catch(error => {
  console.error('❌ 构建失败:', error);
  process.exit(1);
}); 