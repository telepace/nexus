// Adapted from https://ui.shadcn.com/docs/components/toast
import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast as useToastPrimitive } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToastPrimitive();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

export { useToastPrimitive as useToast };

// 导入toast函数从toast.tsx文件中，避免直接在非组件函数中使用hooks
import type { ToastType } from "./toast";
import { dispatch, actionTypes, genId } from "./toast";

// 不使用React Hooks的toast函数实现
export const toast = (props: Omit<ToastType, "id">) => {
  const id = genId();

  const update = (props: Partial<ToastType>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
};
