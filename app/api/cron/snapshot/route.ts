import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addQuotaUsage, YOUTUBE_VIDEOS_LIST_COST } from "@/lib/pipeline/quota";

export const dynamic = "force-dynamic";

const YOUTUBE_BATCH_SIZE = 50;

type YouTubeVideosResponse = {
  items?: Array<{
    id: string;
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  // Vercel Cron sendet den Bearer-Header automatisch; der Query-Param erlaubt
  // manuelles Ausloesen per Browser-Adressleiste (kein Custom-Header noetig).
  const querySecret = request.nextUrl.searchParams.get("secret");

  const authorized =
    !!cronSecret &&
    (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, external_id")
    .eq("platform", "youtube");

  if (videosError) {
    console.error("Failed to load videos", videosError);
    return NextResponse.json({ error: videosError.message }, { status: 500 });
  }

  if (!videos || videos.length === 0) {
    // Kein No-Op-Fehler: Phase 1 (Discovery) liefert noch keine Videos, Cron muss trotzdem laufen.
    return NextResponse.json({ snapshotted: 0, skipped: 0, videos_total: 0 });
  }

  let snapshotted = 0;
  let skipped = 0;

  for (let i = 0; i < videos.length; i += YOUTUBE_BATCH_SIZE) {
    const batch = videos.slice(i, i + YOUTUBE_BATCH_SIZE);
    const ids = batch.map((video) => video.external_id).join(",");

    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics");
    url.searchParams.set("id", ids);
    url.searchParams.set("key", youtubeApiKey);

    let json: YouTubeVideosResponse;
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("YouTube API error", res.status, await res.text());
        skipped += batch.length;
        continue;
      }
      json = (await res.json()) as YouTubeVideosResponse;
    } catch (err) {
      console.error("YouTube API request failed", err);
      skipped += batch.length;
      continue;
    }
    // CLAUDE.md: YouTube-Quota-Verbrauch in youtube_quota_usage tracken - auch fuer den
    // taeglichen Snapshot-Cron, nicht nur fuer Discovery (videos.list = 1 Unit/Aufruf).
    await addQuotaUsage(supabase, YOUTUBE_VIDEOS_LIST_COST);

    const statsByExternalId = new Map(
      (json.items ?? []).map((item) => [item.id, item.statistics]),
    );

    const rows = batch.flatMap((video) => {
      const stats = statsByExternalId.get(video.external_id);
      if (!stats) {
        skipped += 1;
        return [];
      }
      return [
        {
          video_id: video.id,
          views: Number(stats.viewCount ?? 0),
          likes: Number(stats.likeCount ?? 0),
          comments: Number(stats.commentCount ?? 0),
        },
      ];
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("snapshots")
        .insert(rows);

      if (insertError) {
        console.error("Failed to insert snapshots", insertError);
        skipped += rows.length;
      } else {
        snapshotted += rows.length;
      }
    }
  }

  return NextResponse.json({
    snapshotted,
    skipped,
    videos_total: videos.length,
  });
}
