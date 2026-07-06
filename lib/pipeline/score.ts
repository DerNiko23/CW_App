import type { ScoreBreakdown, ScoreInputs, ScoreWeights } from "./types";

// Log-Normalisierung, weil View-/Delta-Zahlen über mehrere Größenordnungen
// streuen (1.000 vs. 5.000.000) – eine lineare Skala würde Reach/Velocity fast
// binär (0 oder 100) machen. Caps sind bewusst grobe, dokumentierte Annahmen
// (kein historisches Datenset zur Kalibrierung vorhanden), keine Magie.
const REACH_LOG_CAP = 7; // 10.000.000 Views = 100 Punkte
const VELOCITY_LOG_CAP = 5.3; // ~200.000 Views/24h = 100 Punkte
const ENGAGEMENT_RATE_CAP = 0.05; // (Likes+Kommentare)/Views von 5 % = 100 Punkte

function logNormalize(value: number, cap: number): number {
  const clamped = Math.max(0, value);
  const score = (Math.log10(clamped + 1) / cap) * 100;
  return Math.min(100, Math.max(0, score));
}

export function normalizeReach(views: number): number {
  return logNormalize(views, REACH_LOG_CAP);
}

export function normalizeVelocity(deltaViewsPer24h: number): number {
  return logNormalize(deltaViewsPer24h, VELOCITY_LOG_CAP);
}

export function normalizeEngagement(
  likes: number,
  comments: number,
  views: number,
): number {
  if (views <= 0) return 0;
  const rate = (likes + comments) / views;
  return Math.min(100, Math.max(0, (rate / ENGAGEMENT_RATE_CAP) * 100));
}

type SnapshotLike = { views: number; capturedAt: string };

// Velocity aus eigenen Snapshots (YouTube API liefert keinen View-Verlauf,
// MASTERPLAN.md §4). Braucht mindestens 2 Snapshots; nimmt den jeweils
// frühesten/spätesten, unabhängig von der Eingabe-Reihenfolge.
export function computeVelocityFromSnapshots(
  snapshots: SnapshotLike[],
): number | null {
  if (snapshots.length < 2) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const deltaMs = new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime();
  const deltaHours = deltaMs / (1000 * 60 * 60);
  if (deltaHours <= 0) return null;

  const deltaViews = last.views - first.views;
  return Math.round((deltaViews / deltaHours) * 24);
}

export function computeOpportunityScore(
  inputs: ScoreInputs,
  weights: ScoreWeights,
): ScoreBreakdown {
  const reach = normalizeReach(inputs.views);
  const velocityIsFallback = inputs.deltaViewsPer24h === null;
  // Fallback bei < 2 Snapshots: Reach als Näherung statt den Faktor auf 0 zu
  // setzen (ROADMAP-Risiko "Velocity-Daten zu dünn am Demo-Tag").
  const velocity = velocityIsFallback
    ? reach
    : normalizeVelocity(inputs.deltaViewsPer24h as number);
  const confidence = Math.min(100, Math.max(0, inputs.confidence));
  const engagement = normalizeEngagement(inputs.likes, inputs.comments, inputs.views);
  const novelty = inputs.isNovel ? 100 : 0;

  const total =
    weights.reach * reach +
    weights.velocity * velocity +
    weights.confidence * confidence +
    weights.engagement * engagement +
    weights.novelty * novelty;

  return {
    reach,
    velocity,
    velocityIsFallback,
    confidence,
    engagement,
    novelty,
    total: Math.round(Math.min(100, Math.max(0, total)) * 100) / 100,
  };
}
