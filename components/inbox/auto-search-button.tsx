"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateMessage } from "@/lib/format";
import type { DiscoveryProgressEvent } from "@/lib/pipeline/discovery";

type StreamEvent = DiscoveryProgressEvent | { type: "error"; error: string };
type DoneEvent = StreamEvent & { type: "done" };

// Muss mit STOP_AFTER_FOUND in app/api/pipeline/auto-search/route.ts übereinstimmen -
// nur für die Fortschritts-Copy "x/5 gefunden", keine echte Limit-Logik hier.
const TARGET_FOUND = 5;
const POLL_INTERVAL_MS = 1500;
// Jeder Request bricht serverseitig nach RUN_TIME_BUDGET_MS sauber ab (route.ts), statt eine
// Vercel-Function-Zeitgrenze mitten in der Verarbeitung zu riskieren (dort kommt keine
// verwertbare Antwort mehr an - siehe CHANGELOG 2026-07-11). Dieses Limit deckelt, wie oft der
// Client automatisch einen Folge-Request anhängt, wenn das Ziel noch nicht erreicht ist -
// Kosten-/Wartezeit-Sicherheitsnetz für die Verkettung selbst.
const MAX_ATTEMPTS = 5;

type AttemptResult = { errorMessage: string | null; doneEvent: DoneEvent | null };

async function runOneAttempt(onProgress: (foundCount: number) => void): Promise<AttemptResult> {
  const res = await fetch("/api/pipeline/auto-search", { method: "POST" });
  if (!res.body) throw new Error("Keine Antwort vom Server erhalten.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneEvent: DoneEvent | null = null;
  let errorMessage: string | null = null;

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
        doneEvent = event;
        onProgress(event.foundCount);
      } else if (event.type === "error") {
        errorMessage = event.error;
      }
    }
  }

  return { errorMessage, doneEvent };
}

export function AutoSearchButton() {
  const [isSearching, setIsSearching] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const router = useRouter();
  const lastPolledCountRef = useRef(0);
  // Beste bekannte Zahl aus Streaming UND Polling zusammen - `foundCount` (State) hinkt dem
  // synchronen Ablauf unten immer einen Render hinterher, für die Abbruch-/Toast-Entscheidung
  // am Ende brauchen wir den aktuellen Wert sofort.
  const bestKnownCountRef = useRef(0);

  function bumpFoundCount(count: number) {
    if (count > bestKnownCountRef.current) {
      bestKnownCountRef.current = count;
      setFoundCount(count);
    }
  }

  async function handleClick() {
    setIsSearching(true);
    setFoundCount(0);
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

    let allResults: DoneEvent["summary"]["results"] = [];
    let hardError: string | null = null;
    let keepGoing = true;
    let attempts = 0;

    try {
      while (keepGoing && attempts < MAX_ATTEMPTS && bestKnownCountRef.current < TARGET_FOUND) {
        attempts += 1;
        try {
          const { errorMessage, doneEvent } = await runOneAttempt(bumpFoundCount);
          if (errorMessage) {
            hardError = errorMessage;
            keepGoing = false;
          } else if (doneEvent) {
            allResults = allResults.concat(doneEvent.summary.results);
            const reachedTarget = doneEvent.foundCount >= TARGET_FOUND;
            const nothingLeftToCheck = doneEvent.summary.videoIdsNew === 0;
            // Nur bei einem Zeitlimit-Abbruch automatisch weitermachen - die anderen
            // Stop-Gruende (Ziel erreicht, MAX_CANDIDATES/MAX_SEARCHES-Sicherheitsnetz) sollen
            // wie bisher wirklich stoppen, sonst hebelt die Verkettung die Kostenbremse aus.
            keepGoing = !reachedTarget && !nothingLeftToCheck && doneEvent.summary.timedOut;
          } else {
            // Stream endete ohne "done"-Zeile - Verbindung vermutlich mitten drin abgebrochen.
            // Noch ein Versuch lohnt sich, bereits verarbeitete Kandidaten werden dabei
            // uebersprungen (filterUnseenVideoIds), es wird also nichts doppelt bezahlt.
          }
        } catch (err) {
          if (attempts >= MAX_ATTEMPTS) {
            hardError = (err as Error).message;
          }
        }
      }

      if (allResults.length === 0 && bestKnownCountRef.current === 0 && hardError) {
        toast.error(`Suche fehlgeschlagen: ${truncateMessage(hardError)}`);
      } else {
        const finalCount = bestKnownCountRef.current;
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
      {isSearching ? `Suche läuft … ${foundCount}/${TARGET_FOUND} gefunden` : "Auto-Search"}
    </Button>
  );
}
