import type { SupabaseClient } from "@supabase/supabase-js";

// Novelty-Faktor des Opportunity Scores (MASTERPLAN.md §4): 1, wenn der Claim
// noch nicht von Chris behandelt wurde, sonst 0. Zwei Quellen zählen als
// "behandelt": die manuell gepflegte Startliste (`myths.covered_by_chris`) und
// ein bereits "Erledigt"-markiertes Video dieser App zum selben Mythos.
export function isMythNovel(
  myth: { covered_by_chris: boolean } | null,
  alreadyDoneInApp: boolean,
): boolean {
  if (myth === null) return true;
  if (myth.covered_by_chris) return false;
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
