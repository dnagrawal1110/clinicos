import type React from "react";
import { ScopeProvider } from "@/lib/scope-context";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScopeProvider>
      <TooltipProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[1400px] px-6 py-6">{children}</div>
            </main>
          </div>
        </div>
        <CommandPalette />
      </TooltipProvider>
    </ScopeProvider>
  );
}
