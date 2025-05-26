#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class StructureChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
    this.projectRoot = process.cwd();
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      success: '\x1b[32m',
      info: '\x1b[36m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  checkFileExists(filePath) {
    return fs.existsSync(path.join(this.projectRoot, filePath));
  }

  checkDuplicateFiles() {
    this.log('\n🔍 检查重复文件...', 'info');
    
    const duplicateChecks = [
      {
        files: ['extension/oauth-callback.html', 'extension/pages/oauth-callback.html'],
        description: 'OAuth回调HTML文件重复',
        recommendation: '删除根目录下的oauth-callback.html，保留pages目录下的版本'
      },
      {
        files: ['frontend/hooks/use-mobile.ts', 'frontend/hooks/use-mobile.tsx'],
        description: 'use-mobile hooks文件重复',
        recommendation: '删除.ts版本，保留.tsx版本（React项目应使用.tsx）'
      }
    ];

    duplicateChecks.forEach(check => {
      const existingFiles = check.files.filter(file => this.checkFileExists(file));
      if (existingFiles.length > 1) {
        this.issues.push({
          type: 'duplicate',
          description: check.description,
          files: existingFiles,
          recommendation: check.recommendation
        });
      }
    });

    // 单独分析content脚本关系
    this.analyzeContentScripts();
  }

  analyzeContentScripts() {
    this.log('\n🔍 分析Content脚本关系...', 'info');
    
    const contentTs = 'extension/content.ts';
    const contentTsx = 'extension/content-scripts/content.tsx';
    
    if (this.checkFileExists(contentTs) && this.checkFileExists(contentTsx)) {
      try {
        const contentTsContent = fs.readFileSync(path.join(this.projectRoot, contentTs), 'utf8');
        const contentTsxContent = fs.readFileSync(path.join(this.projectRoot, contentTsx), 'utf8');
        
        // 分析文件特征
        const isPlasmoContent = contentTsContent.includes('PlasmoCSConfig') || contentTsContent.includes('@plasmohq');
        const isReactContent = contentTsxContent.includes('React') || contentTsxContent.includes('render');
        
        if (isPlasmoContent && isReactContent) {
          this.warnings.push({
            type: 'build_system_inconsistency',
            description: 'Content脚本存在构建系统不一致',
            recommendation: '项目同时维护Plasmo构建(content.ts)和手动构建(content-scripts/content.tsx)，建议统一构建方式'
          });
          
          this.suggestions.push({
            type: 'unify_build_system',
            description: '建议统一扩展构建系统',
            recommendation: '推荐采用Plasmo构建系统，将content-scripts/content.tsx的功能整合到content.ts中，或完全采用手动构建'
          });
        }
      } catch (error) {
        this.warnings.push({
          type: 'content_analysis_failed',
          description: '无法分析content脚本内容',
          recommendation: '手动检查content脚本的用途和关系'
        });
      }
    }
  }

  checkRequiredDirectories() {
    this.log('\n📁 检查必需目录结构...', 'info');
    
    const requiredDirs = [
      'backend/app',
      'frontend/app',
      'admin/src',
      'extension/pages',
      'extension/content-scripts',
      'extension/background',
      'docs',
      'scripts'
    ];

    requiredDirs.forEach(dir => {
      if (!this.checkFileExists(dir)) {
        this.issues.push({
          type: 'missing_directory',
          description: `缺少必需目录: ${dir}`,
          recommendation: `创建目录: mkdir -p ${dir}`
        });
      }
    });
  }

  checkManifestConsistency() {
    this.log('\n📋 检查manifest.json一致性...', 'info');
    
    const manifestPath = 'extension/manifest.json';
    if (!this.checkFileExists(manifestPath)) {
      this.issues.push({
        type: 'missing_file',
        description: '缺少extension/manifest.json文件',
        recommendation: '创建manifest.json文件'
      });
      return;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(this.projectRoot, manifestPath), 'utf8'));
      
      // 检查web_accessible_resources中引用的文件是否存在
      if (manifest.web_accessible_resources) {
        manifest.web_accessible_resources.forEach(resource => {
          if (resource.resources) {
            resource.resources.forEach(file => {
              const fullPath = `extension/${file}`;
              
              // 跳过通配符模式
              if (file.includes('*')) {
                const baseDir = file.replace('/*', '');
                const basePath = `extension/${baseDir}`;
                if (!this.checkFileExists(basePath)) {
                  this.issues.push({
                    type: 'missing_resource_directory',
                    description: `manifest.json中引用的资源目录不存在: ${baseDir}`,
                    recommendation: `创建目录 ${basePath}`
                  });
                }
                return;
              }
              
              if (!this.checkFileExists(fullPath)) {
                // 区分不同类型的缺失文件
                if (file.endsWith('.html')) {
                  this.issues.push({
                    type: 'missing_html_resource',
                    description: `manifest.json中引用的HTML文件不存在: ${file}`,
                    recommendation: `创建文件 ${fullPath} 或从manifest.json中移除引用`
                  });
                } else if (file.endsWith('.js')) {
                  this.warnings.push({
                    type: 'missing_js_resource',
                    description: `manifest.json中引用的JS文件不存在: ${file}`,
                    recommendation: `这可能是构建生成的文件，请确保构建过程正常`
                  });
                } else {
                  this.issues.push({
                    type: 'missing_resource',
                    description: `manifest.json中引用的资源文件不存在: ${file}`,
                    recommendation: `创建文件 ${fullPath} 或从manifest.json中移除引用`
                  });
                }
              }
            });
          }
        });
      }

      // 检查content_scripts中引用的文件
      if (manifest.content_scripts) {
        manifest.content_scripts.forEach(script => {
          if (script.js) {
            script.js.forEach(file => {
              const fullPath = `extension/${file}`;
              if (!this.checkFileExists(fullPath)) {
                this.warnings.push({
                  type: 'missing_content_script',
                  description: `content_scripts中引用的文件不存在: ${file}`,
                  recommendation: `这可能是构建生成的文件，请确保构建过程正常`
                });
              }
            });
          }
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'invalid_manifest',
        description: 'manifest.json文件格式错误',
        recommendation: '检查并修复manifest.json的JSON格式'
      });
    }
  }

  checkTypeScriptFiles() {
    this.log('\n📝 分析TypeScript文件...', 'info');
    
    // 查找可能可以转换为JavaScript的简单TypeScript文件
    const simpleFiles = [
      'extension/utils/config.ts',
      'extension/utils/constants.ts'
    ];

    simpleFiles.forEach(file => {
      if (this.checkFileExists(file)) {
        try {
          const content = fs.readFileSync(path.join(this.projectRoot, file), 'utf8');
          
          // 简单启发式检查：如果文件很短且没有复杂类型定义
          const lines = content.split('\n').filter(line => line.trim());
          const hasComplexTypes = /interface|type\s+\w+\s*=|generic|<.*>/.test(content);
          const hasTypeAnnotations = /:\s*(string|number|boolean|object)/.test(content);
          
          if (lines.length < 50 && !hasComplexTypes && !hasTypeAnnotations) {
            this.suggestions.push({
              type: 'ts_to_js_candidate',
              description: `${file} 可能可以转换为JavaScript`,
              recommendation: `文件较简单且不使用复杂TypeScript特性，可考虑转换为.js文件以简化构建`
            });
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    });
  }

  checkBuildErrors() {
    this.log('\n🔨 检查构建相关问题...', 'info');
    
    // 检查已知的构建问题文件
    const problemFiles = [
      {
        file: 'frontend/jest.env.ts',
        issue: 'NODE_ENV赋值问题',
        recommendation: '使用Object.defineProperty或其他方式设置环境变量',
        checkFixed: (content) => content.includes('Object.defineProperty(process.env, "NODE_ENV"')
      },
      {
        file: 'frontend/jest.setup.ts',
        issue: 'TypeScript类型问题',
        recommendation: '修复JSX命名空间和类型定义问题',
        checkFixed: (content) => content.includes('MockIntersectionObserver') && content.includes('React.JSX.IntrinsicElements')
      }
    ];

    problemFiles.forEach(({ file, issue, recommendation, checkFixed }) => {
      if (this.checkFileExists(file)) {
        try {
          const content = fs.readFileSync(path.join(this.projectRoot, file), 'utf8');
          if (checkFixed && checkFixed(content)) {
            // 问题已修复，不报告
            return;
          }
        } catch (error) {
          // 如果读取失败，仍然报告问题
        }
        
        this.issues.push({
          type: 'build_error',
          description: `${file}: ${issue}`,
          recommendation
        });
      }
    });
  }

  generateReport() {
    this.log('\n📊 生成检查报告...', 'info');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 项目结构检查报告');
    console.log('='.repeat(60));

    if (this.issues.length > 0) {
      this.log('\n❌ 发现的问题:', 'error');
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.description}`);
        if (issue.files) {
          console.log(`   文件: ${issue.files.join(', ')}`);
        }
        console.log(`   建议: ${issue.recommendation}`);
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  警告:', 'warning');
      this.warnings.forEach((warning, index) => {
        console.log(`\n${index + 1}. ${warning.description}`);
        console.log(`   建议: ${warning.recommendation}`);
      });
    }

    if (this.suggestions.length > 0) {
      this.log('\n💡 优化建议:', 'info');
      this.suggestions.forEach((suggestion, index) => {
        console.log(`\n${index + 1}. ${suggestion.description}`);
        console.log(`   建议: ${suggestion.recommendation}`);
      });
    }

    if (this.issues.length === 0 && this.warnings.length === 0) {
      this.log('\n✅ 项目结构检查通过！', 'success');
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总计: ${this.issues.length} 个问题, ${this.warnings.length} 个警告, ${this.suggestions.length} 个建议`);
    console.log('='.repeat(60));
  }

  generateFixScript() {
    this.log('\n🔧 生成修复脚本...', 'info');
    
    const fixCommands = [];
    
    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'duplicate':
          if (issue.files.includes('extension/oauth-callback.html') && 
              issue.files.includes('extension/pages/oauth-callback.html')) {
            fixCommands.push('# 删除重复的OAuth回调文件');
            fixCommands.push('rm extension/oauth-callback.html');
          }
          if (issue.files.includes('frontend/hooks/use-mobile.ts') && 
              issue.files.includes('frontend/hooks/use-mobile.tsx')) {
            fixCommands.push('# 删除重复的use-mobile文件');
            fixCommands.push('rm frontend/hooks/use-mobile.ts');
          }
          break;
        case 'missing_directory':
          fixCommands.push(`mkdir -p ${issue.description.split(': ')[1]}`);
          break;
        case 'missing_resource_directory':
          const dirName = issue.description.match(/资源目录不存在: (.+)/)[1];
          fixCommands.push(`# 创建缺失的资源目录`);
          fixCommands.push(`mkdir -p extension/${dirName}`);
          break;
        case 'missing_html_resource':
          const htmlFile = issue.description.match(/HTML文件不存在: (.+)/)[1];
          fixCommands.push(`# 创建缺失的HTML文件`);
          fixCommands.push(`touch extension/${htmlFile}`);
          fixCommands.push(`echo '<!DOCTYPE html><html><head><title>${htmlFile}</title></head><body><h1>TODO: 实现${htmlFile}</h1></body></html>' > extension/${htmlFile}`);
          break;
      }
    });

    if (fixCommands.length > 0) {
      const scriptPath = path.join(this.projectRoot, 'scripts/fix-structure.sh');
      const scriptContent = [
        '#!/bin/bash',
        '# 自动生成的结构修复脚本',
        '# 运行前请仔细检查每个命令',
        '',
        'set -e',
        '',
        'echo "开始修复项目结构..."',
        '',
        ...fixCommands,
        '',
        'echo "结构修复完成！"',
        'echo "请运行 node scripts/check-structure.js 验证修复结果"'
      ].join('\n');

      fs.writeFileSync(scriptPath, scriptContent);
      execSync(`chmod +x ${scriptPath}`);
      
      this.log(`\n✅ 修复脚本已生成: ${scriptPath}`, 'success');
      this.log('运行修复脚本: ./scripts/fix-structure.sh', 'info');
    } else {
      this.log('\n✅ 没有需要自动修复的问题', 'success');
    }
  }

  run() {
    this.log('🚀 开始项目结构检查...', 'info');
    
    this.checkDuplicateFiles();
    this.checkRequiredDirectories();
    this.checkManifestConsistency();
    this.checkTypeScriptFiles();
    this.checkBuildErrors();
    
    this.generateReport();
    this.generateFixScript();
    
    return this.issues.length === 0;
  }
}

// 运行检查
if (require.main === module) {
  const checker = new StructureChecker();
  const success = checker.run();
  process.exit(success ? 0 : 1);
}

module.exports = StructureChecker; 