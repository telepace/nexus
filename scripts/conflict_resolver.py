#!/usr/bin/env python3
"""
Nexus项目冲突解决器
自动解决检测到的文件冲突，包括：
1. 删除冲突的依赖管理文件
2. 删除重复的功能文件
3. 生成清理报告
4. 支持按严重级别过滤
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import List, Dict, Optional
import argparse
from datetime import datetime

# 导入冲突检测器
from conflict_detector import ConflictDetector, ConflictResult


class ConflictResolver:
    """冲突解决器"""
    
    def __init__(self, project_root: str, dry_run: bool = False, config_file: Optional[str] = None):
        self.project_root = Path(project_root)
        self.dry_run = dry_run
        self.detector = ConflictDetector(project_root, config_file)
        self.removed_files: List[str] = []
        self.failed_removals: List[Dict[str, str]] = []
        self.backup_dir: Optional[Path] = None
        
    def _setup_backup_dir(self) -> Path:
        """设置备份目录"""
        if self.backup_dir is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.backup_dir = self.project_root / "_output" / "backups" / f"conflict_cleanup_{timestamp}"
            self.backup_dir.mkdir(parents=True, exist_ok=True)
        return self.backup_dir
        
    def resolve_conflicts(self, auto_confirm: bool = False, severity_filter: Optional[str] = None, 
                         create_backup: bool = True) -> bool:
        """解决所有检测到的冲突"""
        conflicts = self.detector.detect_conflicts()
        
        # 按严重级别过滤
        if severity_filter:
            conflicts = [c for c in conflicts if c.severity == severity_filter]
        
        if not conflicts:
            if severity_filter:
                print(f"✅ 未发现 '{severity_filter}' 级别的文件冲突，无需清理")
            else:
                print("✅ 未发现文件冲突，无需清理")
            return True
        
        # 按严重级别排序显示
        severity_order = {"high": 0, "medium": 1, "low": 2}
        sorted_conflicts = sorted(conflicts, key=lambda x: severity_order.get(x.severity, 3))
        
        print(f"🔍 发现 {len(conflicts)} 个冲突")
        if severity_filter:
            print(f"   (已过滤为 '{severity_filter}' 级别)")
        
        # 显示冲突详情
        for i, conflict in enumerate(sorted_conflicts, 1):
            severity_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(conflict.severity, "⚪")
            print(f"\n{i}. {severity_emoji} {conflict.description} ({conflict.directory})")
            print(f"   严重级别: {conflict.severity}")
            print(f"   发现的文件: {', '.join(conflict.found_files)}")
            print(f"   首选文件: {conflict.preferred_file or '无（建议删除所有）'}")
            print(f"   建议删除: {', '.join(conflict.conflicting_files)}")
        
        # 获取所有要删除的文件
        files_to_remove = []
        for conflict in conflicts:
            files_to_remove.extend(conflict.conflicting_files)
        
        if not files_to_remove:
            print("✅ 所有冲突都已使用首选文件，无需删除任何文件")
            return True
        
        print(f"\n📋 总共需要删除 {len(files_to_remove)} 个文件:")
        for file_path in files_to_remove:
            print(f"   - {file_path}")
        
        # 设置备份
        if create_backup and not self.dry_run:
            backup_dir = self._setup_backup_dir()
            print(f"\n💾 备份目录: {backup_dir}")
        
        # 确认删除
        if not auto_confirm and not self.dry_run:
            response = input(f"\n❓ 确认删除这些文件吗? (y/N): ").strip().lower()
            if response not in ['y', 'yes']:
                print("❌ 操作已取消")
                return False
        
        # 执行删除
        success = self._remove_files(files_to_remove, create_backup)
        
        # 生成报告
        self._generate_cleanup_report(conflicts, files_to_remove)
        
        return success
    
    def _backup_file(self, file_path: str) -> bool:
        """备份文件"""
        if self.backup_dir is None:
            return False
            
        try:
            source_path = self.project_root / file_path
            backup_path = self.backup_dir / file_path
            
            # 确保备份目录存在
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            if source_path.is_file():
                shutil.copy2(source_path, backup_path)
            elif source_path.is_dir():
                shutil.copytree(source_path, backup_path, dirs_exist_ok=True)
            
            return True
        except Exception as e:
            print(f"⚠️  备份文件失败 {file_path}: {e}")
            return False
    
    def _remove_files(self, files_to_remove: List[str], create_backup: bool = True) -> bool:
        """删除指定的文件"""
        success = True
        
        for file_path in files_to_remove:
            full_path = self.project_root / file_path
            
            if self.dry_run:
                print(f"🔍 [DRY RUN] 将删除: {file_path}")
                self.removed_files.append(file_path)
                continue
            
            try:
                if full_path.exists():
                    # 创建备份
                    if create_backup:
                        self._backup_file(file_path)
                    
                    # 删除文件或目录
                    if full_path.is_file():
                        full_path.unlink()
                        print(f"✅ 已删除文件: {file_path}")
                        self.removed_files.append(file_path)
                    elif full_path.is_dir():
                        shutil.rmtree(full_path)
                        print(f"✅ 已删除目录: {file_path}")
                        self.removed_files.append(file_path)
                else:
                    print(f"⚠️  文件不存在: {file_path}")
            except Exception as e:
                error_msg = f"删除 {file_path} 时出错: {str(e)}"
                print(f"❌ {error_msg}")
                self.failed_removals.append({
                    "file": file_path,
                    "error": str(e)
                })
                success = False
        
        return success
    
    def _generate_cleanup_report(self, conflicts: List[ConflictResult], files_to_remove: List[str]):
        """生成清理报告"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.project_root / f"_output/conflict_cleanup_report_{timestamp}.json"
        
        # 确保输出目录存在
        report_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 统计信息
        severity_stats = {}
        for conflict in conflicts:
            severity_stats[conflict.severity] = severity_stats.get(conflict.severity, 0) + 1
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "dry_run": self.dry_run,
            "backup_directory": str(self.backup_dir) if self.backup_dir else None,
            "conflicts_detected": len(conflicts),
            "files_to_remove": len(files_to_remove),
            "files_removed": len(self.removed_files),
            "failed_removals": len(self.failed_removals),
            "severity_stats": severity_stats,
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
                for c in conflicts
            ],
            "removed_files": self.removed_files,
            "failed_removals": self.failed_removals
        }
        
        # 保存JSON报告
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 清理报告已保存到: {report_file}")
        
        # 显示摘要
        print(f"\n📊 清理摘要:")
        print(f"   检测到冲突: {len(conflicts)}")
        for severity, count in severity_stats.items():
            emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")
            print(f"   {emoji} {severity}: {count}")
        print(f"   需要删除的文件: {len(files_to_remove)}")
        print(f"   成功删除: {len(self.removed_files)}")
        if self.failed_removals:
            print(f"   删除失败: {len(self.failed_removals)}")
        if self.backup_dir:
            print(f"   备份位置: {self.backup_dir}")
        
        if self.dry_run:
            print(f"\n💡 这是预览模式，实际文件未被删除")
            print(f"   运行 'make clean-conflicts' 执行实际删除")
    
    def resolve_specific_conflict(self, rule_name: str, create_backup: bool = True) -> bool:
        """解决特定类型的冲突"""
        conflicts = self.detector.detect_conflicts()
        specific_conflicts = [c for c in conflicts if c.rule_name == rule_name]
        
        if not specific_conflicts:
            print(f"✅ 未发现 '{rule_name}' 类型的冲突")
            return True
        
        print(f"🔍 发现 {len(specific_conflicts)} 个 '{rule_name}' 类型的冲突")
        
        files_to_remove = []
        for conflict in specific_conflicts:
            files_to_remove.extend(conflict.conflicting_files)
        
        if not files_to_remove:
            print("✅ 所有冲突都已使用首选文件，无需删除任何文件")
            return True
        
        # 设置备份
        if create_backup and not self.dry_run:
            self._setup_backup_dir()
        
        return self._remove_files(files_to_remove, create_backup)
    
    def resolve_by_severity(self, severity: str, auto_confirm: bool = False, 
                           create_backup: bool = True) -> bool:
        """按严重级别解决冲突"""
        return self.resolve_conflicts(auto_confirm, severity, create_backup)
    
    def list_conflicts_by_severity(self) -> Dict[str, List[ConflictResult]]:
        """按严重级别列出冲突"""
        conflicts = self.detector.detect_conflicts()
        result = {"high": [], "medium": [], "low": []}
        
        for conflict in conflicts:
            if conflict.severity in result:
                result[conflict.severity].append(conflict)
        
        return result


