import { cn } from "@/lib/utils";
import { scorePriorityLabel } from "@/lib/inbox/constants";

const TIER_STYLES: Record<string, string> = {
  hero: "bg-accent text-accent-foreground shadow-sm shadow-accent-foreground/10",
  high: "bg-accent/20 text-accent-foreground border border-accent/40",
  mid: "bg-secondary text-secondary-foreground border border-border",
  low: "bg-muted text-muted-foreground border border-border",
};

function tierFor(score: number): keyof typeof TIER_STYLES {
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

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 leading-none",
        TIER_STYLES[tier],
        size === "sm" && "px-2 py-1",
        size === "lg" && "px-4 py-2.5",
        className,
      )}
    >
      <span
        className={cn(
          "font-display font-semibold tabular-nums",
          size === "sm" && "text-lg",
          size === "md" && "text-2xl",
          size === "lg" && "text-4xl",
        )}
      >
        {rounded}
      </span>
      {showLabel && (
        <span
          className={cn(
            "font-medium tracking-wide uppercase opacity-70",
            size === "sm" ? "text-[9px]" : "text-[10px]",
          )}
        >
          {size === "sm" ? "Score" : scorePriorityLabel(rounded)}
        </span>
      )}
    </div>
  );
}
