import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDiscovery } from "@/lib/pipeline/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  const authorized =
    !!cronSecret &&
    (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 },
    );
  }

  const maxSearchesParam = request.nextUrl.searchParams.get("maxSearches");

  try {
    const supabase = createAdminClient();
    const summary = await runDiscovery({
      supabase,
      youtubeApiKey,
      maxSearchesThisRun: maxSearchesParam ? Number(maxSearchesParam) : undefined,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Discovery run failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
