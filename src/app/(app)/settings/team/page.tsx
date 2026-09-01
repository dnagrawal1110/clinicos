import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { TEAM_MEMBERS } from "@/lib/mock/pools";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { TASKS } from "@/lib/mock/operations";

export default function TeamPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Team" subtitle="Agency operators, roles, and workload." actions={<Button variant="primary" size="md">Invite teammate</Button>} />
      <Card>
        <div className="divide-y divide-[var(--color-border)] px-2">
          <div className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
            <span className="w-8" />
            <span className="flex-1">Name</span>
            <span className="w-32">Team</span>
            <span className="w-36">Role</span>
            <span className="w-28 text-right">Workload</span>
          </div>
          {TEAM_MEMBERS.map((m) => {
            const isAccountManager = m.role === "Account Manager";
            const clientsAssigned = isAccountManager ? ALL_CLIENTS.filter((c) => c.accountManager === m.name).length : 0;
            const openTasks = TASKS.filter((t) => t.owner === m.name && t.status !== "done").length;
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={m.name} size={30} />
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{m.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{m.team}</div>
                </div>
                <span className="w-32 text-[12.5px] text-[var(--color-ink-tertiary)]">{m.team}</span>
                <div className="w-36"><Badge variant={m.role === "Admin" ? "info" : "neutral"}>{m.role}</Badge></div>
                <span className="w-28 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">
                  {isAccountManager ? `${clientsAssigned} clients` : `${openTasks} tasks`}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
