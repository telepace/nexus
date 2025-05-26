#!/usr/bin/env python3
"""
Nexus项目综合验证脚本
整合冲突检测和其他项目结构验证功能，确保项目符合规范
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
from datetime import datetime

# 导入冲突检测器
from conflict_detector import ConflictDetector


class ProjectValidator:
    """项目验证器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
        
    def validate_directory_structure(self) -> bool:
        """验证目录结构"""
        print("🔍 验证目录结构...")
        
        required_dirs = [
            "backend",
            "frontend", 
            "admin",
            "extension",
            "website",
            "docs",
            "scripts"
        ]
        
        missing_dirs = []
        for dir_name in required_dirs:
            dir_path = self.project_root / dir_name
            if not dir_path.exists():
                missing_dirs.append(dir_name)
        
        if missing_dirs:
            self.errors.append(f"缺少必需的目录: {', '.join(missing_dirs)}")
            return False
        
        self.info.append("✅ 目录结构验证通过")
        return True
    
    def validate_package_managers(self) -> bool:
        """验证包管理器使用"""
        print("🔍 验证包管理器使用...")
        
        success = True
        
        # 检查JavaScript项目
        js_projects = ["frontend", "admin", "website", "extension"]
        for project in js_projects:
            project_dir = self.project_root / project
            if not project_dir.exists():
                continue
                
            package_json = project_dir / "package.json"
            if not package_json.exists():
                continue
            
            # 检查锁文件
            pnpm_lock = project_dir / "pnpm-lock.yaml"
            npm_lock = project_dir / "package-lock.json"
            yarn_lock = project_dir / "yarn.lock"
            
            lock_files = []
            if pnpm_lock.exists():
                lock_files.append("pnpm-lock.yaml")
            if npm_lock.exists():
                lock_files.append("package-lock.json")
            if yarn_lock.exists():
                lock_files.append("yarn.lock")
            
            if len(lock_files) > 1:
                self.errors.append(f"{project}: 发现多个包管理器锁文件: {', '.join(lock_files)}")
                success = False
            elif len(lock_files) == 0:
                self.warnings.append(f"{project}: 未找到包管理器锁文件")
            elif lock_files[0] != "pnpm-lock.yaml":
                self.warnings.append(f"{project}: 建议使用pnpm作为包管理器")
        
        # 检查Python项目
        python_projects = ["backend"]
        for project in python_projects:
            project_dir = self.project_root / project
            if not project_dir.exists():
                continue
            
            # 检查Python包管理器文件
            uv_lock = project_dir / "uv.lock"
            requirements = project_dir / "requirements.txt"
            poetry_lock = project_dir / "poetry.lock"
            pipfile_lock = project_dir / "Pipfile.lock"
            
            python_files = []
            if uv_lock.exists():
                python_files.append("uv.lock")
            if requirements.exists():
                python_files.append("requirements.txt")
            if poetry_lock.exists():
                python_files.append("poetry.lock")
            if pipfile_lock.exists():
                python_files.append("Pipfile.lock")
            
            if len(python_files) > 1:
                self.warnings.append(f"{project}: 发现多个Python包管理器文件: {', '.join(python_files)}")
            elif len(python_files) == 0:
                self.errors.append(f"{project}: 未找到Python包管理器文件")
                success = False
            elif python_files[0] != "uv.lock":
                self.warnings.append(f"{project}: 建议使用uv作为Python包管理器")
            
            # 检查Python项目中是否有npm文件
            npm_files = ["package.json", "package-lock.json", "node_modules"]
            found_npm_files = []
            for npm_file in npm_files:
                if (project_dir / npm_file).exists():
                    found_npm_files.append(npm_file)
            
            if found_npm_files:
                self.errors.append(f"{project}: Python项目中发现npm文件: {', '.join(found_npm_files)}")
                success = False
        
        if success and not self.warnings:
            self.info.append("✅ 包管理器使用验证通过")
        
        return success
    
    def validate_gitignore(self) -> bool:
        """验证.gitignore文件"""
        print("🔍 验证.gitignore文件...")
        
        gitignore_path = self.project_root / ".gitignore"
        if not gitignore_path.exists():
            self.errors.append("缺少.gitignore文件")
            return False
        
        # 检查必需的忽略模式
        required_patterns = [
            "node_modules/",
            "__pycache__/",
            "*.pyc",
            ".env",
            ".venv/",
            "dist/",
            "build/",
            "*.tsbuildinfo"
        ]
        
        try:
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                gitignore_content = f.read()
            
            missing_patterns = []
            for pattern in required_patterns:
                if pattern not in gitignore_content:
                    missing_patterns.append(pattern)
            
            if missing_patterns:
                self.warnings.append(f".gitignore缺少推荐的忽略模式: {', '.join(missing_patterns)}")
            else:
                self.info.append("✅ .gitignore文件验证通过")
            
            return True
        except Exception as e:
            self.errors.append(f"读取.gitignore文件失败: {e}")
            return False
    
    def validate_docker_files(self) -> bool:
        """验证Docker文件"""
        print("🔍 验证Docker文件...")
        
        # 检查根目录的docker-compose文件
        compose_files = [
            "docker-compose.yml",
            "docker-compose.yaml"
        ]
        
        found_compose = False
        for compose_file in compose_files:
            if (self.project_root / compose_file).exists():
                found_compose = True
                break
        
        if not found_compose:
            self.warnings.append("未找到docker-compose文件")
        
        # 检查各个服务的Dockerfile
        services = ["backend", "frontend", "admin", "website"]
        missing_dockerfiles = []
        
        for service in services:
            service_dir = self.project_root / service
            if service_dir.exists():
                dockerfile = service_dir / "Dockerfile"
                if not dockerfile.exists():
                    missing_dockerfiles.append(service)
        
        if missing_dockerfiles:
            self.warnings.append(f"以下服务缺少Dockerfile: {', '.join(missing_dockerfiles)}")
        else:
            self.info.append("✅ Docker文件验证通过")
        
        return True
    
    def validate_documentation(self) -> bool:
        """验证文档"""
        print("🔍 验证文档...")
        
        required_docs = [
            "README.md",
            "development.md",
            "deployment.md"
        ]
        
        missing_docs = []
        for doc in required_docs:
            if not (self.project_root / doc).exists():
                missing_docs.append(doc)
        
        if missing_docs:
            self.warnings.append(f"缺少推荐的文档文件: {', '.join(missing_docs)}")
        else:
            self.info.append("✅ 文档验证通过")
        
        return True
    
    def run_conflict_detection(self) -> Tuple[bool, int]:
        """运行冲突检测"""
        print("🔍 运行冲突检测...")
        
        try:
            detector = ConflictDetector(str(self.project_root))
            conflicts = detector.detect_conflicts()
            
            if not conflicts:
                self.info.append("✅ 未发现文件冲突")
                return True, 0
            
            # 统计各级别冲突
            high_conflicts = [c for c in conflicts if c.severity == "high"]
            medium_conflicts = [c for c in conflicts if c.severity == "medium"]
            low_conflicts = [c for c in conflicts if c.severity == "low"]
            
            if high_conflicts:
                self.errors.append(f"发现 {len(high_conflicts)} 个高严重级别冲突")
            if medium_conflicts:
                self.warnings.append(f"发现 {len(medium_conflicts)} 个中等严重级别冲突")
            if low_conflicts:
                self.info.append(f"发现 {len(low_conflicts)} 个低严重级别冲突")
            
            return len(high_conflicts) == 0, len(conflicts)
            
        except Exception as e:
            self.errors.append(f"冲突检测失败: {e}")
            return False, 0
    
    def validate_all(self) -> bool:
        """运行所有验证"""
        print("🚀 开始项目验证...")
        print("=" * 50)
        
        validations = [
            self.validate_directory_structure,
            self.validate_package_managers,
            self.validate_gitignore,
            self.validate_docker_files,
            self.validate_documentation
        ]
        
        success = True
        for validation in validations:
            if not validation():
                success = False
        
        # 运行冲突检测
        conflict_success, conflict_count = self.run_conflict_detection()
        if not conflict_success:
            success = False
        
        return success
    
    def generate_report(self) -> str:
        """生成验证报告"""
        report = ["📋 项目验证报告", "=" * 50, ""]
        
        if self.errors:
            report.extend(["❌ 错误:", ""])
            for i, error in enumerate(self.errors, 1):
                report.append(f"  {i}. {error}")
            report.append("")
        
        if self.warnings:
            report.extend(["⚠️  警告:", ""])
            for i, warning in enumerate(self.warnings, 1):
                report.append(f"  {i}. {warning}")
            report.append("")
        
        if self.info:
            report.extend(["ℹ️  信息:", ""])
            for i, info in enumerate(self.info, 1):
                report.append(f"  {i}. {info}")
            report.append("")
        
        # 总结
        report.extend([
            "📊 总结:",
            f"  ❌ 错误: {len(self.errors)}",
            f"  ⚠️  警告: {len(self.warnings)}",
            f"  ℹ️  信息: {len(self.info)}",
            ""
        ])
        
        if self.errors:
            report.extend([
                "💡 建议:",
                "  1. 运行 'make clean-conflicts' 自动解决冲突",
                "  2. 检查并修复上述错误",
                "  3. 重新运行验证: 'make validate-project-structure'"
            ])
        else:
            report.append("✅ 项目验证通过！")
        
        return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(description="验证Nexus项目结构和配置")
    parser.add_argument("--project-root", default=".", help="项目根目录路径")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="输出格式")
    parser.add_argument("--fix", action="store_true", help="自动修复可修复的问题")
    
    args = parser.parse_args()
    
    validator = ProjectValidator(args.project_root)
    success = validator.validate_all()
    
    if args.format == "json":
        result = {
            "success": success,
            "errors": validator.errors,
            "warnings": validator.warnings,
            "info": validator.info,
            "timestamp": datetime.now().isoformat()
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        report = validator.generate_report()
        print(report)
    
    # 如果有错误，返回非零退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 