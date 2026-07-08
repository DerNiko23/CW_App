"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateMessage } from "@/lib/format";
import type { DiscoveryProgressEvent } from "@/lib/pipeline/discovery";

type StreamEvent = DiscoveryProgressEvent | { type: "error"; error: string };

// Muss mit STOP_AFTER_FOUND in app/api/pipeline/auto-search/route.ts übereinstimmen -
// nur für die Fortschritts-Copy "x/5 gefunden", keine echte Limit-Logik hier.
const TARGET_FOUND = 5;

export function AutoSearchButton() {
  const [isSearching, setIsSearching] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const router = useRouter();

  async function handleClick() {
    setIsSearching(true);
    setFoundCount(0);

    try {
      const res = await fetch("/api/pipeline/auto-search", { method: "POST" });
      if (!res.body) throw new Error("Keine Antwort vom Server erhalten.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastFoundCount = 0;
      let doneEvent: (StreamEvent & { type: "done" }) | null = null;
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
            lastFoundCount = event.foundCount;
            setFoundCount(event.foundCount);
          } else if (event.type === "done") {
            doneEvent = event;
          } else if (event.type === "error") {
            errorMessage = event.error;
          }
        }
      }

      if (errorMessage) {
        toast.error(`Suche fehlgeschlagen: ${truncateMessage(errorMessage)}`);
      } else {
        const finalCount = doneEvent?.foundCount ?? lastFoundCount;
        const results = doneEvent?.summary.results ?? [];
        // Bekannte Einschraenkung (CHANGELOG 2026-07-08): YouTube blockiert die
        // Transkript-Route vermutlich IP-basiert von Cloud-Hosts aus - wenn wirklich
        // jeder geprüfte Kandidat daran scheitert, ist "Keine neuen Treffer" irreführend
        // (klingt nach normalem Ergebnis, ist aber ein bekanntes technisches Problem).
        const allBlockedByTranscript =
          results.length > 0 &&
          results.every((r) => r.result.status === "skipped" && r.result.reason === "no_transcript");

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
    } catch (err) {
      toast.error(`Suche fehlgeschlagen: ${truncateMessage((err as Error).message)}`);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isSearching}
      className="border-white/40 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md hover:bg-white/30"
    >
      {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
      {isSearching ? `Suche läuft … ${foundCount}/${TARGET_FOUND} gefunden` : "Auto-Search"}
    </Button>
  );
}
