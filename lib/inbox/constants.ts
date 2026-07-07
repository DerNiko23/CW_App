// MASTERPLAN.md §3.1: Reject immer mit Quick-Reason.
export const REJECT_REASONS = [
  "Thema uninteressant",
  "Aussage nicht klar falsch",
  "Zu kleine Reichweite",
  "Bereits behandelt",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export const TOPIC_OPTIONS = [
  { value: "ernaehrung", label: "Ernährung" },
  { value: "fitness", label: "Fitness" },
  { value: "gesundheit", label: "Gesundheit" },
] as const;

export const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
] as const;

export const SCORE_BAND_OPTIONS = [
  { value: "80-100", label: "80-100 · Sehr hohe Priorität" },
  { value: "60-79", label: "60-79 · Hohe Priorität" },
  { value: "40-59", label: "40-59 · Mittlere Priorität" },
  { value: "0-39", label: "0-39 · Niedrige Priorität" },
] as const;

export const STATUS_OPTIONS = [
  { value: "new", label: "Neu" },
  { value: "accepted", label: "Angenommen" },
  { value: "done", label: "Erledigt" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "all", label: "Alle" },
] as const;

export function scoreBandLabel(band: string): string {
  return SCORE_BAND_OPTIONS.find((b) => b.value === band)?.label ?? band;
}

export function topicLabel(topic: string | null | undefined): string {
  return TOPIC_OPTIONS.find((t) => t.value === topic)?.label ?? (topic || "Unbekannt");
}

// MASTERPLAN.md §3.2B Beispiel-Copy: "Sehr hohe Priorität" ab 80, abwärts gestuft.
export function scorePriorityLabel(score: number): string {
  if (score >= 80) return "Sehr hohe Priorität";
  if (score >= 60) return "Hohe Priorität";
  if (score >= 40) return "Mittlere Priorität";
  return "Niedrige Priorität";
}
