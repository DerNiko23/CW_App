"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateMessage } from "@/lib/format";
import type { DiscoveryProgressEvent } from "@/lib/pipeline/discovery";
import { runChainedSearch, type AttemptOutcome } from "@/lib/pipeline/autoSearchChain";

type StreamEvent = DiscoveryProgressEvent | { type: "error"; error: string };

// Zielwert: so viele Treffer sammelt die (ggf. verkettete) Suche an, bevor sie stoppt - muss mit
// STOP_AFTER_FOUND in app/api/pipeline/auto-search/route.ts übereinstimmen. Steuert nur die
// Verkettungs-Logik, wird bewusst NICHT mehr als Live-Zähler im Button angezeigt.
const TARGET_FOUND = 5;
const POLL_INTERVAL_MS = 1500;
// Jeder Request bricht serverseitig nach RUN_TIME_BUDGET_MS sauber ab (route.ts), statt eine
// Vercel-Function-Zeitgrenze mitten in der Verarbeitung zu riskieren (dort kommt keine
// verwertbare Antwort mehr an - siehe CHANGELOG 2026-07-11). Dieses Limit deckelt, wie oft
// runChainedSearch (lib/pipeline/autoSearchChain.ts) automatisch einen Folge-Request anhängt,
// wenn das Ziel noch nicht erreicht ist - Kosten-/Wartezeit-Sicherheitsnetz für die Verkettung
// selbst. Die eigentliche Verkettungs-Entscheidung + Ablaufsteuerung ist dort extrahiert und
// eigenständig getestet (autoSearchChain.test.ts), damit dieser fehleranfällige Pfad nicht nur
// per Code-Review, sondern durch echte Ausführung abgesichert ist.
const MAX_ATTEMPTS = 5;

// YouTube gibt bei aufgebrauchtem Tageskontingent ein hartes 429 / RESOURCE_EXHAUSTED zurück -
// das ist kein normales "keine Treffer", sondern ein technischer Zustand, der bis zum
// Quota-Reset (Mitternacht US-Westküstenzeit) anhält. Klar benennen, sonst wirkt der Button
// grundlos kaputt.
function isQuotaError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("quota") || m.includes("429") || m.includes("resource_exhausted");
}

async function runOneAttempt(onProgress: (foundCount: number) => void): Promise<AttemptOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/pipeline/auto-search", { method: "POST" });
  } catch (err) {
    return { kind: "networkError", message: (err as Error).message };
  }
  if (!res.body) return { kind: "networkError", message: "Keine Antwort vom Server erhalten." };

  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as StreamEvent;
        if (event.type === "candidate") {
          onProgress(event.foundCount);
        } else if (event.type === "done") {
          onProgress(event.foundCount);
          return {
            kind: "done",
            summary: { ...event.summary, foundCount: event.foundCount },
          };
        } else if (event.type === "error") {
          return { kind: "serverError", message: event.error };
        }
      }
    }
  } catch (err) {
    return { kind: "networkError", message: (err as Error).message };
  }

  // Stream endete sauber, aber ohne "done"-Zeile - Verbindung vermutlich mitten drin abgebrochen.
  return { kind: "incomplete" };
}

export function AutoSearchButton() {
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const lastPolledCountRef = useRef(0);
  // Beste bekannte Trefferzahl aus Streaming UND Polling zusammen - nur noch für die finale
  // Toast-Meldung. Der Button zeigt bewusst keinen Live-Zähler mehr (Wunsch: nur "Auto-Search"),
  // deshalb reicht ein Ref ohne Re-Render.
  const bestKnownCountRef = useRef(0);

  function bumpFoundCount(count: number) {
    if (count > bestKnownCountRef.current) {
      bestKnownCountRef.current = count;
    }
  }

  async function handleClick() {
    setIsSearching(true);
    bestKnownCountRef.current = 0;
    lastPolledCountRef.current = 0;
    const startedAt = new Date().toISOString();

    // Fallback fuer den Live-Fortschritt: die Streaming-Response in runOneAttempt() liefert lokal
    // inkrementell aus, auf Vercels Node-Serverless-Funktionen kam sie live beobachtet teils erst
    // gebündelt am Ende an. Wir pollen deshalb parallel den tatsächlichen DB-Stand
    // (/api/pipeline/auto-search/status) und aktualisieren die Inbox live, sobald sich der Zähler
    // ändert - funktioniert unabhängig davon, ob die Streaming-Response ankommt.
    const pollTimer = window.setInterval(async () => {
      try {
        const statusRes = await fetch(
          `/api/pipeline/auto-search/status?since=${encodeURIComponent(startedAt)}`,
        );
        if (!statusRes.ok) return;
        const { foundCount: polledCount } = (await statusRes.json()) as { foundCount: number };
        if (polledCount > lastPolledCountRef.current) {
          lastPolledCountRef.current = polledCount;
          bumpFoundCount(polledCount);
          router.refresh();
        }
      } catch {
        // Polling ist nur ein Fortschritts-Hinweis - ein einzelner Fehlschlag ist egal,
        // der naechste Tick versucht es erneut.
      }
    }, POLL_INTERVAL_MS);

    try {
      const { allResults, hardError, bestKnownFoundCount } = await runChainedSearch({
        targetFound: TARGET_FOUND,
        maxAttempts: MAX_ATTEMPTS,
        runAttempt: () => runOneAttempt(bumpFoundCount),
      });
      const finalCount = Math.max(bestKnownFoundCount, bestKnownCountRef.current);

      if (allResults.length === 0 && finalCount === 0 && hardError) {
        if (isQuotaError(hardError)) {
          toast.error(
            "YouTube-Tageskontingent aufgebraucht. Die automatische Suche ist erst nach dem Quota-Reset (Mitternacht US-Westküstenzeit) wieder möglich.",
            { duration: 9000 },
          );
        } else {
          toast.error(`Suche fehlgeschlagen: ${truncateMessage(hardError)}`);
        }
      } else {
        // Bekannte Einschraenkung (CHANGELOG 2026-07-08): YouTube blockiert die
        // Transkript-Route vermutlich IP-basiert von Cloud-Hosts aus - wenn wirklich
        // jeder geprüfte Kandidat daran scheitert, ist "Keine neuen Treffer" irreführend
        // (klingt nach normalem Ergebnis, ist aber ein bekanntes technisches Problem).
        const allBlockedByTranscript =
          allResults.length > 0 &&
          allResults.every((r) => r.result.status === "skipped" && r.result.reason === "no_transcript");

        if (finalCount === 0 && allBlockedByTranscript) {
          toast.error(
            "YouTube blockiert Transkript-Abrufe von diesem Server. Aktuell können dadurch keine neuen Videos automatisch gefunden werden.",
            { duration: 8000 },
          );
        } else if (finalCount === 0) {
          toast.info("Keine neuen Treffer");
        } else if (finalCount === 1) {
          toast.success("1 neues Video gefunden");
        } else {
          toast.success(`${finalCount} neue Videos gefunden`);
        }
        router.refresh();
      }
    } finally {
      window.clearInterval(pollTimer);
      setIsSearching(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isSearching}
      className="ml-auto border-white/40 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md hover:bg-white/30"
    >
      {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
      Auto-Search
    </Button>
  );
}
