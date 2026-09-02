-- Fixes a real bug in the previous migration's column-hiding approach.
--
-- `connection_summaries` was declared `security_invoker = true` so RLS row
-- filtering would correctly run as the querying user (the table owner,
-- `postgres`, has BYPASSRLS — a security_invoker=false view would have
-- silently leaked every agency's connections to any authenticated user).
-- But security_invoker also means the view checks the invoking user's
-- table-level GRANTs, not the owner's — and the previous migration revoked
-- ALL table SELECT from `authenticated`, so the view returned "permission
-- denied" for everyone instead of the intended safe subset. Verified live:
-- an anon SELECT on connection_summaries returned 42501, not an empty set.
--
-- Fix: drop the view entirely and use column-level GRANTs instead. RLS
-- keeps controlling row visibility (unaffected by this change); Postgres
-- column privileges make the ciphertext/iv columns structurally
-- unselectable by anyone but the service role — no view indirection needed,
-- and no way for application code to accidentally SELECT * a secret.
drop view if exists public.connection_summaries;

grant select (
  id, agency_id, client_id, provider, connection_type, status,
  external_account_id, external_account_name, granted_scopes,
  token_expires_at, created_by, last_successful_sync_at, last_failed_sync_at,
  last_error_code, last_error_message, read_capabilities, write_capabilities_enabled,
  created_at, updated_at
) on public.connections to authenticated;

-- anon gets nothing at all — only authenticated agency staff (once real
-- auth exists) may see connection metadata, and even then never the
-- ciphertext/iv columns, which no grant below ever mentions.
