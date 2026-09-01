"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";
import { getScopedKpi } from "@/lib/scope-selectors";
import { useRuntimeStore } from "@/lib/runtime-store";

export function Sidebar() {
  useRuntimeStore();
  const pathname = usePathname();
  const agencyOpenTasks = getScopedKpi({ type: "all" }).openTasks;
  const badgeFor = (label: string) => (label === "Tasks" ? agencyOpenTasks : undefined);

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--color-primary)] text-white">
          <Activity className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-[14.5px] font-semibold tracking-tight text-[var(--color-ink)]">ClinicOS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-tertiary)]">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
                        : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
                    )}
                  >
                    <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-[var(--color-primary-strong)]" : "text-[var(--color-ink-tertiary)] group-hover:text-[var(--color-ink-secondary)]")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeFor(item.label) ? (
                      <span className="rounded-full bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-[var(--color-ink-secondary)] group-hover:bg-[var(--color-surface)]">
                        {badgeFor(item.label)}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-[var(--color-border)] px-4 py-3.5">
        <Avatar name="MixMedia Agency" size={30} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-[var(--color-ink)]">MixMedia</div>
          <div className="truncate text-[11.5px] text-[var(--color-ink-tertiary)]">Growth Agency</div>
        </div>
      </div>
    </aside>
  );
}
