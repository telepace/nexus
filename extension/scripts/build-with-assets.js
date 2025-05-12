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

// 使用 ImageMagick 创建图标
console.log('📦 使用 ImageMagick 生成图标文件...');
const createIconFile = (size) => {
  try {
    console.log(`✓ 创建 ${size}x${size} 图标`);
    const outputPath = path.join(distAssetsDir, `icon${size}.png`);
    
    // 使用 magick 命令创建一个渐变圆形图标
    const command = `magick -size ${size}x${size} radial-gradient:blue-navy -gravity center -fill white \
    -stroke navy -strokewidth 1 \
    -draw "circle ${size/2},${size/2} ${size/2},${size*0.2}" \
    -pointsize ${Math.floor(size*0.6)} -font "Arial-Bold" \
    -draw "text 0,${size*0.1} 'N'" \
    ${outputPath}`;
    
    execSync(command);
    
    console.log(`✓ 图标已保存到 ${outputPath}`);
  } catch (error) {
    console.error(`✕ 创建图标失败: ${error.message}`);
    // 尝试使用旧版命令
    try {
      console.log('  尝试使用旧版 convert 命令...');
      const fallbackCommand = `convert -size ${size}x${size} radial-gradient:blue-navy -gravity center -fill white \
      -stroke navy -strokewidth 1 \
      -draw "circle ${size/2},${size/2} ${size/2},${size*0.2}" \
      -pointsize ${Math.floor(size*0.6)} -font "Arial-Bold" \
      -draw "text 0,${size*0.1} 'N'" \
      ${outputPath}`;
      
      execSync(fallbackCommand);
      console.log(`✓ 图标已保存到 ${outputPath}`);
    } catch (fallbackError) {
      console.error(`✕ 创建图标失败（备选方法）: ${fallbackError.message}`);
      // 创建一个1x1像素的最小PNG图标（Base64编码）作为最后的备选
      console.log('  使用纯色占位图标...');
      
      // 创建简单蓝色方块图标
      const simpleCommand = `convert -size ${size}x${size} xc:navy -gravity center -pointsize ${Math.floor(size/2)} -fill white -draw "text 0,0 'N'" ${outputPath}`;
      try {
        execSync(simpleCommand);
        console.log(`✓ 使用简单图标替代`);
      } catch (simpleError) {
        // 最后的备选方案 - 1像素透明PNG
        console.log('  使用最小占位图标...');
        const minimumPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAKJJlUuHAAAAABJRU5ErkJggg==';
        const iconData = Buffer.from(minimumPngBase64, 'base64');
        fs.writeFileSync(path.join(distAssetsDir, `icon${size}.png`), iconData);
      }
    }
  }
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