import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMyths } from "./myths";
import { processVideo, type ProcessVideoResult } from "./process";
import {
  addQuotaUsage,
  getQuotaUsedToday,
  maxSearchCallsWithinBudget,
  YOUTUBE_SEARCH_COST,
  YOUTUBE_VIDEOS_LIST_COST,
} from "./quota";
import { getVideoDetails, searchVideoIds, VIDEOS_LIST_BATCH_SIZE } from "./youtube";
import { loadWeights } from "./weights";

export type DiscoveryRunSummary = {
  queriesAvailable: number;
  searchesPerformed: number;
  videoIdsFound: number;
  videoIdsNew: number;
  results: Array<{ externalId: string; result: ProcessVideoResult }>;
  quotaUsedToday: number;
};

function buildQueries(myths: Awaited<ReturnType<typeof loadMyths>>): string[] {
  const queries = myths.flatMap((myth) =>
    myth.search_queries.length > 0 ? myth.search_queries : [myth.claim_pattern],
  );
  // Duplikate raus (mehrere Mythen können auf dieselbe Query fallen).
  return Array.from(new Set(queries));
}

async function filterUnseenVideoIds(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<string[]> {
  if (videoIds.length === 0) return [];

  const [{ data: existingVideos }, { data: loggedSkips }] = await Promise.all([
    supabase.from("videos").select("external_id").in("external_id", videoIds),
    supabase.from("discovery_log").select("external_id").in("external_id", videoIds),
  ]);

  const seen = new Set([
    ...(existingVideos ?? []).map((v) => v.external_id as string),
    ...(loggedSkips ?? []).map((v) => v.external_id as string),
  ]);

  return videoIds.filter((id) => !seen.has(id));
}

export async function runDiscovery(params: {
  supabase: SupabaseClient;
  youtubeApiKey: string;
  maxSearchesThisRun?: number;
  maxResultsPerQuery?: number;
}): Promise<DiscoveryRunSummary> {
  const { supabase, youtubeApiKey, maxResultsPerQuery = 10 } = params;

  const [myths, weights, usedToday] = await Promise.all([
    loadMyths(supabase),
    loadWeights(supabase),
    getQuotaUsedToday(supabase),
  ]);

  const queries = buildQueries(myths);
  const budgetAllowedSearches = maxSearchCallsWithinBudget(usedToday);
  const searchLimit = Math.min(
    queries.length,
    budgetAllowedSearches,
    params.maxSearchesThisRun ?? budgetAllowedSearches,
  );

  const summary: DiscoveryRunSummary = {
    queriesAvailable: queries.length,
    searchesPerformed: 0,
    videoIdsFound: 0,
    videoIdsNew: 0,
    results: [],
    quotaUsedToday: usedToday,
  };

  const allFoundIds: string[] = [];

  for (const query of queries.slice(0, searchLimit)) {
    const videoIds = await searchVideoIds(query, youtubeApiKey, maxResultsPerQuery);
    await addQuotaUsage(supabase, YOUTUBE_SEARCH_COST);
    summary.searchesPerformed += 1;
    summary.videoIdsFound += videoIds.length;
    allFoundIds.push(...videoIds);
  }

  const uniqueFoundIds = Array.from(new Set(allFoundIds));
  const newIds = await filterUnseenVideoIds(supabase, uniqueFoundIds);
  summary.videoIdsNew = newIds.length;

  for (let i = 0; i < newIds.length; i += VIDEOS_LIST_BATCH_SIZE) {
    const batch = newIds.slice(i, i + VIDEOS_LIST_BATCH_SIZE);
    const details = await getVideoDetails(batch, youtubeApiKey);
    await addQuotaUsage(supabase, YOUTUBE_VIDEOS_LIST_COST);

    for (const metadata of details) {
      const result = await processVideo({ supabase, metadata, myths, weights });
      summary.results.push({ externalId: metadata.externalId, result });
    }
  }

  summary.quotaUsedToday = await getQuotaUsedToday(supabase);
  return summary;
}
