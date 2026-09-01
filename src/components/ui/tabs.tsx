"use client";

import type * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative shrink-0 px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-ink-tertiary)] transition-colors hover:text-[var(--color-ink)]",
        "data-[state=active]:text-[var(--color-ink)]",
        "after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:rounded-full after:bg-transparent data-[state=active]:after:bg-[var(--color-primary)]",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("animate-fade-in outline-none", className)} {...props} />;
}
