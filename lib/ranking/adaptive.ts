import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWeights, saveWeights } from "@/lib/pipeline/weights";
import type { ScoreWeights } from "@/lib/pipeline/types";
import type { RejectReason } from "@/lib/inbox/constants";

// MASTERPLAN.md §3.5: "Einfache, transparente Score-Adjustments", kein ML-Anspruch.
// Jedes Gewicht bleibt in [MIN_WEIGHT, MAX_WEIGHT] - wie bei der gewichteten Summe selbst
// (MASTERPLAN §4) darf kein einzelner Faktor auf 0 fallen oder alles dominieren.
export const WEIGHT_STEP = 0.02;
export const MIN_WEIGHT = 0.05;
export const MAX_WEIGHT = 0.6;
export const TOPIC_DISINTEREST_THRESHOLD = 3;

// Nur die Reject-Gruende, die sich ehrlich auf eine bestehende Score-Komponente abbilden
// lassen. "Thema uninteressant" hat keine eigene Gewichts-Komponente (Topic fliesst nicht in
// den Score ein) - dafuer wird stattdessen der gematchte Mythos als abgedeckt markiert
// (siehe suppressMythIfRepeatedlyUninteresting), keine erfundene Gewichts-Zuordnung.
const REASON_TO_WEIGHT_KEY: Partial<Record<RejectReason, keyof ScoreWeights>> = {
  "Zu kleine Reichweite": "reach",
  "Aussage nicht klar falsch": "confidence",
  "Bereits behandelt": "novelty",
};

// Erhoeht (oder senkt) ein Gewicht um `step`, klemmt es in [MIN_WEIGHT, MAX_WEIGHT] und
// skaliert alle anderen Gewichte proportional zueinander, damit die Summe bei 1.0 bleibt.
export function nudgeWeight(
  current: ScoreWeights,
  key: keyof ScoreWeights,
  step: number,
): ScoreWeights {
  const target = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, current[key] + step));
  const remaining = 1 - target;
  const othersSum = 1 - current[key];

  const result = { ...current, [key]: target };
  if (othersSum > 0) {
    const scale = remaining / othersSum;
    for (const k of Object.keys(current) as Array<keyof ScoreWeights>) {
      if (k !== key) result[k] = current[k] * scale;
    }
  }
  return result;
}

async function findBestClaimMythId(
  supabase: SupabaseClient,
  videoId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("claims")
    .select("myth_id, confidence")
    .eq("video_id", videoId)
    .order("confidence", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.myth_id ?? null;
}

// "Thema uninteressant" hat keine eigene Score-Gewicht-Komponente. Stattdessen: wenn
// derselbe Mythos oft genug aus diesem Grund abgelehnt wird, gilt er als abgedeckt -
// nutzt die bestehende Novelty-Logik (myths.covered_by_chris) statt neuer Infrastruktur.
async function suppressMythIfRepeatedlyUninteresting(
  supabase: SupabaseClient,
  videoId: string,
): Promise<void> {
  const mythId = await findBestClaimMythId(supabase, videoId);
  if (!mythId) return;

  const { data: rejections } = await supabase
    .from("feedback")
    .select("video_id")
    .eq("action", "reject")
    .eq("reason", "Thema uninteressant");
  const rejectedVideoIds = (rejections ?? []).map((r) => r.video_id as string);
  if (rejectedVideoIds.length === 0) return;

  const { count } = await supabase
    .from("claims")
    .select("video_id", { count: "exact", head: true })
    .eq("myth_id", mythId)
    .in("video_id", rejectedVideoIds);

  if ((count ?? 0) >= TOPIC_DISINTEREST_THRESHOLD) {
    await supabase.from("myths").update({ covered_by_chris: true }).eq("id", mythId);
  }
}

export async function applyAdaptiveRanking(
  supabase: SupabaseClient,
  videoId: string,
  reason: RejectReason,
): Promise<void> {
  const weightKey = REASON_TO_WEIGHT_KEY[reason];
  if (weightKey) {
    const current = await loadWeights(supabase);
    await saveWeights(supabase, nudgeWeight(current, weightKey, WEIGHT_STEP));
    return;
  }
  if (reason === "Thema uninteressant") {
    await suppressMythIfRepeatedlyUninteresting(supabase, videoId);
  }
}
