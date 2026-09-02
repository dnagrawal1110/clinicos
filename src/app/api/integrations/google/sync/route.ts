import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { runInitialSync } from "@/lib/integrations/sync-orchestrator";

// POST /api/integrations/google/sync  { connectionId }
// Journey G — real step-by-step sync, no fake progress timers.
export async function POST(req: NextRequest) {
  const { connectionId } = await req.json() as { connectionId?: string };
  if (!connectionId) return NextResponse.json({ error: "connectionId is required" }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  try {
    const outcome = await runInitialSync(supabase, connectionId);
    return NextResponse.json(outcome);
  } catch (err) {
    console.error("[google-sync]", err);
    return NextResponse.json({ error: "Sync failed to start" }, { status: 502 });
  }
}
