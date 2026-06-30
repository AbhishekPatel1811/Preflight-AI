import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "border-border bg-background text-muted-foreground",
      success: "border-transparent bg-success-muted text-success-foreground",
      info: "border-transparent bg-info-muted text-info-foreground",
      warning: "border-transparent bg-warning-muted text-warning-foreground",
      destructive: "border-transparent bg-destructive-muted text-destructive"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(badgeVariants({ variant, className }))}
    {...props}
  />
));

Badge.displayName = "Badge";
