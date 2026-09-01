"use client";

import { useRouter } from "next/navigation";
import { Search, Sparkles, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { useScope } from "@/lib/scope-context";
import { LocationSwitcher } from "./LocationSwitcher";
import { DataModeBadge } from "./DataModeBadge";
import { Avatar } from "@/components/ui/avatar";
import { ALL_ALERTS as ALERTS } from "@/lib/scope-selectors";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TONE_DOT: Record<string, string> = {
  critical: "bg-[var(--color-critical)]", attention: "bg-[var(--color-warning)]", opportunity: "bg-[var(--color-ai)]",
  info: "bg-[var(--color-info)]", success: "bg-[var(--color-success)]",
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function TopBar() {
  const { setPaletteOpen, setScope } = useScope();
  const router = useRouter();
  const recentAlerts = ALERTS.slice(0, 5);

  function openAlert(clientId?: string, locationId?: string, module?: string) {
    if (locationId && clientId) {
      setScope({ type: "location", clientId, locationId });
      router.push(module === "google" ? `/clients/${clientId}/locations/${locationId}` : "/alerts");
    } else if (clientId) {
      setScope({ type: "client", clientId });
      router.push(`/clients/${clientId}`);
    } else {
      router.push("/alerts");
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      <LocationSwitcher />

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-[13px] text-[var(--color-ink-tertiary)] hover:border-[var(--color-border-strong)]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate text-left">Search clients, locations, reviews, tasks...</span>
        <kbd className="rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <div className="ml-auto"><DataModeBadge /></div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-ai)] px-3.5 text-[13px] font-medium text-white hover:bg-[var(--color-ai-strong)]"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask ClinicOS AI
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)]">
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-critical)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {recentAlerts.map((n) => (
            <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2.5" onSelect={() => openAlert(n.clientId, n.locationId, n.module)}>
              <div className="flex w-full items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[n.tone]}`} />
                <span className="font-medium text-[var(--color-ink)]">{n.title}</span>
                <span className="ml-auto text-[11px] text-[var(--color-ink-tertiary)]">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="pl-3.5 text-[12px] text-[var(--color-ink-tertiary)]">{n.detail}</p>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/alerts")} className="justify-center text-[var(--color-primary-strong)]">View all alerts</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)]">
        <HelpCircle className="h-[17px] w-[17px]" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-[var(--radius-sm)] py-1 pl-1 pr-1.5 hover:bg-[var(--color-surface-sunken)]">
            <Avatar name="Deepak" size={28} />
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Deepak · Admin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile settings</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/team")}>Team & roles</DropdownMenuItem>
          <DropdownMenuItem>Notification preferences</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
