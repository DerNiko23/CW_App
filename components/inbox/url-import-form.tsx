"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateMessage } from "@/lib/format";

type ImportResult =
  | { status: "processed"; videoId: string }
  | { status: "skipped"; reason: string; detail?: string }
  | { error: string };

const SKIP_LABELS: Record<string, string> = {
  // Bekannte Einschraenkung (CHANGELOG 2026-07-08): auf Vercel scheitert der
  // Transkript-Abruf praktisch immer, auch bei Videos mit echtem Transkript -
  // vermutlich blockt YouTube Cloud-Server-IPs. "Kein Transkript verfügbar" waere
  // hier irreführend, weil es ein Problem mit DIESEM Video suggeriert.
  no_transcript:
    "YouTube blockiert Transkript-Abrufe von diesem Server. Kein Problem mit diesem Video – aktuell technisch nicht vermeidbar.",
  off_topic: "Video ist themenfremd (kein Ernährung/Fitness/Gesundheit).",
  no_claims: "Keine konkrete Tatsachenbehauptung im Transkript gefunden.",
  own_channel: "Das ist ein Video von deinem eigenen Kanal – wird nicht als Vorschlag importiert.",
};

export function UrlImportForm() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/pipeline/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const result = (await res.json()) as ImportResult;

        if (!res.ok || "error" in result) {
          setMessage({
            kind: "error",
            text: "error" in result ? truncateMessage(result.error) : "Import fehlgeschlagen.",
          });
          return;
        }

        if (result.status === "processed") {
          setUrl("");
          router.push(`/videos/${result.videoId}`);
          return;
        }

        setMessage({
          kind: "info",
          text: SKIP_LABELS[result.reason] ?? `Übersprungen: ${result.reason}`,
        });
      } catch {
        setMessage({ kind: "error", text: "Import fehlgeschlagen (Netzwerkfehler)." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="url-import-input" className="sr-only">
            YouTube-URL
          </label>
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="url-import-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube-URL einwerfen …"
            disabled={isPending}
            className="h-10 w-full rounded-full border border-white/40 bg-white/20 pr-3 pl-9 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md outline-none placeholder:text-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending || !url.trim()}
          className="h-10 border border-white/15 bg-neutral-900/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md backdrop-saturate-150 hover:bg-neutral-900/75"
        >
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Importieren
        </Button>
      </form>
      {message && (
        <p className={message.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
