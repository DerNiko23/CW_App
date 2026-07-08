export function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE").format(Math.round(n));
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

// Kappt rohe Server-/Exception-Messages, bevor sie ungefiltert in Toasts oder
// Inline-Fehlertexten landen (Kritik 2026-07-08: Fehlermeldungen sollen
// hilfreich sein, nicht rohe interne Details unbegrenzt durchreichen).
export function truncateMessage(message: string, maxLength = 160): string {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength - 1)}…`;
}
