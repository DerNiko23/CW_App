import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMyths } from "./myths";
import { processVideo, type ProcessVideoResult } from "./process";
import { addQuotaUsage, YOUTUBE_VIDEOS_LIST_COST } from "./quota";
import { getVideoDetails, parseVideoId } from "./youtube";
import { loadWeights } from "./weights";

// Manueller URL-Import (MASTERPLAN.md §5): dieselbe Pipeline wie Discovery,
// nur mit einer konkret vorgegebenen URL statt einer Suchquery. Wird auch vom
// End-to-End-Test (scripts/test-pipeline.ts) genutzt.
export async function processVideoByUrl(params: {
  supabase: SupabaseClient;
  youtubeApiKey: string;
  url: string;
}): Promise<ProcessVideoResult> {
  const { supabase, youtubeApiKey, url } = params;

  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new Error(`Konnte keine YouTube-Video-ID aus "${url}" extrahieren`);
  }

  const [details, myths, weights] = await Promise.all([
    getVideoDetails([videoId], youtubeApiKey),
    loadMyths(supabase),
    loadWeights(supabase),
  ]);
  await addQuotaUsage(supabase, YOUTUBE_VIDEOS_LIST_COST);

  const metadata = details[0];
  if (!metadata) {
    throw new Error(`Video "${videoId}" nicht über die YouTube API gefunden`);
  }

  return processVideo({ supabase, metadata, myths, weights });
}
