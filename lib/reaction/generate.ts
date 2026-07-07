import type { SupabaseClient } from "@supabase/supabase-js";
import { generateReactionScript } from "./claude";
import type { ReactionScript } from "./types";

export async function generateAndSaveReactionScript(
  supabase: SupabaseClient,
  videoId: string,
): Promise<ReactionScript> {
  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("quote, normalized_claim, confidence, myth_id")
    .eq("video_id", videoId)
    .order("confidence", { ascending: false })
    .limit(1);
  if (claimsError) throw new Error(`Claims konnten nicht geladen werden: ${claimsError.message}`);

  const best = claims?.[0];
  if (!best || !best.myth_id) {
    throw new Error(
      "Kein gematchter Mythos für dieses Video gefunden - Reaktions-Baukasten braucht ein Verdict.",
    );
  }

  const { data: myth, error: mythError } = await supabase
    .from("myths")
    .select("verdict")
    .eq("id", best.myth_id)
    .single();
  if (mythError || !myth) {
    throw new Error(`Mythos konnte nicht geladen werden: ${mythError?.message}`);
  }

  const generated = await generateReactionScript({
    quote: best.quote,
    normalizedClaim: best.normalized_claim,
    verdict: myth.verdict,
  });

  const script: ReactionScript = { ...generated, generated_at: new Date().toISOString() };

  const { error: saveError } = await supabase
    .from("videos")
    .update({ reaction_script: script })
    .eq("id", videoId);
  if (saveError) throw new Error(`Skript konnte nicht gespeichert werden: ${saveError.message}`);

  return script;
}
