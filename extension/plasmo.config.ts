import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { copyFile } from "fs/promises";
import { resolve } from "path";
import type { Configuration, PlasmoCSConfig } from "plasmo";

// 确保在构建中复制修复脚本
export const config: PlasmoCSConfig = {
  verbose: true,
  additionalManifestKeys: {
    browser_specific_settings: {
      gecko: {
        id: "nexus@nexus-app.com"
      }
    },
    // 添加侧边栏配置
    side_panel: {
      default_path: "sidepanel.html"
    },
    permissions: [
      "sidePanel",
      "storage",
      "scripting",
      "activeTab", 
      "contextMenus",
      "notifications",
      "identity"
    ]
  },
  hooks: {
    afterBuild: async (buildConfig) => {
      // 将修复脚本复制到构建输出目录
      console.log(`Copying files to ${buildConfig.outputDir}`);
      try {
        // 复制修复脚本
        copyFileSync(
          resolve(__dirname, "content-scripts", "sidebar-fix.js"),
          resolve(buildConfig.outputDir, "sidebar-fix.js")
        );
        copyFileSync(
          resolve(__dirname, "debug-sidebar.js"),
          resolve(buildConfig.outputDir, "debug-sidebar.js")
        );
        
        // 复制侧边栏HTML文件
        copyFileSync(
          resolve(__dirname, "sidepanel.html"),
          resolve(buildConfig.outputDir, "sidepanel.html")
        );
        
        // 确保样式目录存在
        const stylesDir = resolve(buildConfig.outputDir, "styles");
        try {
          // 尝试创建样式目录（如果不存在）
          require('fs').mkdirSync(stylesDir, { recursive: true });
        } catch (err) {
          // 如果目录已存在，忽略错误
          if (err.code !== 'EEXIST') throw err;
        }
        
        // 复制样式文件
        copyFileSync(
          resolve(__dirname, "styles", "tailwind.css"),
          resolve(buildConfig.outputDir, "styles", "tailwind.css")
        );
        
        console.log('All files copied successfully');
      } catch (error) {
        console.error('Error copying files:', error);
      }
    }
  },
  css: {
    copy: [
      { from: "./styles/tailwind.css", to: "styles/tailwind.css" }
    ]
  }
};

export default config 