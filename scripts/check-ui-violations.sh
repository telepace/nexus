#!/bin/bash

# UI违规检查脚本 - 验证AI代码生成是否符合UI规范
# Check for UI violations in AI-generated code

echo "🔍 检查UI规范违规情况..."
echo "=============================="

violations=0

# 检查硬编码颜色使用
echo "1. 🎨 检查硬编码颜色..."
color_violations=$(grep -r "text-\(blue\|green\|red\|yellow\|purple\|pink\|orange\|cyan\|emerald\|lime\|violet\|fuchsia\|rose\|sky\|indigo\|amber\|teal\)" frontend/components/ --include="*.tsx" --include="*.ts" | grep -v "// AI-APPROVED" | head -20)

if [ -n "$color_violations" ]; then
    echo "❌ 发现颜色违规:"
    echo "$color_violations"
    violations=$((violations + 1))
else
    echo "✅ 无颜色违规"
fi

# 检查背景色违规
echo ""
echo "2. 🎨 检查背景色违规..."
bg_violations=$(grep -r "bg-\(blue\|green\|red\|yellow\|purple\|pink\|orange\|cyan\|emerald\|lime\|violet\|fuchsia\|rose\|sky\|indigo\|amber\|teal\)" frontend/components/ --include="*.tsx" --include="*.ts" | grep -v "// AI-APPROVED" | head -20)

if [ -n "$bg_violations" ]; then
    echo "❌ 发现背景色违规:"
    echo "$bg_violations"
    violations=$((violations + 1))
else
    echo "✅ 无背景色违规"
fi

# 检查渐变色使用
echo ""
echo "3. 🌈 检查渐变色使用..."
gradient_violations=$(grep -r "from-\|to-" frontend/components/ --include="*.tsx" --include="*.ts" | grep -v "// AI-APPROVED" | head -20)

if [ -n "$gradient_violations" ]; then
    echo "❌ 发现渐变色违规:"
    echo "$gradient_violations"
    violations=$((violations + 1))
else
    echo "✅ 无渐变色违规"
fi

# 检查绝对定位使用
echo ""
echo "4. 📐 检查绝对定位使用..."
absolute_violations=$(grep -r "absolute\|fixed" frontend/components/ --include="*.tsx" --include="*.ts" | grep "className=" | head -10)

if [ -n "$absolute_violations" ]; then
    echo "⚠️  发现绝对定位使用 (需要人工检查是否合理):"
    echo "$absolute_violations"
fi

# 检查卡片结构
echo ""
echo "5. 🗃️  检查Card结构规范..."
card_violations=$(grep -r "<Card" frontend/components/ --include="*.tsx" -A 20 | grep -E "(<h[1-6]|<p)" | grep -v "CardTitle\|CardDescription\|CardContent" | head -10)

if [ -n "$card_violations" ]; then
    echo "⚠️  发现可能的Card结构违规 (需要人工检查):"
    echo "$card_violations"
fi

# 检查内联样式
echo ""
echo "6. 🚫 检查内联样式使用..."
inline_style_violations=$(grep -r "style={{" frontend/components/ --include="*.tsx" --include="*.ts" | head -10)

if [ -n "$inline_style_violations" ]; then
    echo "❌ 发现内联样式违规:"
    echo "$inline_style_violations"
    violations=$((violations + 1))
else
    echo "✅ 无内联样式违规"
fi

# 总结
echo ""
echo "=============================="
if [ $violations -eq 0 ]; then
    echo "🎉 恭喜！未发现重大UI规范违规"
else
    echo "⚠️  发现 $violations 类违规，请检查并修复"
fi

echo ""
echo "📋 建议的修复方案:"
echo "- 颜色违规: 使用语义化颜色 (bg-background, text-foreground, text-muted-foreground)"
echo "- 渐变违规: 移除渐变或使用预定义的CSS变量"
echo "- 内联样式: 转换为Tailwind类或添加到globals.css"
echo "- Card结构: 使用CardHeader, CardContent, CardFooter"

exit $violations 