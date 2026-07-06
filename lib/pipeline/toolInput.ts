// Workaround für einen beobachteten Bug bei Tool-Use-Antworten mit Array-Properties
// im Schema: statt strukturierter Felder liefert die API gelegentlich das komplette
// Argument-Objekt als JSON-String, verpackt in eines der Top-Level-Felder (reproduzierbar
// z. B. bei der Claim-Extraction, egal ob mit/ohne maxItems oder zusätzlichen Feldern).
// Entpackt diesen Fall, ohne normale (nicht-JSON) String-Felder wie UUIDs oder Sätze anzufassen.
export function unwrapToolInput<T>(input: Record<string, unknown>): T {
  for (const value of Object.values(input)) {
    if (typeof value !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue;
    }
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
  }
  return input as T;
}
