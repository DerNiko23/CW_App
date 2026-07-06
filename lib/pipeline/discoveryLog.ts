import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkipReason } from "./types";

// Zentrales Skip+Log: Videos, die aus gutem Grund nicht weiterverarbeitet werden,
// landen hier statt in `videos` (MASTERPLAN.md §2: "Transkript (Skip + Log wenn keins)").
export async function logSkip(
  supabase: SupabaseClient,
  video: { externalId: string; url: string },
  reason: SkipReason,
  detail?: string,
): Promise<void> {
  const { error } = await supabase.from("discovery_log").insert({
    platform: "youtube",
    external_id: video.externalId,
    url: video.url,
    reason,
    detail: detail ?? null,
  });

  if (error) {
    console.error("Failed to write discovery_log", error);
  }
}
