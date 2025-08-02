"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemTitle: string;
  isDeleting?: boolean;
}

const SKIP_CONFIRM_KEY = "content-delete-skip-confirm";

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemTitle,
  isDeleting = false,
}: DeleteConfirmDialogProps) => {
  const [skipConfirm, setSkipConfirm] = useState(false);

  const handleConfirm = () => {
    if (skipConfirm) {
      localStorage.setItem(SKIP_CONFIRM_KEY, "true");
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">确认删除</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                此操作无法撤销
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">即将删除：</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {itemTitle || "无标题"}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-confirm"
              checked={skipConfirm}
              onCheckedChange={(checked) => setSkipConfirm(checked as boolean)}
            />
            <Label
              htmlFor="skip-confirm"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              记住我的选择，以后直接删除
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                删除中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                确认删除
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// 工具函数：检查是否跳过确认
export const shouldSkipDeleteConfirm = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_CONFIRM_KEY) === "true";
};

// 工具函数：重置跳过确认设置
export const resetDeleteConfirmSetting = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SKIP_CONFIRM_KEY);
};
