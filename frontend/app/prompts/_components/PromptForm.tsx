"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { X, Plus, Trash, Plus as PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import {
  addPrompt,
  updatePromptAction,
  type TagData,
  type InputVariable,
  type PromptData,
} from "@/components/actions/prompts-action";
import { Switch } from "@/components/ui/switch";

// 创建输入变量的表单schema
const inputVarSchema = z.object({
  name: z.string().min(1, { message: "变量名称必填" }),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

// 创建提示词表单schema
const promptFormSchema = z.object({
  name: z.string().min(1, { message: "名称必填" }),
  description: z.string().optional(),
  content: z.string().min(1, { message: "内容必填" }),
  type: z.string().min(1, { message: "类型必填" }),
  visibility: z.string().min(1, { message: "可见性必填" }),
  tag_ids: z.array(z.string()).optional(),
  input_vars: z.array(inputVarSchema).optional(),
  create_version: z.boolean().default(false),
});

interface PromptFormProps {
  tags: TagData[];
  prompt?: PromptData;
}

export function PromptForm({ tags, prompt }: PromptFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [inputVars, setInputVars] = useState<InputVariable[]>(
    prompt?.input_vars || [],
  );

  // 初始化表单
  const form = useForm<z.infer<typeof promptFormSchema>>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      name: prompt?.name || "",
      description: prompt?.description || "",
      content: prompt?.content || "",
      type: prompt?.type || "simple",
      visibility: prompt?.visibility || "public",
      tag_ids: prompt?.tags?.map((tag) => tag.id) || [],
      input_vars: prompt?.input_vars || [],
      create_version: false,
    },
  });

  // 表单提交处理
  const onSubmit = async (values: z.infer<typeof promptFormSchema>) => {
    try {
      setSubmitting(true);

      // 将表单数据准备为FormData
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("content", values.content);
      formData.append("type", values.type);
      formData.append("visibility", values.visibility);
      formData.append("tag_ids", JSON.stringify(values.tag_ids || []));
      formData.append("input_vars", JSON.stringify(inputVars));

      if (prompt) {
        // 如果是编辑，则调用更新API
        formData.append(
          "create_version",
          values.create_version ? "true" : "false",
        );
        const result = await updatePromptAction(prompt.id, formData);

        if (result.error) {
          toast({
            title: "更新失败",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "更新成功",
            description: "提示词已更新",
          });
          router.push(`/prompts/${prompt.id}`);
        }
      } else {
        // 如果是创建，则调用创建API
        const result = await addPrompt(formData);

        if (result.error) {
          toast({
            title: "创建失败",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "创建成功",
            description: "提示词已创建",
          });
          // 创建成功后的重定向由API处理
        }
      }
    } catch (error) {
      toast({
        title: prompt ? "更新出错" : "创建出错",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 添加输入变量
  const addInputVar = () => {
    setInputVars([
      ...inputVars,
      { name: "", description: "", required: false },
    ]);
  };

  // 移除输入变量
  const removeInputVar = (index: number) => {
    setInputVars(inputVars.filter((_, i) => i !== index));
  };

  // 更新输入变量
  const updateInputVar = (
    index: number,
    field: keyof InputVariable,
    value: any,
  ) => {
    const updatedVars = [...inputVars];
    updatedVars[index] = { ...updatedVars[index], [field]: value };
    setInputVars(updatedVars);
  };

  // 监听输入变量变化，同步到表单
  useEffect(() => {
    form.setValue("input_vars", inputVars);
  }, [inputVars, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入提示词名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入提示词描述（可选）"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 类型和可见性 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择提示词类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="simple">简单提示词</SelectItem>
                      <SelectItem value="chat">聊天提示词</SelectItem>
                      <SelectItem value="template">模板提示词</SelectItem>
                      <SelectItem value="system">系统提示词</SelectItem>
                      <SelectItem value="function">函数提示词</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    提示词的类型决定了它的用途和格式
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>可见性</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择可见性" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">公开</SelectItem>
                      <SelectItem value="private">私有</SelectItem>
                      <SelectItem value="team">团队</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    控制谁可以查看和使用此提示词
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 标签选择 */}
          <FormField
            control={form.control}
            name="tag_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>标签</FormLabel>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`flex items-center px-3 py-1 rounded-full text-sm cursor-pointer 
                                  ${
                                    field.value?.includes(tag.id)
                                      ? `bg-primary text-primary-foreground`
                                      : `bg-muted hover:bg-muted/80`
                                  }`}
                        style={
                          field.value?.includes(tag.id)
                            ? {}
                            : {
                                borderColor: tag.color || "#888",
                                color: tag.color || "#888",
                                backgroundColor: tag.color
                                  ? `${tag.color}10`
                                  : "transparent",
                              }
                        }
                        onClick={() => {
                          const currentValues = field.value || [];
                          const newValues = currentValues.includes(tag.id)
                            ? currentValues.filter((id) => id !== tag.id)
                            : [...currentValues, tag.id];
                          field.onChange(newValues);
                        }}
                      >
                        {tag.name}
                        {field.value?.includes(tag.id) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    ))}
                  </div>
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      暂无可用标签，请先创建标签
                    </p>
                  )}
                </div>
                <FormDescription>选择标签帮助分类和查找提示词</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 提示词内容 */}
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>提示词内容</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="输入提示词内容"
                    rows={10}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  提示词的主体内容，可以包含文本、指令和输入变量
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 输入变量 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>输入变量</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInputVar}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                添加变量
              </Button>
            </div>

            <div className="space-y-4">
              {inputVars.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  没有输入变量，点击"添加变量"按钮添加
                </p>
              ) : (
                inputVars.map((variable, index) => (
                  <Card key={index} className="p-4">
                    <CardContent className="p-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">
                          变量 #{index + 1}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInputVar(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`var-name-${index}`}>变量名</Label>
                          <Input
                            id={`var-name-${index}`}
                            value={variable.name}
                            onChange={(e) =>
                              updateInputVar(index, "name", e.target.value)
                            }
                            placeholder="变量名称，如: user_input"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`var-desc-${index}`}>描述</Label>
                          <Input
                            id={`var-desc-${index}`}
                            value={variable.description || ""}
                            onChange={(e) =>
                              updateInputVar(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="变量描述，可选"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`var-required-${index}`}
                          checked={variable.required || false}
                          onCheckedChange={(checked) =>
                            updateInputVar(index, "required", checked)
                          }
                        />
                        <Label htmlFor={`var-required-${index}`}>必填</Label>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* 创建版本选项 - 仅在编辑模式显示 */}
          {prompt && (
            <FormField
              control={form.control}
              name="create_version"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                  <div className="space-y-1 leading-none">
                    <FormLabel>创建新版本</FormLabel>
                    <FormDescription>
                      启用此选项将创建一个新版本而不是覆盖当前版本
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>

        {/* 表单按钮 */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "提交中..." : prompt ? "更新提示词" : "创建提示词"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
