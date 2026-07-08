// Geteilte Kommagetrennt-Encoding-Logik fuer Multi-Select-Filter (Status/Plattform/Thema/
// Score-Bereich) in einem einzigen Query-Param, z. B. ?status=new,accepted - genutzt sowohl
// von der Server-Page (Parsing) als auch der Client-FilterBar (Serialisieren beim Anwenden).
export function parseListParam(raw: string | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
}

export function serializeListParam(values: string[]): string | undefined {
  return values.length > 0 ? values.join(",") : undefined;
}
