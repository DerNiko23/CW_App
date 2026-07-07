import { formatNumber } from "@/lib/format";
import type { InboxItem } from "./types";

// MASTERPLAN.md §3.2B: die Bullet-Erklärung des Opportunity Scores ("Warum jetzt reagieren?").
export function buildScoreBullets(
  item: Pick<InboxItem, "views" | "deltaViewsPer24h" | "likes" | "comments" | "score" | "snapshotCount">,
): string[] {
  const { views, deltaViewsPer24h, likes, comments, score, snapshotCount } = item;
  const bullets: string[] = [`${formatNumber(views)} Aufrufe`];

  if (score.velocityIsFallback || deltaViewsPer24h === null) {
    bullets.push(
      `Noch zu wenig Verlaufsdaten für Velocity (${snapshotCount} ${
        snapshotCount === 1 ? "Snapshot" : "Snapshots"
      } bisher, Reach als Näherung verwendet)`,
    );
  } else {
    const sign = deltaViewsPer24h >= 0 ? "+" : "";
    bullets.push(`${sign}${formatNumber(deltaViewsPer24h)} in den letzten 24 Stunden (Velocity)`);
  }

  const interactions = likes + comments;
  bullets.push(
    `${formatNumber(interactions)} Interaktionen relativ zu ${formatNumber(views)} Views (Engagement-Score ${Math.round(score.engagement)}/100)`,
  );

  bullets.push(
    score.novelty === 100
      ? "Noch kein Video von Chris zu genau diesem Mythos"
      : "Dieser Mythos wurde bereits behandelt (Duplicate-Schutz)",
  );

  return bullets;
}
