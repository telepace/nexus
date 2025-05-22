import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

// 创建一个单独的函数处理测试环境
const useFormStatusSafe = () => {
  try {
    return useFormStatus();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // 在测试环境中，可能不支持 useFormStatus
    return { pending: false };
  }
};

export function SubmitButton({
  text,
  className,
  children,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatusSafe();
  const buttonText =
    text || (typeof children === "string" ? children : undefined);

  return (
    <Button
      className={cn("w-full relative overflow-hidden", className)}
      type="submit"
      disabled={pending}
      {...props}
    >
      {buttonText || children}
    </Button>
  );
}
