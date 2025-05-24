// Select component implementation compatible with shadcn/ui style
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// 创建SelectContext来共享select状态
const SelectContext = React.createContext<{
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  value: "",
  onChange: () => {},
  open: false,
  setOpen: () => {},
});

type SelectProps = {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">;

export function Select({
  children,
  onValueChange,
  defaultValue = "",
  ...props
}: SelectProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);

  const handleChange = React.useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{ value, onChange: handleChange, open, setOpen }}
    >
      <div className="relative w-full" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

type SelectTriggerProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export function SelectTrigger({
  className,
  children,
  ...props
}: SelectTriggerProps) {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  );
}

export function SelectValue({
  placeholder,
  className,
  ...props
}: { placeholder?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const { value } = React.useContext(SelectContext);

  return (
    <span className={cn("flex-grow truncate", className)} {...props}>
      {value || placeholder}
    </span>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(SelectContext);

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-background p-1 text-foreground shadow-md",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function SelectItem({
  value,
  className,
  children,
  ...props
}: { value: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { value: selectedValue, onChange } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        className,
      )}
      onClick={() => onChange(value)}
      {...props}
    >
      {children}
    </div>
  );
}
