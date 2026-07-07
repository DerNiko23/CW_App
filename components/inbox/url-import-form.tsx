"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportResult =
  | { status: "processed"; videoId: string }
  | { status: "skipped"; reason: string; detail?: string }
  | { error: string };

const SKIP_LABELS: Record<string, string> = {
  no_transcript: "Kein Transkript verfügbar für dieses Video.",
  off_topic: "Video ist themenfremd (kein Ernährung/Fitness/Gesundheit).",
  no_claims: "Keine konkrete Tatsachenbehauptung im Transkript gefunden.",
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
            text: "error" in result ? result.error : "Import fehlgeschlagen.",
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
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube-URL einwerfen …"
            disabled={isPending}
            className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="submit" disabled={isPending || !url.trim()}>
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
