import { cn } from "@/lib/utils";
import { scorePriorityLabel } from "@/lib/inbox/constants";

type Tier = "hero" | "high" | "mid" | "low";

// Echte Ampel-Logik: gruen = hohe Prioritaet, gelb = mittel, rot = niedrig.
// hero/high teilen sich die gruene Familie (solid vs. getoent), damit die
// Kompaktansicht weiterhin 4 Stufen unterscheidet.
const CHIP_STYLES: Record<Tier, string> = {
  hero: "bg-success text-success-foreground",
  high: "border border-success/30 bg-success/15 text-success",
  mid: "border border-warning/30 bg-warning/15 text-warning",
  low: "border border-destructive/25 bg-destructive/10 text-destructive",
};

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

  // Detailseite: Score-Zahl ist das visuelle Signature-Element - bewusst
  // ohne umschliessenden Chip, nur grosse Space-Grotesk-Zahl + Ampel-Farbe.
  if (size === "lg") {
    return (
      <div className={cn("inline-flex flex-col gap-1", className)}>
        <span
          className={cn(
            "font-heading text-6xl leading-none font-semibold tabular-nums",
            BARE_TEXT[tier],
          )}
        >
          {rounded}
        </span>
        {showLabel && (
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className={cn("size-2 rounded-full", DOT_STYLES[tier])} />
            {scorePriorityLabel(rounded)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 leading-none",
        CHIP_STYLES[tier],
        size === "sm" && "px-2 py-1",
        className,
      )}
    >
      <span
        className={cn(
          "font-heading font-semibold tabular-nums",
          size === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        {rounded}
      </span>
      {showLabel && (
        <span className="text-[9px] font-medium tracking-wide uppercase opacity-70">
          {size === "sm" ? "Score" : scorePriorityLabel(rounded)}
        </span>
      )}
    </div>
  );
}
