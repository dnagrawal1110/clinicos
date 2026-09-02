"use client";

// Browser-safe reads of connection state. Never imports token-encryption or
// the service-role client — this only ever touches the columns granted to
// `authenticated` (see the column-level GRANT in
// 20260903000002_fix_connection_column_security.sql), so there is no code
// path here that could accidentally expose a ciphertext value.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLiveMode } from "@/lib/integration-mode";
import type { ConnectionState } from "@/lib/integrations/connection-state";

export interface ConnectionSummary {
  id: string;
  clientId: string | null;
  provider: string;
  status: ConnectionState;
  externalAccountName?: string;
  tokenExpiresAt?: string;
  lastSuccessfulSyncAt?: string;
  lastFailedSyncAt?: string;
  lastErrorMessage?: string;
  readCapabilities: string[];
  writeCapabilitiesEnabled: string[];
}

const SAFE_COLUMNS = "id, client_id, provider, status, external_account_name, token_expires_at, last_successful_sync_at, last_failed_sync_at, last_error_message, read_capabilities, write_capabilities_enabled";

interface ConnectionRow {
  id: string; client_id: string | null; provider: string; status: ConnectionState;
  external_account_name: string | null; token_expires_at: string | null;
  last_successful_sync_at: string | null; last_failed_sync_at: string | null; last_error_message: string | null;
  read_capabilities: string[] | null; write_capabilities_enabled: string[] | null;
}

export async function getConnectionForClient(clientId: string, provider: string): Promise<ConnectionSummary | null> {
  if (!isLiveMode()) return null; // Demo Workspace never has a real connection
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("connections").select(SAFE_COLUMNS).eq("client_id", clientId).eq("provider", provider).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapRow(data as unknown as ConnectionRow);
}

export async function listConnectionsForAgency(): Promise<ConnectionSummary[]> {
  if (!isLiveMode()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("connections").select(SAFE_COLUMNS);
  if (error || !data) return [];
  return (data as unknown as ConnectionRow[]).map(mapRow);
}

function mapRow(row: ConnectionRow): ConnectionSummary {
  return {
    id: row.id, clientId: row.client_id, provider: row.provider, status: row.status,
    externalAccountName: row.external_account_name ?? undefined, tokenExpiresAt: row.token_expires_at ?? undefined,
    lastSuccessfulSyncAt: row.last_successful_sync_at ?? undefined, lastFailedSyncAt: row.last_failed_sync_at ?? undefined,
    lastErrorMessage: row.last_error_message ?? undefined,
    readCapabilities: row.read_capabilities ?? [], writeCapabilitiesEnabled: row.write_capabilities_enabled ?? [],
  };
}
