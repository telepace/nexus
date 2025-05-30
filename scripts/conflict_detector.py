#!/usr/bin/env python3
"""
Nexus项目冲突检测器
检测项目中的文件冲突，包括：
1. 依赖管理文件冲突（package-lock.json vs pnpm-lock.yaml等）
2. 重复功能文件（如sidepanel相关文件）
3. 配置文件冲突
4. 其他潜在冲突
"""

import os
import json
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
import argparse
import fnmatch


@dataclass
class ConflictRule:
    """冲突规则定义"""
    name: str
    description: str
    conflicting_files: List[str]  # 冲突的文件模式
    preferred_file: str  # 首选文件
    directories: List[str] = None  # 限制检查的目录，None表示全项目
    severity: str = "medium"  # 严重级别: low, medium, high
    enabled: bool = True  # 是否启用此规则
    max_depth: int = 2  # 最大扫描深度


@dataclass
class ConflictResult:
    """冲突检测结果"""
    rule_name: str
    description: str
    found_files: List[str]
    preferred_file: str
    conflicting_files: List[str]
    directory: str
    severity: str = "medium"


class ConflictDetector:
    """冲突检测器"""
    
    def __init__(self, project_root: str, config_file: Optional[str] = None):
        self.project_root = Path(project_root)
        self.conflicts: List[ConflictResult] = []
        self.config = self._load_config(config_file)
        self.rules = self._build_rules()
        
    def _load_config(self, config_file: Optional[str]) -> Dict:
        """加载配置文件"""
        if config_file is None:
            config_file = self.project_root / ".nexus-conflict-rules.yaml"
        
        if not Path(config_file).exists():
            return self._get_default_config()
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️  加载配置文件失败: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """获取默认配置"""
        return {
            "preferences": {
                "js_package_manager": "pnpm",
                "python_package_manager": "uv"
            },
            "rules": {},
            "ignore": {
                "files": ["*.backup", "*.tmp"],
                "directories": ["node_modules", ".git", "_output", ".venv"]
            }
        }
    
    def _build_rules(self) -> List[ConflictRule]:
        """构建冲突规则"""
        rules = []
        
        # 从配置文件加载规则
        config_rules = self.config.get("rules", {})
        
        # 基础规则定义
        base_rules = [
            # JavaScript/Node.js 包管理器冲突
            ConflictRule(
                name="js_package_managers",
                description="JavaScript项目包管理器冲突",
                conflicting_files=["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"],
                preferred_file="pnpm-lock.yaml",
                directories=["frontend", "admin", "website", "extension"],
                severity="high"
            ),
            
            # Python 包管理器冲突
            ConflictRule(
                name="python_package_managers",
                description="Python项目包管理器冲突",
                conflicting_files=["requirements.txt", "uv.lock", "poetry.lock", "Pipfile.lock", "pdm.lock"],
                preferred_file="uv.lock",
                directories=["backend"],
                severity="high"
            ),
            
            # Python项目中的npm文件（错误配置）
            ConflictRule(
                name="python_npm_conflict",
                description="Python项目中存在npm相关文件",
                conflicting_files=["package.json", "package-lock.json", "node_modules"],
                preferred_file="",  # 应该删除所有
                directories=["backend"],
                severity="high"
            ),
            
            # sidepanel 文件重复
            ConflictRule(
                name="sidepanel_duplicates",
                description="sidepanel功能文件重复",
                conflicting_files=[
                    "sidepanel/index.js",
                    "sidepanel.js", 
                    "sidepanel.tsx",
                    "sidepanel.html"
                ],
                preferred_file="sidepanel.tsx",
                directories=["extension"],
                severity="medium"
            ),
            
            # Next.js配置文件冲突
            ConflictRule(
                name="nextjs_config_conflict",
                description="Next.js配置文件冲突",
                conflicting_files=["next.config.js", "next.config.mjs", "next.config.ts"],
                preferred_file="next.config.mjs",
                directories=["frontend", "website"],
                severity="medium"
            ),
            
            # Jest配置文件过多
            ConflictRule(
                name="jest_config_excessive",
                description="Jest配置文件过多",
                conflicting_files=[
                    "jest.config.js", "jest.config.ts", "jest.config.json",
                    "jest.env.js", "jest.resolver.js", "jest.resolver.stub.js"
                ],
                preferred_file="jest.config.ts",
                directories=["frontend", "admin", "extension"],
                severity="low"
            ),
            
            # TypeScript构建文件（应该被忽略）
            ConflictRule(
                name="typescript_build_artifacts",
                description="TypeScript构建产物文件",
                conflicting_files=["tsconfig.tsbuildinfo", "*.tsbuildinfo"],
                preferred_file="",  # 应该删除
                severity="low"
            ),
            
            # 重复的启动脚本
            ConflictRule(
                name="duplicate_start_scripts",
                description="重复的启动脚本",
                conflicting_files=["start.sh", "start_backend.sh", "start_frontend.sh"],
                preferred_file="",  # 使用Makefile代替
                severity="low"
            ),
            
            # 调试文件过多
            ConflictRule(
                name="debug_files_excessive",
                description="调试文件过多",
                conflicting_files=[
                    "debug-*.js", "test-*.js", "init-*.js",
                    "debug.js", "test.js"
                ],
                preferred_file="",
                directories=["extension"],
                severity="low"
            ),
            
            # ESLint配置文件冲突
            ConflictRule(
                name="eslint_configs",
                description="ESLint配置文件冲突",
                conflicting_files=[
                    ".eslintrc.js", ".eslintrc.json", ".eslintrc.yaml",
                    "eslint.config.js", "eslint.config.mjs"
                ],
                preferred_file="eslint.config.mjs",
                severity="low"
            ),
            
            # Prettier配置文件冲突
            ConflictRule(
                name="prettier_configs",
                description="Prettier配置文件冲突",
                conflicting_files=[
                    ".prettierrc", ".prettierrc.js", ".prettierrc.json",
                    ".prettierrc.yaml", "prettier.config.js"
                ],
                preferred_file="prettier.config.js",
                severity="low"
            ),
            
            # Docker配置文件冲突
            ConflictRule(
                name="docker_configs",
                description="Docker配置文件冲突",
                conflicting_files=[
                    "Dockerfile", "Dockerfile.dev", "Dockerfile.prod",
                    "Dockerfile.local", "Dockerfile.playwright"
                ],
                preferred_file="Dockerfile",
                directories=["backend", "frontend", "admin", "website"],
                severity="medium"
            ),
            
            # 重复的README文件
            ConflictRule(
                name="readme_duplicates",
                description="重复的README文件",
                conflicting_files=[
                    "README.md", "README-*.md", "readme.md", "Readme.md"
                ],
                preferred_file="README.md",
                severity="low"
            )
        ]
        
        # 应用配置文件中的规则覆盖
        for rule in base_rules:
            if rule.name in config_rules:
                config_rule = config_rules[rule.name]
                if not config_rule.get("enabled", True):
                    continue
                
                # 更新规则属性
                rule.severity = config_rule.get("severity", rule.severity)
                rule.preferred_file = config_rule.get("preferred_file", rule.preferred_file)
                rule.conflicting_files = config_rule.get("conflicting_files", rule.conflicting_files)
                rule.directories = config_rule.get("directories", rule.directories)
            
            rules.append(rule)
        
        return rules
    
    def _should_ignore_file(self, file_path: Path) -> bool:
        """检查文件是否应该被忽略"""
        ignore_config = self.config.get("ignore", {})
        
        # 检查忽略的文件模式
        for pattern in ignore_config.get("files", []):
            if fnmatch.fnmatch(str(file_path), pattern):
                return True
        
        # 检查忽略的目录
        for ignore_dir in ignore_config.get("directories", []):
            if ignore_dir in file_path.parts:
                return True
        
        return False
    
    def scan_directory(self, directory: Path, patterns: List[str], max_depth: int = 2) -> List[str]:
        """扫描目录中匹配模式的文件"""
        found_files = []
        resolved_paths = set()  # 用于去重，存储已解析的物理路径
        
        if not directory.exists():
            return found_files
        
        def _scan_recursive(current_dir: Path, current_depth: int):
            if current_depth > max_depth:
                return
            
            # 首先获取当前目录中实际存在的所有文件
            try:
                actual_files = {f.name: f for f in current_dir.iterdir() if f.is_file()}
            except (OSError, PermissionError):
                actual_files = {}
            
            for pattern in patterns:
                # 支持通配符匹配
                if "/" in pattern:
                    # 相对路径模式
                    file_path = current_dir / pattern
                    if file_path.exists() and not self._should_ignore_file(file_path):
                        resolved_path = file_path.resolve()
                        if resolved_path not in resolved_paths:
                            resolved_paths.add(resolved_path)
                            # 找到实际的文件名
                            for actual_name, actual_file in actual_files.items():
                                if actual_file.resolve() == resolved_path:
                                    found_files.append(str(actual_file.relative_to(self.project_root)))
                                    break
                else:
                    # 文件名模式 - 支持通配符
                    if "*" in pattern:
                        for file_path in current_dir.glob(pattern):
                            if file_path.is_file() and not self._should_ignore_file(file_path):
                                resolved_path = file_path.resolve()
                                if resolved_path not in resolved_paths:
                                    resolved_paths.add(resolved_path)
                                    found_files.append(str(file_path.relative_to(self.project_root)))
                    else:
                        # 直接文件名匹配 - 只检查实际存在的文件
                        for actual_name, actual_file in actual_files.items():
                            if actual_name == pattern:
                                resolved_path = actual_file.resolve()
                                if resolved_path not in resolved_paths:
                                    resolved_paths.add(resolved_path)
                                    found_files.append(str(actual_file.relative_to(self.project_root)))
                                break
            
            # 递归扫描子目录
            if current_depth < max_depth:
                try:
                    for subdir in current_dir.iterdir():
                        if subdir.is_dir() and not self._should_ignore_file(subdir):
                            _scan_recursive(subdir, current_depth + 1)
                except (OSError, PermissionError):
                    pass
        
        _scan_recursive(directory, 0)
        return found_files
    
    def detect_conflicts(self) -> List[ConflictResult]:
        """检测所有冲突"""
        self.conflicts = []
        
        for rule in self.rules:
            if not rule.enabled:
                continue
                
            if rule.directories:
                # 检查指定目录
                for dir_name in rule.directories:
                    directory = self.project_root / dir_name
                    found_files = self.scan_directory(directory, rule.conflicting_files, rule.max_depth)
                    
                    if len(found_files) > 1:
                        # 找到冲突
                        preferred_found = any(rule.preferred_file in f for f in found_files) if rule.preferred_file else False
                        conflicting = [f for f in found_files if rule.preferred_file not in f] if rule.preferred_file else found_files
                        
                        conflict = ConflictResult(
                            rule_name=rule.name,
                            description=rule.description,
                            found_files=found_files,
                            preferred_file=rule.preferred_file if preferred_found else "",
                            conflicting_files=conflicting,
                            directory=dir_name,
                            severity=rule.severity
                        )
                        self.conflicts.append(conflict)
                    elif len(found_files) == 1 and not rule.preferred_file:
                        # 单个文件但不应该存在（如Python项目中的npm文件）
                        conflict = ConflictResult(
                            rule_name=rule.name,
                            description=rule.description,
                            found_files=found_files,
                            preferred_file="",
                            conflicting_files=found_files,
                            directory=dir_name,
                            severity=rule.severity
                        )
                        self.conflicts.append(conflict)
            else:
                # 检查整个项目
                found_files = self.scan_directory(self.project_root, rule.conflicting_files, rule.max_depth)
                
                if len(found_files) > 1:
                    preferred_found = any(rule.preferred_file in f for f in found_files) if rule.preferred_file else False
                    conflicting = [f for f in found_files if rule.preferred_file not in f] if rule.preferred_file else found_files
                    
                    conflict = ConflictResult(
                        rule_name=rule.name,
                        description=rule.description,
                        found_files=found_files,
                        preferred_file=rule.preferred_file if preferred_found else "",
                        conflicting_files=conflicting,
                        directory="root",
                        severity=rule.severity
                    )
                    self.conflicts.append(conflict)
        
        return self.conflicts
    
    def generate_report(self, format_type: str = "text") -> str:
        """生成冲突报告"""
        if format_type == "json":
            return self._generate_json_report()
        else:
            return self._generate_text_report()
    
    def _generate_text_report(self) -> str:
        """生成文本格式报告"""
        if not self.conflicts:
            return "✅ 未发现文件冲突"
        
        # 按严重级别排序
        severity_order = {"high": 0, "medium": 1, "low": 2}
        sorted_conflicts = sorted(self.conflicts, key=lambda x: severity_order.get(x.severity, 3))
        
        report = ["🔍 文件冲突检测报告", "=" * 50, ""]
        
        for i, conflict in enumerate(sorted_conflicts, 1):
            severity_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(conflict.severity, "⚪")
            report.extend([
                f"{i}. {severity_emoji} {conflict.description} ({conflict.directory})",
                f"   规则: {conflict.rule_name}",
                f"   严重级别: {conflict.severity}",
                f"   发现的文件: {', '.join(conflict.found_files)}",
                f"   首选文件: {conflict.preferred_file or '无（建议删除所有）'}",
                f"   建议删除: {', '.join(conflict.conflicting_files)}",
                ""
            ])
        
        # 统计信息
        high_count = sum(1 for c in self.conflicts if c.severity == "high")
        medium_count = sum(1 for c in self.conflicts if c.severity == "medium")
        low_count = sum(1 for c in self.conflicts if c.severity == "low")
        
        report.extend([
            "📋 总结:",
            f"   🔴 高严重级别: {high_count}",
            f"   🟡 中等严重级别: {medium_count}",
            f"   🟢 低严重级别: {low_count}",
            f"   📁 总冲突数: {len(self.conflicts)}",
            f"   🗑️  建议删除文件数: {sum(len(c.conflicting_files) for c in self.conflicts)}",
            "",
            "💡 运行 'make clean-conflicts' 自动清理这些冲突",
            "💡 运行 'make check-conflicts-dry' 预览清理操作"
        ])
        
        return "\n".join(report)
    
    def _generate_json_report(self) -> str:
        """生成JSON格式报告"""
        data = {
            "conflicts": [
                {
                    "rule_name": c.rule_name,
                    "description": c.description,
                    "directory": c.directory,
                    "severity": c.severity,
                    "found_files": c.found_files,
                    "preferred_file": c.preferred_file,
                    "conflicting_files": c.conflicting_files
                }
                for c in self.conflicts
            ],
            "summary": {
                "total_conflicts": len(self.conflicts),
                "high_severity": sum(1 for c in self.conflicts if c.severity == "high"),
                "medium_severity": sum(1 for c in self.conflicts if c.severity == "medium"),
                "low_severity": sum(1 for c in self.conflicts if c.severity == "low"),
                "files_to_remove": sum(len(c.conflicting_files) for c in self.conflicts)
            }
        }
        return json.dumps(data, indent=2, ensure_ascii=False)
    
    def get_files_to_remove(self, severity_filter: Optional[str] = None) -> List[str]:
        """获取建议删除的文件列表"""
        files_to_remove = []
        severity_order = {"high": 0, "medium": 1, "low": 2}
        
        for conflict in self.conflicts:
            if severity_filter and conflict.severity != severity_filter:
                continue
            files_to_remove.extend(conflict.conflicting_files)
        
        return files_to_remove
    
    def get_conflicts_by_severity(self, severity: str) -> List[ConflictResult]:
        """按严重级别获取冲突"""
        return [c for c in self.conflicts if c.severity == severity]


def main():
    parser = argparse.ArgumentParser(description="检测Nexus项目中的文件冲突")
    parser.add_argument("--project-root", default=".", help="项目根目录路径")
    parser.add_argument("--config", help="配置文件路径")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="输出格式")
    parser.add_argument("--list-files", action="store_true", help="只列出建议删除的文件")
    parser.add_argument("--severity", choices=["high", "medium", "low"], help="只显示指定严重级别的冲突")
    
    args = parser.parse_args()
    
    detector = ConflictDetector(args.project_root, args.config)
    conflicts = detector.detect_conflicts()
    
    if args.list_files:
        files_to_remove = detector.get_files_to_remove(args.severity)
        for file_path in files_to_remove:
            print(file_path)
    else:
        if args.severity:
            detector.conflicts = detector.get_conflicts_by_severity(args.severity)
        report = detector.generate_report(args.format)
        print(report)
    
    # 如果发现高严重级别冲突，返回非零退出码
    high_severity_conflicts = detector.get_conflicts_by_severity("high")
    sys.exit(1 if high_severity_conflicts else 0)


if __name__ == "__main__":
    main() 