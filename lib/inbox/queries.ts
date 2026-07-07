import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { passesConfidenceThreshold } from "@/lib/pipeline/confidence";
import { isMythNovel } from "@/lib/pipeline/novelty";
import { computeOpportunityScore, computeVelocityFromSnapshots } from "@/lib/pipeline/score";
import { loadWeights } from "@/lib/pipeline/weights";
import type { ConfidenceChecks, ScoreWeights } from "@/lib/pipeline/types";
import type { ReactionScript } from "@/lib/reaction/types";
import type { InboxFilters, InboxItem, MythInfo, VideoStatus } from "./types";

type VideoRow = {
  id: string;
  platform: string;
  external_id: string;
  url: string;
  title: string;
  channel: string | null;
  published_at: string | null;
  thumbnail: string | null;
  status: VideoStatus;
  done_at: string | null;
  reaction_script: ReactionScript | null;
};

type ClaimRow = {
  id: string;
  video_id: string;
  quote: string;
  timestamp_s: number;
  normalized_claim: string;
  myth_id: string | null;
  confidence: number;
  evidence_json: {
    checks?: ConfidenceChecks;
    topic?: string;
  } | null;
};

type MythRow = {
  id: string;
  claim_pattern: string;
  category: string;
  verdict: string;
  sources_json: unknown;
  covered_by_chris: boolean;
};

type SnapshotRow = {
  video_id: string;
  views: number;
  likes: number;
  comments: number;
  captured_at: string;
};

function toMythInfo(row: MythRow): MythInfo {
  return {
    id: row.id,
    claim_pattern: row.claim_pattern,
    category: row.category,
    verdict: row.verdict,
    sources: Array.isArray(row.sources_json)
      ? (row.sources_json as MythInfo["sources"])
      : [],
    covered_by_chris: row.covered_by_chris,
  };
}

async function buildItemsForVideos(
  supabase: SupabaseClient,
  videos: VideoRow[],
): Promise<InboxItem[]> {
  if (videos.length === 0) return [];
  const videoIds = videos.map((v) => v.id);

  const [claimsRes, snapshotsRes, weights, doneClaimsRes] = await Promise.all([
    supabase.from("claims").select("*").in("video_id", videoIds),
    supabase
      .from("snapshots")
      .select("video_id, views, likes, comments, captured_at")
      .in("video_id", videoIds),
    loadWeights(supabase),
    supabase
      .from("claims")
      .select("myth_id, video_id, videos!inner(status)")
      .eq("videos.status", "done")
      .not("myth_id", "is", null),
  ]);

  if (claimsRes.error) throw new Error(`Claims-Abfrage fehlgeschlagen: ${claimsRes.error.message}`);
  if (snapshotsRes.error) throw new Error(`Snapshots-Abfrage fehlgeschlagen: ${snapshotsRes.error.message}`);
  if (doneClaimsRes.error) throw new Error(`Done-Claims-Abfrage fehlgeschlagen: ${doneClaimsRes.error.message}`);

  const claims = (claimsRes.data ?? []) as ClaimRow[];
  const snapshots = (snapshotsRes.data ?? []) as SnapshotRow[];

  const mythIds = Array.from(new Set(claims.map((c) => c.myth_id).filter((id): id is string => Boolean(id))));
  const { data: mythRows, error: mythsError } =
    mythIds.length > 0
      ? await supabase.from("myths").select("*").in("id", mythIds)
      : { data: [] as MythRow[], error: null };
  if (mythsError) throw new Error(`Mythen-Abfrage fehlgeschlagen: ${mythsError.message}`);
  const mythById = new Map((mythRows ?? []).map((m) => [m.id, toMythInfo(m as MythRow)]));

  const doneMythVideoIds = new Map<string, Set<string>>();
  for (const row of doneClaimsRes.data ?? []) {
    const mythId = (row as { myth_id: string | null }).myth_id;
    const videoId = (row as { video_id: string }).video_id;
    if (!mythId) continue;
    if (!doneMythVideoIds.has(mythId)) doneMythVideoIds.set(mythId, new Set());
    doneMythVideoIds.get(mythId)!.add(videoId);
  }

  const claimsByVideo = new Map<string, ClaimRow[]>();
  for (const c of claims) {
    if (!claimsByVideo.has(c.video_id)) claimsByVideo.set(c.video_id, []);
    claimsByVideo.get(c.video_id)!.push(c);
  }

  const snapshotsByVideo = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    if (!snapshotsByVideo.has(s.video_id)) snapshotsByVideo.set(s.video_id, []);
    snapshotsByVideo.get(s.video_id)!.push(s);
  }

  const items: InboxItem[] = [];

  for (const video of videos) {
    const videoClaims = claimsByVideo.get(video.id) ?? [];
    if (videoClaims.length === 0) continue;

    const best = videoClaims.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    const myth = best.myth_id ? mythById.get(best.myth_id) ?? null : null;

    const videoSnapshots = snapshotsByVideo.get(video.id) ?? [];
    const latest = [...videoSnapshots].sort(
      (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime(),
    )[0];
    const views = latest?.views ?? 0;
    const likes = latest?.likes ?? 0;
    const comments = latest?.comments ?? 0;

    const deltaViewsPer24h = computeVelocityFromSnapshots(
      videoSnapshots.map((s) => ({ views: s.views, capturedAt: s.captured_at })),
    );

    const doneVideoIdsForMyth = myth ? doneMythVideoIds.get(myth.id) : undefined;
    const alreadyHandledElsewhere = Boolean(
      doneVideoIdsForMyth && [...doneVideoIdsForMyth].some((id) => id !== video.id),
    );
    const isNovel = isMythNovel(
      myth ? { covered_by_chris: myth.covered_by_chris } : null,
      alreadyHandledElsewhere,
    );

    const score = computeOpportunityScore(
      { views, deltaViewsPer24h, confidence: best.confidence, likes, comments, isNovel },
      weights as ScoreWeights,
    );

    items.push({
      video: {
        id: video.id,
        platform: video.platform,
        externalId: video.external_id,
        url: video.url,
        title: video.title,
        channel: video.channel,
        publishedAt: video.published_at,
        thumbnail: video.thumbnail,
        status: video.status,
        doneAt: video.done_at,
        reactionScript: video.reaction_script ?? null,
      },
      claim: {
        id: best.id,
        quote: best.quote,
        timestamp_s: best.timestamp_s,
        normalized_claim: best.normalized_claim,
        confidence: best.confidence,
        checks: best.evidence_json?.checks ?? {
          mythMatched: false,
          quoteVerbatimInTranscript: false,
          coreTopicNutrition: false,
          sourcesAvailable: false,
        },
        topic: best.evidence_json?.topic ?? "unbekannt",
        myth,
      },
      otherClaimsCount: videoClaims.length - 1,
      score,
      views,
      likes,
      comments,
      deltaViewsPer24h,
      snapshotCount: videoSnapshots.length,
      alreadyHandledElsewhere,
    });
  }

  return items;
}

