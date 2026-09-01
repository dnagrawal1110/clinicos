"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getScopeMeta, type ScopeMeta } from "./scope-selectors";
import { useRuntimeStore } from "./runtime-store";

export type Scope =
  | { type: "all" }
  | { type: "client"; clientId: string }
  | { type: "location"; clientId: string; locationId: string };

interface ScopeContextValue {
  scope: Scope;
  setScope: (s: Scope) => void;
  scopeLabel: string;
  scopeMeta: ScopeMeta;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  // Subscribing here — the one component every page renders inside of —
  // means any runtime-store change (a ReviewFlow completion, a task created
  // from feedback, a published response) re-renders the whole app tree,
  // instead of requiring every individual page to remember to subscribe.
  useRuntimeStore();
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const scopeMeta = useMemo(() => getScopeMeta(scope), [scope]);
  const scopeLabel = scope.type === "all" ? "All Clients" : scopeMeta.title;

  return (
    <ScopeContext.Provider value={{ scope, setScope, scopeLabel, scopeMeta, paletteOpen, setPaletteOpen }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}

// Keeps the global scope in sync with a directly-visited Client/Location
// Workspace URL, so navigating to Google/Reviews/etc. from the sidebar
// continues to reflect the client or location the operator just opened.
function scopesEqual(a: Scope, b: Scope): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "all") return true;
  if (a.type === "client") return a.clientId === (b as typeof a).clientId;
  return a.clientId === (b as typeof a).clientId && a.locationId === (b as typeof a).locationId;
}

export function useSyncScope(next: Scope) {
  const { scope, setScope } = useScope();
  const nextClientId = "clientId" in next ? next.clientId : null;
  const nextLocationId = "locationId" in next ? next.locationId : null;
  useEffect(() => {
    if (!scopesEqual(scope, next)) setScope(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next.type, nextClientId, nextLocationId]);
}
