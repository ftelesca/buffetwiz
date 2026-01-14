import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(217_91%_60%/0.4)] rounded-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] rounded-lg",
        outline:
          "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-primary/50 rounded-lg",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:scale-[1.02] rounded-lg",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-lg",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary via-cyan to-purple text-white font-semibold hover:scale-[1.03] hover:shadow-[0_0_40px_hsl(217_91%_60%/0.5)] rounded-lg",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:scale-[1.02] rounded-lg",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 hover:scale-[1.02] rounded-lg",
        premium: "bg-gradient-to-r from-primary to-cyan text-white font-semibold hover:scale-[1.03] hover:shadow-[0_0_40px_hsl(189_94%_43%/0.4)] rounded-lg",
        glass: "bg-card/40 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/60 hover:border-primary/30 hover:scale-[1.02] rounded-lg",
        glow: "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(217_91%_60%/0.3)] hover:shadow-[0_0_40px_hsl(217_91%_60%/0.5)] hover:scale-[1.02] rounded-lg",
        "glow-cyan": "bg-cyan text-cyan-foreground shadow-[0_0_20px_hsl(189_94%_43%/0.3)] hover:shadow-[0_0_40px_hsl(189_94%_43%/0.5)] hover:scale-[1.02] rounded-lg",
        "glow-purple": "bg-purple text-purple-foreground shadow-[0_0_20px_hsl(258_90%_66%/0.3)] hover:shadow-[0_0_40px_hsl(258_90%_66%/0.5)] hover:scale-[1.02] rounded-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        xl: "h-12 px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
