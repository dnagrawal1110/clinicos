// Idempotency helper (section 15). The actual guarantee lives in Postgres —
// every table an event/webhook writes to has a UNIQUE index on its
// idempotency key (domain_events.idempotency_key, messages
// provider+provider_message_id, webhook_events.idempotency_key — see the
// migrations). This module just standardizes how call sites build that key
// and interpret the "already processed" result, so nobody invents their own
// dedupe scheme per integration.
export function buildIdempotencyKey(parts: (string | number)[]): string {
  return parts.map(String).join(":");
}

export interface IdempotentInsertResult {
  wasNew: boolean;
}

// Wraps a Supabase insert that uses `.upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: true })`
// or an `ON CONFLICT DO NOTHING` RPC. Supabase-js returns an empty `data`
// array (not an error) when ignoreDuplicates skips a row — that's the
// signal this helper turns into a boolean so callers can decide whether to
// run side effects (increment a metric, send a message, create a task).
export function interpretIdempotentInsert(insertedRows: unknown[] | null): IdempotentInsertResult {
  return { wasNew: Boolean(insertedRows && insertedRows.length > 0) };
}
