/* eslint-disable react/no-unescaped-entities */
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useActionState,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  X,
  Trash,
  Plus as PlusIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ToggleLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import type {
  TagData,
  InputVariable,
  PromptData,
} from "@/components/actions/prompts-action";
import { addTag } from "@/components/actions/prompts-action";
import { useTranslationUtils } from "@/lib/i18n-utils";

// Define the expected shape of the state from useFormState
interface FormState {
  fieldErrors?: Record<string, string> | null;
  genericError?: string | null;
  success?: boolean;
  message?: string; // For success messages or other general messages
  redirectUrl?: string; // For redirecting after successful submission
  data?: { id: string } | null; // To potentially pass back created/updated entity ID for redirection
}

const initialState: FormState = {
  fieldErrors: null,
  genericError: null,
  success: false,
  message: null,
  redirectUrl: null,
};

interface PromptFormProps {
  tags: TagData[];
  prompt?: PromptData;
  actionToCall: (
    prevState: FormState,
    formData: FormData,
  ) => Promise<FormState>;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending
        ? isEditing
          ? "更新中..."
          : "创建中..."
        : isEditing
          ? "更新提示词"
          : "创建提示词"}
    </Button>
  );
}

export function PromptForm({ tags, prompt, actionToCall }: PromptFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(actionToCall, initialState);

  const { fieldErrors, genericError, success, message, redirectUrl, data } =
    state || {};

  const [inputVars, setInputVars] = useState<InputVariable[]>(
    prompt?.input_vars || [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    prompt?.tags?.map((tag) => tag.id) || [],
  );
  const [currentVisibility, setCurrentVisibility] = useState<string>(
    prompt?.visibility || "public",
  );
  const [content, setContent] = useState<string>(prompt?.content || "");
  const [showVariablePreview, setShowVariablePreview] =
    useState<boolean>(false);

  // 标签相关状态
  const [availableTags, setAvailableTags] = useState<TagData[]>(tags);
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [creatingTag, setCreatingTag] = useState(false);

  const { tPlural } = useTranslationUtils();

  // 解析内容中的变量
  const parseVariablesFromContent = useCallback((contentText: string) => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = contentText.matchAll(variableRegex);
    const variables = new Set<string>();

    for (const match of matches) {
      const variableName = match[1].trim();
      if (variableName) {
        variables.add(variableName);
      }
    }

    return Array.from(variables);
  }, []);

  // 自动更新输入变量
  const autoUpdateInputVars = useCallback(
    (contentText: string) => {
      const parsedVars = parseVariablesFromContent(contentText);
      const existingVarNames = inputVars.map((v) => v.name);

      // 添加新变量
      const newVars = parsedVars.filter(
        (varName) => !existingVarNames.includes(varName),
      );
      if (newVars.length > 0) {
        const newInputVars = newVars.map((name) => ({
          name,
          description: `自动识别的变量: ${name}`,
          required: false,
        }));
        setInputVars((prev) => [...prev, ...newInputVars]);
      }

      // 可选：移除不再使用的变量（注释掉以避免意外删除用户手动添加的变量）
      // const unusedVars = existingVarNames.filter(varName => !parsedVars.includes(varName));
      // if (unusedVars.length > 0) {
      //   setInputVars(prev => prev.filter(v => parsedVars.includes(v.name)));
      // }
    },
    [inputVars, parseVariablesFromContent],
  );

  // 处理内容变化
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      autoUpdateInputVars(newContent);
    },
    [autoUpdateInputVars],
  );

  // 高亮显示变量的内容
  const highlightedContent = useMemo(() => {
    if (!showVariablePreview) return content;

    return content.replace(/(\{\{[^}]+\}\})/g, (match) => {
      return `<span class="bg-blue-100 text-blue-800 px-1 rounded font-semibold">${match}</span>`;
    });
  }, [content, showVariablePreview]);

  useEffect(() => {
    if (success) {
      toast({
        title: prompt ? "更新成功" : "创建成功",
        description: message || (prompt ? "提示词已更新" : "提示词已创建"),
      });
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (!prompt && data?.id) {
        router.push(`/prompts/${data.id}`);
      } else if (prompt) {
        // No specific redirectUrl from action, stay or refresh based on needs
        // For now, router.push to the same prompt page to reflect potential updates
        router.push(`/prompts/${prompt.id}`);
        router.refresh(); // Ensure data is re-fetched if staying on the same page after update
      }
    } else if (genericError) {
      toast({
        title: prompt ? "更新失败" : "创建失败",
        description: genericError,
        variant: "destructive",
      });
    } else if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      toast({
        title: "验证错误",
        description: "请检查表单中的错误信息。",
        variant: "destructive",
      });
    }
  }, [
    success,
    message,
    genericError,
    fieldErrors,
    redirectUrl,
    router,
    prompt,
    data?.id,
  ]);

  const addInputVar = () => {
    setInputVars([
      ...inputVars,
      { name: "", description: "", required: false },
    ]);
  };

  const removeInputVar = (index: number) => {
    setInputVars(inputVars.filter((_, i) => i !== index));
  };

  const updateInputVar = (
    index: number,
    field: keyof InputVariable,
    value: string | boolean,
  ) => {
    const updatedVars = [...inputVars];
    updatedVars[index] = { ...updatedVars[index], [field]: value };
    setInputVars(updatedVars);
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden input for prompt ID if editing */}
      {prompt && <input type="hidden" name="id" value={prompt.id} />}
      {/* Hidden input for team_id, meta_data if needed */}
      {currentVisibility === "team" && (
        <input type="hidden" name="team_id" value={prompt?.team_id || ""} /> // Assuming default team_id is handled by server or context
      )}
      <input
        type="hidden"
        name="meta_data"
        value={JSON.stringify({ version_notes: "", last_edited_by: "" })}
      />
      {/* 默认类型 simple (隐藏) */}
      <input type="hidden" name="type" value="simple" />

      {genericError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{genericError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              name="name"
              placeholder="输入提示词名称"
              defaultValue={prompt?.name || ""}
              aria-invalid={fieldErrors?.name ? "true" : "false"}
              className={fieldErrors?.name ? "border-destructive" : ""}
              aria-describedby="name-error"
            />
            {fieldErrors?.name && (
              <p id="name-error" className="text-sm text-destructive mt-1">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="输入提示词描述（可选）"
              rows={3}
              defaultValue={prompt?.description || ""}
              className={fieldErrors?.description ? "border-destructive" : ""}
              aria-describedby="description-error"
            />
            {fieldErrors?.description && (
              <p
                id="description-error"
                className="text-sm text-destructive mt-1"
              >
                {fieldErrors.description}
              </p>
            )}
          </div>
        </div>

        {/* 设置和配置 */}
        <div className="space-y-6">
          {/* 可见性设置 */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">可见性设置</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentVisibility === "public"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setCurrentVisibility("public")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        currentVisibility === "public"
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {currentVisibility === "public" && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">公开</h4>
                      <p className="text-xs text-muted-foreground">
                        所有人都可以查看和使用
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentVisibility === "private"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setCurrentVisibility("private")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        currentVisibility === "private"
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {currentVisibility === "private" && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">私有</h4>
                      <p className="text-xs text-muted-foreground">
                        仅您自己可以查看
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentVisibility === "team"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setCurrentVisibility("team")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        currentVisibility === "team"
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {currentVisibility === "team" && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">团队</h4>
                      <p className="text-xs text-muted-foreground">
                        团队成员可以查看
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 隐藏的 select 用于表单提交 */}
              <select
                name="visibility"
                value={currentVisibility}
                onChange={() => {}}
                className="hidden"
              >
                <option value="public">公开</option>
                <option value="private">私有</option>
                <option value="team">团队</option>
              </select>

              {fieldErrors?.visibility && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.visibility}
                </p>
              )}
            </div>
          </Card>

          {/* 启用状态 */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="enabled" className="text-base font-medium">
                    启用状态
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  启用后，此提示词将可以在系统中使用
                </p>
              </div>
              <Switch
                id="enabled"
                name="enabled"
                defaultChecked={prompt?.enabled || false}
              />
            </div>
          </Card>
        </div>

        {/* 标签选择 */}
        <div>
          <Label>标签</Label>
          <input
            type="hidden"
            name="tag_ids"
            value={JSON.stringify(selectedTagIds)}
          />
          <div className="space-y-2 mt-1">
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`flex items-center px-3 py-1 rounded-full text-sm cursor-pointer 
                            ${
                              selectedTagIds.includes(tag.id)
                                ? `bg-primary text-primary-foreground`
                                : `bg-muted hover:bg-muted/80`
                            }`}
                  style={
                    selectedTagIds.includes(tag.id)
                      ? {}
                      : {
                          borderColor: tag.color || "#888",
                          color: tag.color || "#888",
                          backgroundColor: tag.color
                            ? `${tag.color}10`
                            : "transparent",
                        }
                  }
                  onClick={() => handleTagClick(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleTagClick(tag.id);
                  }}
                  role="checkbox"
                  aria-checked={selectedTagIds.includes(tag.id)}
                  tabIndex={0}
                >
                  {tag.name}
                  {selectedTagIds.includes(tag.id) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </div>
              ))}

              {/* 新建标签按钮 */}
              <Dialog open={openTagDialog} onOpenChange={setOpenTagDialog}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    新建标签
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建标签</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-tag-name">名称</Label>
                      <Input
                        id="new-tag-name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="输入标签名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-tag-color">颜色</Label>
                      <div className="flex items-center gap-3">
                        <input
                          id="new-tag-color"
                          type="color"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="h-8 w-8 rounded-full border"
                        />
                        <Input
                          type="text"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="w-24"
                        />
                      </div>
                    </div>
                    <Button
                      disabled={creatingTag || newTagName.trim().length === 0}
                      onClick={async () => {
                        try {
                          setCreatingTag(true);
                          const formData = new FormData();
                          formData.append("name", newTagName.trim());
                          formData.append("description", "");
                          formData.append("color", newTagColor);
                          const result = await addTag(formData);
                          if (result && (result as { error?: string }).error) {
                            toast({
                              title: "创建失败",
                              description: (result as { error: string }).error,
                              variant: "destructive",
                            });
                          } else {
                            const created = (result as { data?: TagData }).data;
                            if (created) {
                              setAvailableTags((prev) => [...prev, created]);
                              setSelectedTagIds((prev) => [
                                ...prev,
                                created.id,
                              ]);
                            }
                            toast({
                              title: "创建成功",
                              description: "标签已创建",
                            });
                            setNewTagName("");
                            setNewTagColor("#3B82F6");
                            setOpenTagDialog(false);
                          }
                        } finally {
                          setCreatingTag(false);
                        }
                      }}
                      className="w-full"
                    >
                      {creatingTag ? "创建中..." : "创建标签"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {availableTags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                暂无可用标签，请先创建标签
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            选择标签帮助分类和查找提示词
          </p>
          {fieldErrors?.tag_ids && (
            <p className="text-sm text-destructive mt-1">
              {fieldErrors.tag_ids}
            </p>
          )}
        </div>

        {/* 提示词内容 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="content">提示词内容</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVariablePreview(!showVariablePreview)}
              className="text-sm"
            >
              {showVariablePreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  隐藏变量预览
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  显示变量预览
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <Textarea
              id="content"
              name="content"
              placeholder="输入提示词内容，使用 {{变量名}} 格式插入变量"
              rows={10}
              className={`font-mono text-sm ${fieldErrors?.content ? "border-destructive" : ""} ${showVariablePreview ? "opacity-50" : ""}`}
              value={content}
              onChange={handleContentChange}
              aria-describedby="content-error"
            />

            {/* 变量高亮预览层 */}
            {showVariablePreview && (
              <div
                className="absolute inset-0 pointer-events-none font-mono text-sm p-3 whitespace-pre-wrap overflow-auto rounded-md border bg-background/80 backdrop-blur-sm"
                style={{
                  lineHeight: "1.5",
                  fontSize: "14px",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", monospace',
                }}
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              提示词的主体内容，可以包含文本、指令和输入变量
            </p>
            {parseVariablesFromContent(content).length > 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                {tPlural(
                  "detection.variablesDetected",
                  parseVariablesFromContent(content).length,
                )}
                : {parseVariablesFromContent(content).join(", ")}
              </div>
            )}
          </div>

          {fieldErrors?.content && (
            <p id="content-error" className="text-sm text-destructive mt-1">
              {fieldErrors.content}
            </p>
          )}
        </div>

        {/* 输入变量 */}
        <input
          type="hidden"
          name="input_vars"
          value={JSON.stringify(inputVars)}
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>输入变量</Label>
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
                      <h4 className="text-sm font-medium">变量 #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInputVar(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove variable ${index + 1}`}
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
                          // Example for deep field error: state={fieldErrors?.[`input_vars[${index}].name`] ? "error" : "default"}
                        />
                        {/* Example for deep field error: {fieldErrors?.[`input_vars[${index}].name`] && <p className="text-sm text-destructive mt-1">{fieldErrors[`input_vars[${index}].name`]}</p>} */}
                      </div>

                      <div>
                        <Label htmlFor={`var-desc-${index}`}>描述</Label>
                        <Input
                          id={`var-desc-${index}`}
                          value={variable.description || ""}
                          onChange={(e) =>
                            updateInputVar(index, "description", e.target.value)
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
            {fieldErrors?.input_vars && (
              <p className="text-sm text-destructive mt-1">
                {/* This will show generic error for input_vars array if backend sends it like that */}
                {typeof fieldErrors.input_vars === "string"
                  ? fieldErrors.input_vars
                  : "输入变量存在错误"}
              </p>
            )}
          </div>
        </div>

        {/* 创建版本选项 - 仅在编辑模式显示 */}
        {prompt && (
          <div className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
            <div className="space-y-1 leading-none">
              <Label htmlFor="create_version">创建新版本</Label>
              <p className="text-sm text-muted-foreground">
                启用此选项将创建一个新版本而不是覆盖当前版本
              </p>
            </div>
            <Switch
              id="create_version"
              name="create_version"
              // value="true" // The presence of name="create_version" and its checked state handles this for FormData
              // defaultChecked={false} // Or manage with state if needed for more complex logic
            />
          </div>
        )}

        <div className="text-sm text-muted-foreground mb-2 p-3 bg-muted rounded-md">
          <p>
            提示: 您可以使用 <code>{"{{变量名}}"}</code> 语法在内容中插入变量,
            例如 <code>{"{{user_input}}"}</code>
          </p>
        </div>
      </div>

      {/* 表单按钮 */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <SubmitButton isEditing={!!prompt} />
      </div>
    </form>
  );
}
