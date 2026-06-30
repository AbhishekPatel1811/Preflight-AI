import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "info" | "success";

const alertVariants: Record<AlertVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-destructive bg-destructive-muted text-destructive",
  info: "border-info bg-info-muted text-info-foreground",
  success: "border-success bg-success-muted text-success-foreground"
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} role="alert" className={cn("relative w-full rounded-md border p-4 text-sm", alertVariants[variant], className)} {...props} />
));

Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("mb-1 font-semibold leading-none", className)} {...props} />
));

AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("leading-6", className)} {...props} />
));

AlertDescription.displayName = "AlertDescription";
