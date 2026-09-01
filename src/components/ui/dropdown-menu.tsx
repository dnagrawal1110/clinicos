"use client";

import type * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuSub = DropdownPrimitive.Sub;
export const DropdownMenuSubTrigger = DropdownPrimitive.SubTrigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)] animate-scale-in",
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none transition-colors data-[highlighted]:bg-[var(--color-surface-sunken)]",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none transition-colors data-[highlighted]:bg-[var(--color-surface-sunken)]",
        className
      )}
      {...props}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        <DropdownPrimitive.ItemIndicator><Check className="h-3.5 w-3.5" /></DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn("px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn("my-1 h-px bg-[var(--color-border)]", className)} {...props} />;
}

export { ChevronRight as DropdownMenuSubTriggerIcon };
