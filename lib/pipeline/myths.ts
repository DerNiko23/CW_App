import type { SupabaseClient } from "@supabase/supabase-js";
import type { Myth } from "./types";

type MythRow = {
  id: string;
  claim_pattern: string;
  category: string;
  verdict: string;
  sources_json: unknown;
  covered_by_chris: boolean;
  topic_deprioritized: boolean;
  chris_video_url: string | null;
  search_queries: unknown;
};

function toMyth(row: MythRow): Myth {
  return {
    id: row.id,
    claim_pattern: row.claim_pattern,
    category: row.category,
    verdict: row.verdict,
    sources_json: Array.isArray(row.sources_json)
      ? (row.sources_json as Myth["sources_json"])
      : [],
    covered_by_chris: row.covered_by_chris,
    topic_deprioritized: row.topic_deprioritized,
    chris_video_url: row.chris_video_url,
    search_queries: Array.isArray(row.search_queries)
      ? (row.search_queries as string[])
      : [],
  };
}

export async function loadMyths(supabase: SupabaseClient): Promise<Myth[]> {
  const { data, error } = await supabase
    .from("myths")
    .select(
      "id, claim_pattern, category, verdict, sources_json, covered_by_chris, topic_deprioritized, chris_video_url, search_queries",
    );

  if (error) {
    throw new Error(`Mythen konnten nicht geladen werden: ${error.message}`);
  }

  return (data ?? []).map(toMyth);
}
