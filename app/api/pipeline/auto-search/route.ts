import { createAdminClient } from "@/lib/supabase/admin";
import { runDiscovery, type DiscoveryProgressEvent } from "@/lib/pipeline/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Nutzer wartet interaktiv: 5 Treffer sind das Ziel, die anderen beiden Limits sind
// Sicherheitsnetze (Claude-Kosten/Wartezeit bzw. YouTube-Quota), siehe CHANGELOG.
const STOP_AFTER_FOUND = 5;
const MAX_CANDIDATES = 20;
const MAX_SEARCHES = 8;

// Ein voller Lauf kann real 80-150+s dauern (mehrere Claude-Aufrufe + Transkript-Proxy-Retries
// pro Kandidat) - laenger, als sich auf `maxDuration = 300` auf Vercels Node-Serverless-Funktionen
// verlassen laesst (dort werden lang laufende Requests je nach Plan/Konfiguration gekappt, ohne
// dass eine saubere Antwort ankommt - live beobachtet, siehe CHANGELOG 2026-07-11). Statt das zu
// riskieren, bricht `runDiscovery` VOR dieser Grenze selbst sauber ab; der Client
// (auto-search-button.tsx) erkennt `summary.timedOut` und haengt automatisch einen Folge-Request
// an, bis 5 Treffer erreicht sind oder nichts Neues mehr zu finden ist.
const RUN_TIME_BUDGET_MS = 40_000;

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
          deadline: Date.now() + RUN_TIME_BUDGET_MS,
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
