import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

// POST /api/clients — Journey A (Live Agency Workspace path). Server-side
// write using the service-role client, matching the same "server-side
// authorization" pattern as the Google OAuth routes (Part 24) — there is no
// real Supabase Auth session yet to authorize this from the browser
// directly, so privileged writes go through a Route Handler rather than
// the anon-key client. Once real auth exists, this should additionally
// verify the caller's role/agency before writing.
//
// Locations are intentionally optional — Journey A: "Do not require
// locations to be manually entered if they can be discovered from Google
// later."
export async function POST(req: NextRequest) {
  const body = await req.json() as { name?: string; specialty?: string; city?: string; doctorName?: string };
  if (!body.name || !body.specialty || !body.city) {
    return NextResponse.json({ error: "name, specialty, and city are required" }, { status: 400 });
  }

  let supabase: ReturnType<typeof getSupabaseServiceRoleClient>;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured for live writes (SUPABASE_SERVICE_ROLE_KEY missing) — see /integrations/system-health." }, { status: 503 });
  }

  // Single-agency assumption for this phase — matches the rest of the
  // Live Agency Workspace architecture, which has one agency until real
  // multi-agency auth exists.
  const { data: agency, error: agencyErr } = await supabase.from("agencies").select("id").limit(1).maybeSingle();
  if (agencyErr || !agency) {
    return NextResponse.json({ error: "No agency exists yet in Supabase. Run the seed script (or create one manually) before adding a live client." }, { status: 412 });
  }

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({ agency_id: agency.id, name: body.name, specialty: body.specialty, city: body.city, status: "onboarding" })
    .select("id")
    .single();
  if (clientErr || !client) {
    return NextResponse.json({ error: clientErr?.message ?? "Failed to create client" }, { status: 500 });
  }

  let doctorId: string | null = null;
  if (body.doctorName) {
    const { data: doctor } = await supabase
      .from("doctors")
      .insert({ agency_id: agency.id, client_id: client.id, name: body.doctorName, specialty: body.specialty })
      .select("id")
      .single();
    doctorId = doctor?.id ?? null;
  }

  await supabase.from("integration_activity_log").insert({
    agency_id: agency.id, actor_label: "Add Client", client_id: client.id,
    integration: "google", action: `Client "${body.name}" created`, result: "success",
  });

  return NextResponse.json({ clientId: client.id, doctorId });
}
