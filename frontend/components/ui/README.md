# 🎨 UI组件使用指南

基于Tailwind CSS v4 + shadcn/ui + Radix UI的设计系统组件库使用指南。

## 📋 目录

- [按钮组件 (Button)](#-按钮组件-button)
- [按钮组 (ButtonGroup)](#-按钮组-buttongroup)
- [卡片组件 (Card)](#-卡片组件-card)
- [间距工具类](#-间距工具类)
- [响应式设计](#-响应式设计)
- [最佳实践](#-最佳实践)

## 🔘 按钮组件 (Button)

### 基本用法

```tsx
import { Button } from "@/components/ui/button";

// 主要按钮
<Button>保存</Button>

// 次要按钮
<Button variant="outline">取消</Button>

// 危险操作按钮
<Button variant="destructive">删除</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="default">默认按钮</Button>
<Button size="lg">大按钮</Button>

// 图标按钮
<Button size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

### 按钮变体说明

- `default`: 主要操作按钮（蓝色）
- `destructive`: 危险操作按钮（红色）
- `outline`: 次要操作按钮（边框）
- `secondary`: 辅助按钮（灰色）
- `ghost`: 幽灵按钮（透明背景）
- `link`: 链接样式按钮

## 🔗 按钮组 (ButtonGroup)

### 基本用法

```tsx
import { Button, ButtonGroup } from "@/components/ui/button";

// 默认右对齐，gap-3间距
<ButtonGroup>
  <Button variant="outline">取消</Button>
  <Button>确认</Button>
</ButtonGroup>

// 小间距
<ButtonGroup size="sm">
  <Button size="sm">按钮1</Button>
  <Button size="sm">按钮2</Button>
</ButtonGroup>

// 大间距
<ButtonGroup size="lg">
  <Button size="lg">按钮1</Button>
  <Button size="lg">按钮2</Button>
</ButtonGroup>
```

### 对齐方式

```tsx
// 左对齐
<ButtonGroup justify="start">
  <Button variant="outline">编辑</Button>
  <Button variant="destructive">删除</Button>
</ButtonGroup>

// 居中对齐
<ButtonGroup justify="center">
  <Button>开始使用</Button>
</ButtonGroup>

// 两端对齐
<ButtonGroup justify="between">
  <Button variant="outline">上一步</Button>
  <Button>下一步</Button>
</ButtonGroup>
```

### 垂直布局

```tsx
<ButtonGroup orientation="vertical" justify="start">
  <Button variant="outline">选项1</Button>
  <Button variant="outline">选项2</Button>
  <Button>确认</Button>
</ButtonGroup>
```

### 响应式布局

```tsx
// 在小屏幕上自动变为垂直布局
<ButtonGroup responsive>
  <Button variant="outline" className="w-full sm:w-auto">取消</Button>
  <Button className="w-full sm:w-auto">确认</Button>
</ButtonGroup>
```

## 🃏 卡片组件 (Card)

### 标准卡片结构

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, ButtonGroup } from "@/components/ui/button";

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>
      卡片描述信息
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p>这里是卡片的主要内容。</p>
  </CardContent>
  <CardFooter>
    <ButtonGroup>
      <Button variant="outline">取消</Button>
      <Button>保存</Button>
    </ButtonGroup>
  </CardFooter>
</Card>
```

### CardFooter 最佳实践

```tsx
// ✅ 推荐：使用 ButtonGroup 管理按钮间距
<CardFooter>
  <ButtonGroup>
    <Button variant="outline">分享</Button>
    <Button variant="secondary">下载</Button>
  </ButtonGroup>
</CardFooter>

// ✅ 推荐：单个按钮居中
<CardFooter className="justify-center">
  <Button>立即体验</Button>
</CardFooter>

// ✅ 推荐：左对齐按钮组
<CardFooter>
  <ButtonGroup justify="start">
    <Button variant="outline">编辑</Button>
    <Button variant="destructive">删除</Button>
  </ButtonGroup>
</CardFooter>

// ❌ 不推荐：手动设置间距
<CardFooter className="flex justify-end gap-2">
  <Button variant="outline">取消</Button>
  <Button>确认</Button>
</CardFooter>
```

### 完整卡片示例

```tsx
function UserProfileCard() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatar.jpg" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          John Doe
        </CardTitle>
        <CardDescription>
          高级开发工程师 • 加入于 2023年1月
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">项目数</span>
            <div className="font-medium">12</div>
          </div>
          <div>
            <span className="text-muted-foreground">贡献数</span>
            <div className="font-medium">156</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">React</Badge>
          <Badge variant="secondary">TypeScript</Badge>
          <Badge variant="secondary">Node.js</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <ButtonGroup>
          <Button variant="outline">发送消息</Button>
          <Button>查看资料</Button>
        </ButtonGroup>
      </CardFooter>
    </Card>
  );
}
```

## 🎨 间距工具类

### 按钮组合间距

```tsx
// 使用工具类
<div className="button-group">
  <Button variant="outline">按钮1</Button>
  <Button>按钮2</Button>
</div>

<div className="button-group-sm">
  <Button size="sm">小按钮1</Button>
  <Button size="sm">小按钮2</Button>
</div>

<div className="button-group-lg">
  <Button size="lg">大按钮1</Button>
  <Button size="lg">大按钮2</Button>
</div>
```

### 卡片动作区域

```tsx
// 使用工具类
<div className="card-actions">
  <Button variant="outline">取消</Button>
  <Button>确认</Button>
</div>

<div className="card-actions-start">
  <Button variant="outline">编辑</Button>
  <Button variant="destructive">删除</Button>
</div>

<div className="card-actions-center">
  <Button>开始使用</Button>
</div>

<div className="card-actions-between">
  <Button variant="outline">取消</Button>
  <Button>保存</Button>
</div>
```

### 优雅的底部间距

```tsx
// 为组件添加优雅的底部间距
<div className="elegant-bottom-spacing">
  <h2>标题内容</h2>
  <p>这个区域会有优雅的底部间距</p>
</div>

<div className="elegant-bottom-spacing-sm">
  <p>小的底部间距</p>
</div>

<div className="elegant-bottom-spacing-lg">
  <h1>大的底部间距</h1>
</div>
```

### 表单区域间距

```tsx
// 表单区域自动间距和分隔线
<form>
  <div className="form-section">
    <h3>基本信息</h3>
    <div className="space-y-4">
      <Input placeholder="姓名" />
      <Input placeholder="邮箱" />
    </div>
  </div>
  
  <div className="form-section">
    <h3>联系方式</h3>
    <div className="space-y-4">
      <Input placeholder="电话" />
      <Input placeholder="地址" />
    </div>
  </div>
  
  <div className="form-section">
    <ButtonGroup>
      <Button variant="outline">取消</Button>
      <Button type="submit">保存</Button>
    </ButtonGroup>
  </div>
</form>
```

## 📱 响应式设计

### 移动端适配

```tsx
// 在小屏幕上垂直排列按钮
<ButtonGroup 
  orientation="horizontal" 
  className="flex-col sm:flex-row"
>
  <Button className="w-full sm:w-auto">按钮1</Button>
  <Button className="w-full sm:w-auto">按钮2</Button>
</ButtonGroup>

// 响应式间距
<ButtonGroup 
  size="sm" 
  className="gap-2 sm:gap-3 lg:gap-4"
>
  <Button>响应式按钮1</Button>
  <Button>响应式按钮2</Button>
</ButtonGroup>

// 使用responsive属性自动适配
<ButtonGroup responsive>
  <Button variant="outline">取消</Button>
  <Button>确认</Button>
</ButtonGroup>
```

### 卡片响应式布局

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>
    <CardHeader>
      <CardTitle>卡片1</CardTitle>
    </CardHeader>
    <CardContent>
      <p>内容...</p>
    </CardContent>
    <CardFooter>
      <ButtonGroup responsive>
        <Button variant="outline">操作1</Button>
        <Button>操作2</Button>
      </ButtonGroup>
    </CardFooter>
  </Card>
</div>
```

## 🎯 最佳实践

### DO ✅

1. **使用 ButtonGroup 组件**管理多个按钮的间距
2. **在 CardFooter 中放置主要操作按钮**
3. **使用语义化的按钮变体**（primary、secondary、destructive）
4. **保持一致的间距规范**（gap-2、gap-3、gap-4）
5. **为交互元素添加适当的 hover 和 focus 状态**
6. **使用响应式设计**确保移动端体验
7. **利用工具类**保持设计一致性

### DON'T ❌

1. **不要手动设置按钮间距**（避免使用 `flex gap-2` 等）
2. **不要在 CardContent 中放置主要操作按钮**
3. **不要混用不同的间距规范**
4. **不要忽略无障碍访问性**
5. **不要在小屏幕上使用过小的按钮**
6. **不要过度使用阴影效果**

### 模态框和对话框

```tsx
// 推荐的模态框按钮布局
<div className="modal-actions">
  <Button variant="outline">取消</Button>
  <Button variant="destructive">确认删除</Button>
</div>

// 响应式模态框按钮
<ButtonGroup responsive className="modal-actions">
  <Button variant="outline" className="w-full sm:w-auto">取消</Button>
  <Button className="w-full sm:w-auto">确认</Button>
</ButtonGroup>
```

### 表单提交按钮

```tsx
// 表单底部按钮布局
<div className="form-section">
  <ButtonGroup justify="between" responsive>
    <Button variant="outline" type="button">
      返回上一步
    </Button>
    <div className="flex gap-3">
      <Button variant="outline" type="reset">
        重置
      </Button>
      <Button type="submit">
        提交
      </Button>
    </div>
  </ButtonGroup>
</div>
```

## 📚 相关组件

- [Alert Dialog](./alert-dialog.tsx) - 确认对话框
- [Dialog](./dialog.tsx) - 通用对话框
- [Form](./form.tsx) - 表单组件
- [Badge](./badge.tsx) - 标签组件
- [Avatar](./avatar.tsx) - 头像组件

---

遵循这些指南可以确保UI组件的一致性和用户体验的优雅性。如有疑问，请参考设计规范文档或联系设计团队。 