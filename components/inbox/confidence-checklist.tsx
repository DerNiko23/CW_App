import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfidenceChecks } from "@/lib/pipeline/types";

// MASTERPLAN.md §3.2C: nur die 4 ehrlichen Checks, keine "Ironie erkannt"-Versprechen.
const CHECK_LABELS: Array<{ key: keyof ConfidenceChecks; label: string }> = [
  { key: "mythMatched", label: "Mythos in Datenbank gematcht" },
  { key: "quoteVerbatimInTranscript", label: "Aussage wörtlich im Transkript" },
  { key: "coreTopicNutrition", label: "Thema: Ernährung (Chris-Kernthema)" },
  { key: "sourcesAvailable", label: "Studien/Quellen vorhanden" },
];

export function confidenceTier(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

const TIER_LABEL: Record<string, string> = {
  high: "Hohe Konfidenz",
  medium: "Mittlere Konfidenz",
  low: "Niedrige Konfidenz",
};

export function ConfidenceChecklist({
  confidence,
  checks,
  className,
}: {
  confidence: number;
  checks: ConfidenceChecks;
  className?: string;
}) {
  const tier = confidenceTier(confidence);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "size-2.5 rounded-full",
            tier === "high" && "bg-success",
            tier === "medium" && "bg-accent",
            tier === "low" && "bg-destructive/70",
          )}
        />
        <span className="font-display text-xl font-semibold tabular-nums">
          {Math.round(confidence)}%
        </span>
        <span className="text-sm text-muted-foreground">— {TIER_LABEL[tier]}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {CHECK_LABELS.map(({ key, label }) => {
          const passed = checks[key];
          return (
            <li key={key} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  passed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/60",
                )}
              >
                {passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <span className={passed ? "text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
