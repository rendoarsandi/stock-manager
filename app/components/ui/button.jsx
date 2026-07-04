import * as React from "react"
import { cn } from "@/lib/utils"

export const Button = React.forwardRef(({ className, variant, size, type = "button", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 dark:focus-visible:ring-zinc-300 cursor-pointer"
  
  const variants = {
    default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90",
    outline: "border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
  }
  
  const chosenVariant = variants[variant] || variants.default
  
  return (
    <button
      type={type}
      className={cn(baseStyles, chosenVariant, className)}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"
