import React from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success";
}

export function Alert({
  className,
  variant = "default",
  ...props
}: AlertProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    success: "bg-green-100 text-green-700",
  };

  return (
    <div
      className={cn("p-4 rounded-md mb-4", variantClasses[variant], className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium mb-1", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm", className)} {...props} />;
}
