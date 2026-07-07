import type { SupabaseClient } from "@supabase/supabase-js";

// Novelty-Faktor des Opportunity Scores (MASTERPLAN.md §4): 1, wenn der Claim
// noch nicht von Chris behandelt wurde, sonst 0. Drei Quellen senken die Novelty auf 0:
// die manuell gepflegte Startliste (`myths.covered_by_chris`), ein bereits
// "Erledigt"-markiertes Video dieser App zum selben Mythos, und ein Mythos, der laut
// Adaptive Ranking wiederholt als uninteressant abgelehnt wurde (`topic_deprioritized`,
// siehe lib/ranking/adaptive.ts). Die letzten beiden Faelle bedeuten NICHT "von Chris
// behandelt" - das wird bewusst separat gehalten (lib/inbox/scoreBullets.ts), damit die
// UI nicht faelschlich "bereits behandelt" anzeigt, nur weil ein Thema uninteressant war.
export function isMythNovel(
  myth: { covered_by_chris: boolean; topic_deprioritized: boolean } | null,
  alreadyDoneInApp: boolean,
): boolean {
  if (myth === null) return true;
  if (myth.covered_by_chris || myth.topic_deprioritized) return false;
  return !alreadyDoneInApp;
}

export async function hasDoneVideoForMyth(
  supabase: SupabaseClient,
  mythId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("claims")
    .select("id, videos!inner(status)")
    .eq("myth_id", mythId)
    .eq("videos.status", "done")
    .limit(1);

  if (error) {
    throw new Error(`Novelty-Abfrage fehlgeschlagen: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}
