import { createAdminClient } from "@/lib/supabase/admin";
import { runDiscovery, type DiscoveryProgressEvent } from "@/lib/pipeline/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Nutzer wartet interaktiv: 5 Treffer sind das Ziel, die anderen beiden Limits sind
// Sicherheitsnetze (Claude-Kosten/Wartezeit bzw. YouTube-Quota), siehe CHANGELOG.
const STOP_AFTER_FOUND = 5;
const MAX_CANDIDATES = 20;
const MAX_SEARCHES = 8;

// Kein eigener Auth-Check: laeuft (wie /api/pipeline/import) durch proxy.ts
// und ist damit bereits per Session-Cookie geschuetzt.
export async function POST() {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    return new Response(JSON.stringify({ type: "error", error: "YOUTUBE_API_KEY not configured" }), {
      status: 500,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: DiscoveryProgressEvent | { type: "error"; error: string }) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }
      try {
        const supabase = createAdminClient();
        await runDiscovery({
          supabase,
          youtubeApiKey,
          maxSearchesThisRun: MAX_SEARCHES,
          maxCandidatesProcessed: MAX_CANDIDATES,
          stopAfterFoundCount: STOP_AFTER_FOUND,
          onProgress: send,
        });
      } catch (err) {
        console.error("Auto-Search failed", err);
        send({ type: "error", error: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
}
