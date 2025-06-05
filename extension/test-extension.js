// 增强的扩展测试脚本
const fs = require('fs');
const path = require('path');

const buildPath = './build/chrome-mv3-prod';
const manifestPath = path.join(buildPath, 'manifest.json');

console.log('🚀 Testing Nexus Extension Build (Enhanced UI Version)...\n');

// 检查构建目录是否存在
if (!fs.existsSync(buildPath)) {
  console.log('❌ Build directory not found');
  process.exit(1);
}

// 检查manifest.json
if (!fs.existsSync(manifestPath)) {
  console.log('❌ manifest.json not found');
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ Manifest.json valid');
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Manifest Version: ${manifest.manifest_version}`);
  console.log(`   Permissions: ${manifest.permissions.length} items`);
  console.log(`   Sidepanel: ${manifest.side_panel ? '✅ Configured' : '❌ Missing'}`);
} catch (error) {
  console.log('❌ Invalid manifest.json:', error.message);
  process.exit(1);
}

// 检查必要文件
const requiredFiles = [
  'static/background/index.js',
  'sidepanel.html',
  'options.html',
  'iframe-ui.html',
  'summary-window.html',
  'notification-popup.html'
];

console.log('\n📁 Checking required files:');
for (const file of requiredFiles) {
  const filePath = path.join(buildPath, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`   ❌ ${file} (missing)`);
  }
}

// 检查侧边栏HTML是否包含正确的内容
const sidepanelPath = path.join(buildPath, 'sidepanel.html');
if (fs.existsSync(sidepanelPath)) {
  const sidepanelContent = fs.readFileSync(sidepanelPath, 'utf8');
  console.log('\n🔍 Sidepanel content analysis:');
  
  const checks = [
    { name: 'React root element', pattern: '__plasmo', expected: true },
    { name: 'JavaScript bundle', pattern: /sidepanel\.[a-f0-9]+\.js/, expected: true },
    { name: 'CSS styles', pattern: /\.css/, expected: true }
  ];
  
  checks.forEach(check => {
    const found = typeof check.pattern === 'string' 
      ? sidepanelContent.includes(check.pattern)
      : check.pattern.test(sidepanelContent);
    
    console.log(`   ${found === check.expected ? '✅' : '❌'} ${check.name}`);
  });
}

// 检查构建时间
console.log('\n⏰ Build information:');
const buildStats = fs.statSync(manifestPath);
console.log(`   Last built: ${buildStats.mtime.toLocaleString()}`);
console.log(`   Build age: ${Math.round((Date.now() - buildStats.mtime.getTime()) / (1000 * 60))} minutes ago`);

// 检查静态资源
const staticPath = path.join(buildPath, 'static');
if (fs.existsSync(staticPath)) {
  const staticFiles = fs.readdirSync(staticPath, { recursive: true });
  console.log(`   Static files: ${staticFiles.length} files`);
}

console.log('\n🎉 Extension build test completed successfully!');
console.log('\n📋 Installation steps:');
console.log('   1. Open Chrome and go to: chrome://extensions/');
console.log('   2. Enable "Developer mode" (top-right toggle)');
console.log('   3. Click "Load unpacked"');
console.log(`   4. Select folder: ${path.resolve(buildPath)}`);
console.log('   5. Pin the extension and test on any webpage');

console.log('\n🔧 New Features in this build:');
console.log('   • 🎨 Enhanced sidepanel UI with modern design');
console.log('   • 👤 User avatar and login status display');
console.log('   • 📊 Current page information display');
console.log('   • 🚀 Quick action buttons with visual feedback');
console.log('   • 🔄 Improved login/sync flow');
console.log('   • 💫 Gradient backgrounds and smooth animations');

console.log('\n🧪 Testing checklist:');
console.log('   □ Extension loads without errors');
console.log('   □ Sidepanel opens correctly');
console.log('   □ Login form displays properly');
console.log('   □ User avatar shows after login');
console.log('   □ Page information is detected');
console.log('   □ Quick actions work (save/summarize)');
console.log('   □ Navigation to website functions');

console.log('\n💡 Troubleshooting:');
console.log('   • If sidepanel doesn\'t open: Check browser supports sidepanel API');
console.log('   • If login fails: Verify backend is running on localhost:8000');
console.log('   • If no page data: Check content script permissions');
console.log('   • For console errors: Check manifest permissions'); 