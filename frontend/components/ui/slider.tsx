"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [Number(event.target.value)]
      onValueChange?.(newValue)
    }

    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className={cn(
            "flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:bg-primary",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-all",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:bg-primary",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:transition-all",
            "[&::-moz-range-thumb]:hover:scale-110",
            "[&::-moz-range-track]:bg-secondary",
            "[&::-moz-range-track]:rounded-lg",
            "[&::-moz-range-track]:h-2"
          )}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }