"use client";

// Real dual-mode repository for the Client entity. See README.md in this
// directory for why this isn't wired into scope-selectors.ts yet.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLiveMode } from "@/lib/integration-mode";
import { ALL_CLIENTS, getClient as getMockClient } from "@/lib/mock/clients";
import type { Client, ModuleScores } from "@/lib/types";

interface ClientRow {
  id: string;
  name: string;
  brand: string | null;
  specialty: string;
  city: string;
  status: Client["status"];
  active_services: Client["activeServices"];
  scores: ModuleScores;
  health_overall: number;
  health_trend: number;
  created_at: string;
  account_manager_id: string | null;
}

// Live rows don't carry doctors/locations/reviewsTotal/etc inline the way
// the mock Client type does — those come from their own tables. This maps
// only the columns that live directly on `clients`; a live caller composing
// a full Client also needs listLocations()/listDoctors() for that client id.
function mapRow(row: ClientRow): Omit<Client, "doctors" | "locations" | "reviewsTotal" | "ratingAvg" | "leadsTotal" | "appointmentsTotal" | "adSpendTotal" | "websiteHealth" | "accountManager"> {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    specialty: row.specialty,
    city: row.city,
    status: row.status,
    activeServices: row.active_services,
    scores: row.scores,
    healthOverall: row.health_overall,
    healthTrend: row.health_trend,
    createdAt: row.created_at,
  };
}

export async function listClients() {
  if (!isLiveMode()) return ALL_CLIENTS;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("clients").select("*");
  if (error) throw error;
  return (data as ClientRow[]).map(mapRow);
}

export async function getClientById(id: string) {
  if (!isLiveMode()) return getMockClient(id) ?? null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as ClientRow) : null;
}
