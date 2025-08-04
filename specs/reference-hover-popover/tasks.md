# 实施计划

## 任务1 - 修复ContentAnalysisView的ReferenceManager集成
- [ ] 在ContentAnalysisView外层包装ReferenceManagerProvider
- [ ] 传递正确的contentId参数
- [ ] 验证ReferenceManager能正确获取原文数据
- _需求: 需求1, 需求3_

## 任务2 - 增强UniversalContentRenderer的引用支持  
- [ ] 修改UniversalContentRenderer，添加contentId参数传递
- [ ] 在MarkdownRenderer调用时传递contentId和enableEnhancedTooltip
- [ ] 测试JSONL格式中ref字段的正确解析
- _需求: 需求1, 需求3_

## 任务3 - 完善ReferenceHyperlinkRenderer配置
- [ ] 确保ReferenceHyperlinkRenderer接收到contentId参数
- [ ] 启用enableEnhancedTooltip选项
- [ ] 配置合适的tooltip延迟时间和显示选项
- _需求: 需求1_

## 任务4 - 实现原文高亮联动功能
- [ ] 在EnhancedReferenceTooltip中添加高亮事件触发
- [ ] 在左侧原文区域监听高亮事件
- [ ] 实现滚动定位和段落高亮效果
- [ ] 添加自动移除高亮的定时器
- _需求: 需求2_

## 任务5 - 优化API错误处理和降级方案
- [ ] 增强referenceApi的错误处理逻辑
- [ ] 完善Mock数据降级方案
- [ ] 添加用户友好的错误提示
- _需求: 需求3_

## 任务6 - 端到端测试和调优
- [ ] 测试完整的悬浮引用流程
- [ ] 验证不同引用格式的解析准确性
- [ ] 性能优化：缓存、防抖、响应时间
- [ ] 浏览器兼容性测试
- _需求: 需求1, 需求2, 需求3_