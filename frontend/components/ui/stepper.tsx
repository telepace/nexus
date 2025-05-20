import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div
      data-testid="setup-stepper"
      className={cn("flex justify-between w-full", className)}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex flex-col items-center">
            <div className="flex items-center">
              {index > 0 && (
                <div
                  className={cn(
                    "h-1 w-12 md:w-24 lg:w-32 -mx-2",
                    isCompleted ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-background text-primary"
                      : "border-muted bg-muted/50 text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-1 w-12 md:w-24 lg:w-32 -mx-2",
                    isCompleted ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs",
                isCurrent
                  ? "font-medium text-primary"
                  : isCompleted
                    ? "font-medium text-primary"
                    : "text-muted-foreground",
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
