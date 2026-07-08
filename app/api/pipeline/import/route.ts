import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processVideoByUrl } from "@/lib/pipeline/import";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Manueller URL-Import (MASTERPLAN.md §5). Kein eigener Auth-Check: der Pfad
// läuft (anders als /api/cron/*) durch proxy.ts und ist damit bereits per
// Session-Cookie geschützt.
export async function POST(request: NextRequest) {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 },
    );
  }

  let url: string | undefined;
  try {
    const body = (await request.json()) as { url?: string };
    url = body.url;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' in body" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const result = await processVideoByUrl({ supabase, youtubeApiKey, url });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Manual import failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
