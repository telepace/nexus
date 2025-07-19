# AI分析卡片标题动态化实施计划

## 任务列表

- [x] 1. 修改AnalysisContentRenderer组件支持extendable按钮点击
  - 具体要做的事情：添加onExpandableClick回调函数，支持extendable按钮触发AI分析
  - 修改文件：`frontend/components/ui/AnalysisContentRenderer.tsx`
  - 需求：需求1的验收标准1-5

- [x] 2. 修改AI分析卡片组件支持动态标题
  - 具体要做的事情：修改相关AI分析卡片组件，支持自定义标题参数
  - 修改文件：`frontend/components/ai/UnifiedAIAnalysisCard.tsx`、`frontend/components/ai/ModernAnalysisInterface.tsx`
  - 需求：需求1的验收标准1-5

- [x] 3. 集成extendable按钮与AI分析系统
  - 具体要做的事情：在父组件中实现onExpandableClick回调，连接extendable按钮与AI分析
  - 修改文件：使用AnalysisContentRenderer的父组件
  - 需求：需求1的验收标准1-5

## 任务状态

- ✅ 已完成：任务1-3
- 🔄 进行中：无
- ⏳ 待开始：无

## 验收检查

### 需求1验收检查
- [x] 点击extendable按钮触发AI分析功能
- [x] extendable文本作为分析卡片标题
- [x] 默认情况下显示"AI分析"标题
- [x] 问题名称正确传递到prompt中
- [x] 根据触发方式显示相应标题

## 测试建议

1. 测试extendable按钮点击触发AI分析功能
2. 验证动态标题在不同场景下的正确显示
3. 测试深色/浅色模式下的标题显示
4. 验证响应式布局在不同屏幕尺寸下的表现 