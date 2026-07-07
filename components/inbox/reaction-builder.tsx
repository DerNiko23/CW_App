"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { generateReactionScriptAction } from "@/app/actions";
import type { ReactionScript } from "@/lib/reaction/types";
import type { MythInfo } from "@/lib/inbox/types";

function assembleFullScript(script: ReactionScript, sources: MythInfo["sources"]): string {
  const sourceLines = sources.map((s) => `- ${s.title} (${s.url})`).join("\n");
  return `HOOK (3 Varianten):
1. ${script.hooks[0] ?? ""}
2. ${script.hooks[1] ?? ""}
3. ${script.hooks[2] ?? ""}

KERNARGUMENT:
${script.core_argument}

QUELLEN:
${sourceLines}

ANALOGIE:
${script.analogy}

CALL TO ACTION:
${script.cta}`;
}

export function ReactionBuilder({
  videoId,
  initialScript,
  sources,
}: {
  videoId: string;
  initialScript: ReactionScript | null;
  sources: MythInfo["sources"];
}) {
  const [script, setScript] = useState(initialScript);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateReactionScriptAction(videoId);
        setScript(result);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 border border-border border-t-4 border-t-accent bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
            Reaktions-Baukasten
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {script && <CopyButton text={assembleFullScript(script, sources)} className="bg-accent/20" />}
          <Button size="sm" onClick={handleGenerate} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {script ? "Neu generieren" : "Skript generieren"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!script && !error && (
        <p className="text-sm text-muted-foreground">
          Generiert Hook-Varianten, Kernargument, Analogie und CTA im Ton von Chris –
          alles einzeln kopierbar.
        </p>
      )}

      {script && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Hook (3 Varianten)</p>
            {script.hooks.map((hook, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 rounded-xl bg-card p-3 text-sm"
              >
                <span className="font-medium">{hook}</span>
                <CopyButton text={hook} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Kernargument (warum das falsch ist)
            </p>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-card p-3 text-sm">
              <span>{script.core_argument}</span>
              <CopyButton text={script.core_argument} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Quellen</p>
            <div className="flex flex-col gap-1.5 rounded-xl bg-card p-3">
              {sources.map((source) => (
                <div key={source.url} className="flex items-start justify-between gap-3 text-sm">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
                  >
                    {source.title} <ExternalLink className="size-3 shrink-0" />
                  </a>
                  <CopyButton text={`${source.title} (${source.url})`} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Analogie</p>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-card p-3 text-sm">
              <span>{script.analogy}</span>
              <CopyButton text={script.analogy} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Call to Action</p>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-card p-3 text-sm">
              <span>{script.cta}</span>
              <CopyButton text={script.cta} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