def main():
    parser = argparse.ArgumentParser(description="解决Nexus项目中的文件冲突")
    parser.add_argument("--project-root", default=".", help="项目根目录路径")
    parser.add_argument("--config", help="配置文件路径")
    parser.add_argument("--dry-run", action="store_true", help="预览模式，不实际删除文件")
    parser.add_argument("--auto-confirm", action="store_true", help="自动确认删除，不询问用户")
    parser.add_argument("--rule", help="只解决特定规则的冲突")
    parser.add_argument("--severity", choices=["high", "medium", "low"], help="只解决指定严重级别的冲突")
    parser.add_argument("--no-backup", action="store_true", help="不创建备份")
    parser.add_argument("--list-by-severity", action="store_true", help="按严重级别列出冲突")
    
    args = parser.parse_args()
    
    resolver = ConflictResolver(args.project_root, args.dry_run, args.config)
    
    if args.list_by_severity:
        conflicts_by_severity = resolver.list_conflicts_by_severity()
        for severity, conflicts in conflicts_by_severity.items():
            if conflicts:
                emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")
                print(f"\n{emoji} {severity.upper()} 级别冲突 ({len(conflicts)}个):")
                for conflict in conflicts:
                    print(f"  - {conflict.description} ({conflict.directory})")
        return
    
    create_backup = not args.no_backup
    
    if args.rule:
        success = resolver.resolve_specific_conflict(args.rule, create_backup)
    elif args.severity:
        success = resolver.resolve_by_severity(args.severity, args.auto_confirm, create_backup)
    else:
        success = resolver.resolve_conflicts(args.auto_confirm, None, create_backup)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 