import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "2xs": "h-4 rounded px-1.5 text-xs gap-1 has-[>svg]:px-1",
        xs: "h-6 rounded px-2 text-xs gap-1 has-[>svg]:px-1.5",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        lg: "h-12 rounded-lg px-6 py-3 text-base has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/**
 * ButtonGroup component for managing spacing between multiple buttons
 * 按钮组组件，用于管理多个按钮之间的间距和布局
 */
interface ButtonGroupProps extends React.ComponentProps<"div"> {
  size?: "2xs" | "xs" | "sm" | "default" | "lg";
  orientation?: "horizontal" | "vertical";
  justify?: "start" | "center" | "end" | "between";
  responsive?: boolean; // 是否在小屏幕上自动变为垂直布局
}

function ButtonGroup({
  className,
  size = "default",
  orientation = "horizontal",
  justify = "end",
  responsive = false,
  ...props
}: ButtonGroupProps) {
  const spacing = {
    "2xs": "gap-1",
    xs: "gap-1.5",
    sm: "gap-2",
    default: "gap-3",
    lg: "gap-4",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  const orientationClasses = {
    horizontal: responsive ? "flex-col sm:flex-row" : "flex-row",
    vertical: "flex-col",
  };

  return (
    <div
      data-slot="button-group"
      className={cn(
        "flex items-center",
        spacing[size],
        orientationClasses[orientation],
        justifyClasses[justify],
        responsive && "items-stretch sm:items-center",
        className,
      )}
      {...props}
    />
  );
}

export { Button, ButtonGroup, buttonVariants };
