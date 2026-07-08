import { cn } from "@/lib/utils";
import { scorePriorityLabel } from "@/lib/inbox/constants";

type Tier = "hero" | "high" | "mid" | "low";

// Echte Ampel-Logik: gruen = hohe Prioritaet, gelb = mittel, rot = niedrig.
// hero/high teilen sich die gruene Familie, damit die Kompaktansicht
// weiterhin 4 Stufen unterscheidet.
const BARE_TEXT: Record<Tier, string> = {
  hero: "text-success",
  high: "text-success",
  mid: "text-warning",
  low: "text-destructive",
};

const DOT_STYLES: Record<Tier, string> = {
  hero: "bg-success",
  high: "bg-success",
  mid: "bg-warning",
  low: "bg-destructive",
};

// Liste und Detailseite teilen sich jetzt dieselbe nackte-Zahl-Sprache -
// nur die Groesse unterscheidet. text-6xl bleibt exklusiv der Detailseite
// vorbehalten (DESIGN.md: "Die Eine-Zahl-Regel").
const SIZE_TEXT: Record<"sm" | "md" | "lg", string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
};

function tierFor(score: number): Tier {
  if (score >= 80) return "hero";
  if (score >= 60) return "high";
  if (score >= 40) return "mid";
  return "low";
}

export function ScoreBadge({
  score,
  size = "md",
  showLabel = true,
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const tier = tierFor(score);
  const rounded = Math.round(score);
  const priorityLabel = scorePriorityLabel(rounded);

  // Score-Zahl ist das visuelle Signature-Element auf jeder Groesse - bewusst
  // ohne umschliessenden Chip, nur Space-Grotesk-Zahl + Ampel-Farbe. Audit
  // 2026-07-08: aria-label auf dem Container statt der reinen Zahl, damit
  // Screenreader auch bei showLabel=false den vollen Kontext bekommen statt
  // einer nackten, unbeschrifteten Zahl.
  return (
    <div
      className={cn("inline-flex flex-col gap-1", className)}
      aria-label={`Opportunity Score ${rounded} von 100, ${priorityLabel}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "font-heading leading-none font-semibold tabular-nums",
          SIZE_TEXT[size],
          BARE_TEXT[tier],
        )}
      >
        {rounded}
      </span>
      {showLabel && (
        <span
          aria-hidden="true"
          className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          <span className={cn("size-2 rounded-full", DOT_STYLES[tier])} />
          {priorityLabel}
        </span>
      )}
    </div>
  );
}
