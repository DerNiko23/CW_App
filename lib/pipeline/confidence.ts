import type { ConfidenceChecks, ConfidenceResult } from "./types";

// MASTERPLAN.md §3.2C: nur die 4 ehrlichen Checks, kein Ironie-/ML-Bluff.
// Jeder bestandene Check zählt 25 Punkte – transparent nachvollziehbar statt
// künstlich präziser Nachkommastellen.
const POINTS_PER_CHECK = 25;

export function computeConfidence(checks: ConfidenceChecks): ConfidenceResult {
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    score: passed * POINTS_PER_CHECK,
  };
}

// ROADMAP.md Risiko-Tabelle: unter 70 % gar nicht erst in die Inbox.
export const CONFIDENCE_THRESHOLD = 70;

export function passesConfidenceThreshold(score: number): boolean {
  return score >= CONFIDENCE_THRESHOLD;
}
