"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLiveMode } from "@/lib/integration-mode";
import { getScopedTasks } from "@/lib/scope-selectors";
import { logAuditAction } from "@/lib/runtime-store";
import type { Scope } from "@/lib/scope-context";
import type { Task } from "@/lib/types";

interface TaskRow {
  id: string;
  client_id: string;
  location_id: string | null;
  doctor_id: string | null;
  module: string;
  title: string;
  priority: Task["priority"];
  due_date: string | null;
  status: Task["status"];
  ai_recommended: boolean;
  source: Task["source"];
}

function mapRow(row: TaskRow): Omit<Task, "owner" | "ownerTeam"> {
  return {
    id: row.id,
    clientId: row.client_id,
    locationId: row.location_id ?? undefined,
    doctorId: row.doctor_id ?? undefined,
    module: row.module,
    title: row.title,
    priority: row.priority,
    dueDate: row.due_date ?? "",
    status: row.status,
    aiRecommended: row.ai_recommended,
    source: row.source,
  };
}

export async function listTasks(scope: Scope) {
  if (!isLiveMode()) return getScopedTasks(scope);
  const supabase = getSupabaseBrowserClient();
  let query = supabase.from("tasks").select("*");
  if (scope.type === "client") query = query.eq("client_id", scope.clientId);
  if (scope.type === "location") query = query.eq("location_id", scope.locationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as TaskRow[]).map(mapRow);
}

export async function createTask(input: {
  clientId: string; locationId?: string; doctorId?: string; module: string; title: string;
  priority: Task["priority"]; dueDate: string; source: Task["source"]; aiRecommended: boolean;
}) {
  if (!isLiveMode()) {
    throw new Error("createTask live path called while INTEGRATION_MODE=mock — use addCustomTask() from runtime-store instead in mock mode.");
  }
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      client_id: input.clientId, location_id: input.locationId ?? null, doctor_id: input.doctorId ?? null,
      module: input.module, title: input.title, priority: input.priority, due_date: input.dueDate,
      source: input.source, ai_recommended: input.aiRecommended,
    })
    .select("id")
    .single();
  if (error) throw error;
  logAuditAction("task.created", "task", data.id, input.title, { clientId: input.clientId, locationId: input.locationId });
  return data.id as string;
}
