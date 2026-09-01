import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-primary)] text-[var(--color-ink-inverse)] hover:bg-[var(--color-primary-strong)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-sunken)]",
        ghost: "text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]",
        ai: "bg-[var(--color-ai)] text-white hover:bg-[var(--color-ai-strong)]",
        critical: "bg-[var(--color-critical)] text-white hover:bg-[var(--color-critical-strong)]",
        outline: "border border-[var(--color-border-strong)] text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
