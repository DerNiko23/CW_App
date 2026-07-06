import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScoreWeights } from "./types";

// Fallback, falls die weights-Tabelle (noch) nicht vollständig befüllt ist –
// identisch zu den Default-Inserts in 0001_init.sql (MASTERPLAN.md §4).
const DEFAULT_WEIGHTS: ScoreWeights = {
  reach: 0.3,
  velocity: 0.3,
  confidence: 0.2,
  engagement: 0.1,
  novelty: 0.1,
};

export async function loadWeights(supabase: SupabaseClient): Promise<ScoreWeights> {
  const { data, error } = await supabase.from("weights").select("key, value");
  if (error) {
    throw new Error(`Gewichte konnten nicht geladen werden: ${error.message}`);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, Number(row.value)]));

  return {
    reach: byKey.get("reach") ?? DEFAULT_WEIGHTS.reach,
    velocity: byKey.get("velocity") ?? DEFAULT_WEIGHTS.velocity,
    confidence: byKey.get("confidence") ?? DEFAULT_WEIGHTS.confidence,
    engagement: byKey.get("engagement") ?? DEFAULT_WEIGHTS.engagement,
    novelty: byKey.get("novelty") ?? DEFAULT_WEIGHTS.novelty,
  };
}
