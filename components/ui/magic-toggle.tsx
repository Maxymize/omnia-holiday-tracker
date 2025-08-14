"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const MagicToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-md border-2 border-transparent transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50",
      // Off state - subtle gradient with shimmer effect
      "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-slate-200 data-[state=unchecked]:to-slate-300 data-[state=unchecked]:shadow-inner",
      // On state - beautiful gradient with glow
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:via-blue-600 data-[state=checked]:to-blue-500 data-[state=checked]:shadow-lg data-[state=checked]:shadow-blue-500/25",
      // Dark mode
      "dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950 dark:data-[state=unchecked]:from-slate-700 dark:data-[state=unchecked]:to-slate-800 dark:data-[state=checked]:from-blue-400 dark:data-[state=checked]:to-blue-600",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Shimmer effect background */}
    <div className="absolute inset-0 overflow-hidden rounded-md">
      <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent group-data-[state=checked]:via-white/30" />
    </div>
    
    {/* Magic thumb with enhanced animations */}
    <SwitchPrimitives.Thumb asChild>
      <motion.div
        className={cn(
          "pointer-events-none relative block h-4 w-4 rounded-sm shadow-lg ring-0 transition-transform duration-300",
          // Off state thumb
          "data-[state=unchecked]:bg-white data-[state=unchecked]:shadow-md",
          // On state thumb with glow
          "data-[state=checked]:bg-white data-[state=checked]:shadow-xl data-[state=checked]:shadow-blue-500/50",
          // Transform states
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-1",
          "dark:data-[state=unchecked]:bg-slate-50 dark:data-[state=checked]:bg-white"
        )}
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        {/* Inner glow effect */}
        <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-opacity duration-300 group-data-[state=checked]:opacity-100" />
      </motion.div>
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
MagicToggle.displayName = SwitchPrimitives.Root.displayName

export { MagicToggle }