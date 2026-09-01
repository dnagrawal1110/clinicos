"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { ChevronDown, ChevronRight, Globe2, MapPin, Search, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useScope } from "@/lib/scope-context";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { cn } from "@/lib/utils";

export function LocationSwitcher() {
  const { scope, setScope, scopeMeta } = useScope();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-9 max-w-[340px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]">
          {scope.type === "all" ? <Globe2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-tertiary)]" /> : <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />}
          {scope.type === "all" ? (
            <span className="truncate">All Clients</span>
          ) : (
            <span className="flex min-w-0 items-center gap-1">
              <span className={cn("truncate", scope.type === "location" && "text-[var(--color-ink-tertiary)] font-normal")}>{scopeMeta.client?.name}</span>
              {scope.type === "location" && (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-ink-tertiary)]" />
                  <span className="truncate text-[var(--color-ink)]">{scopeMeta.location?.name}</span>
                </>
              )}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-tertiary)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command className="flex max-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
            <Command.Input
              placeholder="Search clients or locations..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--color-ink-tertiary)]"
            />
          </div>
          <Command.List className="overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No matches found.</Command.Empty>
            <Command.Item
              value="all locations"
              onSelect={() => { setScope({ type: "all" }); setOpen(false); }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium data-[selected=true]:bg-[var(--color-surface-sunken)]",
                scope.type === "all" && "text-[var(--color-primary-strong)]"
              )}
            >
              <Globe2 className="h-3.5 w-3.5" />
              All Locations
              {scope.type === "all" && <Check className="ml-auto h-3.5 w-3.5" />}
            </Command.Item>
            {ALL_CLIENTS.map((client) => (
              <Command.Group key={client.id} heading={client.name} className="mt-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-[var(--color-ink-tertiary)]">
                <Command.Item
                  value={client.name}
                  onSelect={() => { setScope({ type: "client", clientId: client.id }); setOpen(false); }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium data-[selected=true]:bg-[var(--color-surface-sunken)]",
                    scope.type === "client" && scope.clientId === client.id && "text-[var(--color-primary-strong)]"
                  )}
                >
                  {client.name}
                  {scope.type === "client" && scope.clientId === client.id && <Check className="ml-auto h-3.5 w-3.5" />}
                </Command.Item>
                {client.locations.map((loc) => (
                  <Command.Item
                    key={loc.id}
                    value={`${client.name} ${loc.name}`}
                    onSelect={() => { setScope({ type: "location", clientId: client.id, locationId: loc.id }); setOpen(false); }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pl-7 pr-2.5 text-[13px] text-[var(--color-ink-secondary)] data-[selected=true]:bg-[var(--color-surface-sunken)]",
                      scope.type === "location" && scope.locationId === loc.id && "text-[var(--color-primary-strong)]"
                    )}
                  >
                    {loc.name}
                    {scope.type === "location" && scope.locationId === loc.id && <Check className="ml-auto h-3.5 w-3.5" />}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
