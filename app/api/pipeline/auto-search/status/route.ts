import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONFIDENCE_THRESHOLD } from "@/lib/pipeline/confidence";

export const dynamic = "force-dynamic";

// Fallback fuer den Live-Fortschritt des Auto-Search-Buttons: der Streaming-Response von
// /api/pipeline/auto-search liefert auf Vercels Node-Serverless-Funktionen nicht zuverlässig
// inkrementell aus (dort wird die Antwort bis zum Ende der Funktion gepuffert, lokal im Dev-Server
// dagegen schon - live getestet, siehe CHANGELOG). Der Client pollt stattdessen hier, waehrend die
// eigentliche Suche laeuft: "gefunden" heisst hier exakt dasselbe wie `foundCount` in
// runDiscovery() (lib/pipeline/discovery.ts) - ein Video mit mind. einem Claim ueber der
// Confidence-Schwelle, angelegt seit Suchstart. Keine neue Job-State-Tabelle noetig, `claims`
// traegt das schon mit (`created_at`).
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since");
  if (!since) {
    return NextResponse.json({ error: "Missing 'since' query param" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("claims")
    .select("video_id")
    .gte("created_at", since)
    .gte("confidence", CONFIDENCE_THRESHOLD);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const foundCount = new Set((data ?? []).map((row) => row.video_id as string)).size;
  return NextResponse.json({ foundCount });
}
