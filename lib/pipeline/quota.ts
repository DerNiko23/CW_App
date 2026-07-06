import type { SupabaseClient } from "@supabase/supabase-js";

// YouTube Data API v3 Quota-Kosten (offizielle Doku): search.list = 100 Units,
// videos.list = 1 Unit pro Aufruf (unabhängig von `part`-Anzahl, solange <= 50 IDs).
export const YOUTUBE_SEARCH_COST = 100;
export const YOUTUBE_VIDEOS_LIST_COST = 1;
export const YOUTUBE_DAILY_BUDGET = 10_000;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getQuotaUsedToday(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from("youtube_quota_usage")
    .select("units_used")
    .eq("usage_date", todayIso())
    .maybeSingle();

  if (error) {
    throw new Error(`Quota-Abfrage fehlgeschlagen: ${error.message}`);
  }

  return data?.units_used ?? 0;
}

export async function addQuotaUsage(
  supabase: SupabaseClient,
  units: number,
): Promise<void> {
  const date = todayIso();
  const used = await getQuotaUsedToday(supabase);

  const { error } = await supabase
    .from("youtube_quota_usage")
    .upsert({ usage_date: date, units_used: used + units }, { onConflict: "usage_date" });

  if (error) {
    throw new Error(`Quota-Update fehlgeschlagen: ${error.message}`);
  }
}

export function remainingBudget(usedToday: number): number {
  return Math.max(0, YOUTUBE_DAILY_BUDGET - usedToday);
}

// Wie viele search.list-Aufrufe (je 100 Units) sind mit dem verbleibenden Budget
// noch drin, wenn ein Anteil für videos.list/commentThreads reserviert bleibt?
export function maxSearchCallsWithinBudget(
  usedToday: number,
  reserveRatio = 0.3,
): number {
  const remaining = remainingBudget(usedToday);
  const spendable = remaining * (1 - reserveRatio);
  return Math.max(0, Math.floor(spendable / YOUTUBE_SEARCH_COST));
}
