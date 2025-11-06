"use client"

import * as React from "react"
import { Circle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  variant?: "default" | "round"
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  variant = "round",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: CheckboxProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      if (onCheckedChange) {
        onCheckedChange(!checked)
      }
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      id={id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        "transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer hover:opacity-80",
        className
      )}
      {...props}
    >
      {checked ? (
        <CheckCircle2 
          className={cn(
            "h-5 w-5 transition-colors",
            disabled 
              ? "text-muted-foreground" 
              : "text-green-600"
          )}
        />
      ) : (
        <Circle 
          className={cn(
            "h-5 w-5 transition-colors",
            disabled 
              ? "text-muted-foreground/30" 
              : "text-muted-foreground hover:text-primary/50"
          )}
        />
      )}
    </button>
  )
}

export { Checkbox }