function scoreBandMatches(band: string, total: number): boolean {
  switch (band) {
    case "80-100":
      return total >= 80;
    case "60-79":
      return total >= 60 && total < 80;
    case "40-59":
      return total >= 40 && total < 60;
    case "0-39":
      return total < 40;
    default:
      return true;
  }
}

export async function getInboxItems(filters: InboxFilters = {}): Promise<InboxItem[]> {
  const supabase = createAdminClient();

  let query = supabase.from("videos").select("*");
  const status = filters.status ?? "new";
  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (filters.platform && filters.platform !== "all") {
    query = query.eq("platform", filters.platform);
  }

  const { data: videos, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Videos-Abfrage fehlgeschlagen: ${error.message}`);

  let items = await buildItemsForVideos(supabase, (videos ?? []) as VideoRow[]);

  // CLAUDE.md / ROADMAP.md: Confidence < 70 % kommt NICHT in die Inbox (teuerster Fehler
  // waeren False Positives). Gilt nur fuer die "Neu"-Warteschlange, nicht fuer bereits
  // getroffene Entscheidungen (Angenommen/Erledigt/Abgelehnt/Alle) - die bleiben sichtbar.
  if (status === "new") {
    items = items.filter((item) => passesConfidenceThreshold(item.claim.confidence));
  }

  if (filters.topic && filters.topic !== "all") {
    items = items.filter((item) => item.claim.topic === filters.topic);
  }
  if (filters.scoreBand && filters.scoreBand !== "all") {
    items = items.filter((item) => scoreBandMatches(filters.scoreBand as string, item.score.total));
  }

  items.sort((a, b) => b.score.total - a.score.total);
  return items;
}

export async function getInboxItem(videoId: string): Promise<InboxItem | null> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .maybeSingle();

  if (error) throw new Error(`Video-Abfrage fehlgeschlagen: ${error.message}`);
  if (!video) return null;

  const items = await buildItemsForVideos(supabase, [video as VideoRow]);
  return items[0] ?? null;
}
