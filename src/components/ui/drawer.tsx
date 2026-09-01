"use client";

import type * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;

export function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] focus:outline-none",
          "data-[state=open]:animate-[slide-in_0.22s_ease-out]",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="rounded-md p-1 text-[var(--color-ink-tertiary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

export function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-[16px] font-semibold text-[var(--color-ink)]", className)} {...props} />;
}
