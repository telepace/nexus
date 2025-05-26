"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addTag } from "@/components/actions/prompts-action";
import { useRouter } from "next/navigation";

// 创建标签表单schema
const tagFormSchema = z.object({
  name: z.string().min(1, { message: "名称必填" }),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
    message: "颜色必须是有效的十六进制颜色代码，例如 #FF5733",
  }),
});

export function TagForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // 初始化表单
  const form = useForm<z.infer<typeof tagFormSchema>>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6", // 默认蓝色
    },
  });

  // 表单提交处理
  const onSubmit = async (values: z.infer<typeof tagFormSchema>) => {
    try {
      setSubmitting(true);

      // 将表单数据准备为FormData
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("color", values.color);

      const result = await addTag(formData);

      if (result.error) {
        toast({
          title: "创建失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "创建成功",
          description: "标签已创建",
        });

        // 重置表单
        form.reset({
          name: "",
          description: "",
          color: "#3B82F6",
        });

        // 刷新页面
        router.refresh();

        // 执行成功回调（如果有）
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      toast({
        title: "创建出错",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input placeholder="输入标签名称" {...field} />
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
              <FormLabel>描述 (可选)</FormLabel>
              <FormControl>
                <Input
                  placeholder="输入标签描述"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>颜色</FormLabel>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border border-gray-300"
                  style={{ backgroundColor: field.value }}
                />
                <FormControl>
                  <Input
                    type="text"
                    placeholder="#RRGGBB"
                    {...field}
                    onBlur={(e) => {
                      // 确保颜色格式正确
                      const value = e.target.value;
                      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                        // 如果格式不正确但有值，尝试修复
                        if (value) {
                          let fixedValue = value;
                          if (!value.startsWith("#")) {
                            fixedValue = "#" + value;
                          }
                          if (fixedValue.length > 7) {
                            fixedValue = fixedValue.substring(0, 7);
                          }
                          field.onChange(fixedValue);
                        }
                      }
                      field.onBlur();
                    }}
                  />
                </FormControl>
              </div>
              <FormDescription>
                使用十六进制颜色代码，例如 #FF5733
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "创建中..." : "创建标签"}
        </Button>
      </form>
    </Form>
  );
}
