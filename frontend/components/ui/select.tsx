// Basic Select component implementation compatible with shadcn/ui style
// You can replace this with your own or a third-party implementation later
import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
};

export function Select({ children, onValueChange, ...props }: SelectProps) {
  return <select 
    {...props} 
    onChange={(e) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
      props.onChange?.(e);
    }}
  >
    {children}
  </select>;
}

export function SelectTrigger({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}

export function SelectValue({
  placeholder,
  ...props
}: { placeholder?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props}>{placeholder}</span>;
}

export function SelectContent({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}

export function SelectItem({
  value,
  children,
  ...props
}: { value: string } & React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li data-value={value} {...props}>
      {children}
    </li>
  );
}
