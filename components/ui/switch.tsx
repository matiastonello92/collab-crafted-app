"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[24px] w-[48px] min-h-[24px] min-w-[48px] max-h-[24px] max-w-[48px] shrink-0 items-center rounded-[12px] transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 shadow-inner",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-[20px] w-[20px] min-h-[20px] min-w-[20px] max-h-[20px] max-w-[20px] rounded-full bg-background shadow-md transition-transform data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-[2px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
