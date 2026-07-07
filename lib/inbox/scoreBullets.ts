import { formatNumber } from "@/lib/format";
import type { InboxItem } from "./types";

type ScoreBulletsInput = Pick<
  InboxItem,
  "views" | "deltaViewsPer24h" | "likes" | "comments" | "score" | "snapshotCount" | "alreadyHandledElsewhere" | "claim"
>;

// MASTERPLAN.md §3.2B: die Bullet-Erklärung des Opportunity Scores ("Warum jetzt reagieren?").
export function buildScoreBullets(item: ScoreBulletsInput): string[] {
  const { views, deltaViewsPer24h, likes, comments, score, snapshotCount, alreadyHandledElsewhere, claim } = item;
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

  // Novelty 0 hat zwei ehrlich verschiedene Ursachen (siehe lib/pipeline/novelty.ts): ein
  // Video ist wirklich schon "erledigt" (alreadyHandledElsewhere oder covered_by_chris) -
  // ODER der Mythos wurde nur wiederholt als "Thema uninteressant" abgelehnt
  // (topic_deprioritized, lib/ranking/adaptive.ts). Nur der erste Fall darf "bereits
  // behandelt" sagen, sonst würde die App eine Erledigung behaupten, die nie stattfand.
  const genuinelyHandled = alreadyHandledElsewhere || Boolean(claim.myth?.covered_by_chris);
  bullets.push(
    score.novelty === 100
      ? "Noch kein Video von Chris zu genau diesem Mythos"
      : genuinelyHandled
        ? "Dieser Mythos wurde bereits von Chris behandelt (Duplicate-Schutz)"
        : "Thema wurde wiederholt als uninteressant abgelehnt (niedrigere Priorität, aber nicht von Chris behandelt)",
  );

  return bullets;
}
