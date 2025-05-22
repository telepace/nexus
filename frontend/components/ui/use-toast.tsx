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

// Export the toast function so it can be imported from this file
import type { ToastType } from "./toast";
export const toast = function (props: Omit<ToastType, "id">) {
  const { toast: toastFn } = useToastPrimitive();
  return toastFn(props);
};
