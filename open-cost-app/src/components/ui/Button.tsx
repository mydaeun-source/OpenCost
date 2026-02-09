import * as React from "react"
import { Slot } from "@radix-ui/react-slot" // We don't have radix yet, let's use standard button for now or install standard accessible headless UI.
// Actually, let's stick to standard HTML button for zero-cost and simplicity first, adding Radix later if needed for accessibility.
import { cn } from "@/lib/utils"

// Simple variant implementation without 'class-variance-authority' for now to keep it lightweight (Zero-Cost philosophy)
// We can switch to cva later if complexity grows.

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        // Base styles
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

        // Variants
        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(34,211,238,0.3)] border-0", // Neon Primary
            destructive: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        }

        // Sizes
        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
