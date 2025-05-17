import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { copyFile } from "fs/promises";
import { resolve } from "path";
import type { Configuration } from "plasmo";

// 确保在构建中复制修复脚本
export const config: Configuration = {
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
        
        console.log('All files copied successfully');
      } catch (error) {
        console.error('Error copying files:', error);
      }
    }
  }
}; 