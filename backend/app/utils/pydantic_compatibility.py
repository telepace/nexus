"""
Pydantic 兼容性模块
解决 GPT Researcher 与 Pydantic 的兼容性问题
"""

import warnings
import logging

logger = logging.getLogger(__name__)

def apply_fixes():
    """应用兼容性修复"""
    # 抑制警告
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="pydantic")
    warnings.filterwarnings("ignore", message=".*root_validator.*")
    warnings.filterwarnings("ignore", message=".*ClassVar.*")
    
    # 修复 root_validator
    try:
        import pydantic
        from pydantic import root_validator
        
        original_root_validator = root_validator
        
        def patched_root_validator(pre=False, allow_reuse=False, skip_on_failure=None):
            if not pre and skip_on_failure is None:
                skip_on_failure = True
            return original_root_validator(
                pre=pre, 
                allow_reuse=allow_reuse, 
                skip_on_failure=skip_on_failure
            )
        
        pydantic.root_validator = patched_root_validator
        
        # 修复 deprecated 模块
        try:
            from pydantic.deprecated.class_validators import root_validator as deprecated_root_validator
            
            def patched_deprecated_root_validator(pre=False, allow_reuse=False, skip_on_failure=None):
                if not pre and skip_on_failure is None:
                    skip_on_failure = True
                return deprecated_root_validator(
                    pre=pre, 
                    allow_reuse=allow_reuse, 
                    skip_on_failure=skip_on_failure
                )
            
            pydantic.deprecated.class_validators.root_validator = patched_deprecated_root_validator
        except ImportError:
            pass
            
    except ImportError:
        pass
    
    # 修复 Pydantic 内部检查
    try:
        import pydantic._internal._model_construction as model_construction
        if hasattr(model_construction, 'inspect_namespace'):
            original_inspect_namespace = model_construction.inspect_namespace
            
            def patched_inspect_namespace(namespace, ignored_types=None, base_class_vars=None, base_class_fields=None):
                try:
                    return original_inspect_namespace(namespace, ignored_types, base_class_vars, base_class_fields)
                except TypeError as e:
                    if "ClassVar" in str(e) and "isinstance" in str(e):
                        logger.warning(f"跳过 ClassVar isinstance 错误: {e}")
                        return {}, {}, set()
                    raise
            
            model_construction.inspect_namespace = patched_inspect_namespace
    except ImportError:
        pass

# 自动应用修复
apply_fixes()
