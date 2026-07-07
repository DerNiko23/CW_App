import type { SupabaseClient } from "@supabase/supabase-js";
import { detectTopic, extractClaims, normalizeAndMatch } from "./claude";
import { computeConfidence } from "./confidence";
import { logSkip } from "./discoveryLog";
import { hasDoneVideoForMyth, isMythNovel } from "./novelty";
import { computeOpportunityScore, computeVelocityFromSnapshots } from "./score";
import {
  findTimestampForQuote,
  fetchTranscript,
  formatTranscriptForPrompt,
  isQuoteVerbatimInTranscript,
} from "./transcript";
import type {
  ConfidenceResult,
  Myth,
  ScoreBreakdown,
  ScoreWeights,
  SkipReason,
  Topic,
  VideoMetadata,
} from "./types";

export { computeConfidence } from "./confidence";

export type ProcessedClaim = {
  quote: string;
  timestamp_s: number;
  normalized_claim: string;
  matchedMyth: Myth | null;
  matchReasoning: string;
  confidence: ConfidenceResult;
};

export type ProcessVideoResult =
  | { status: "skipped"; reason: SkipReason; detail?: string }
  | {
      status: "processed";
      videoId: string;
      topic: Topic;
      topicReasoning: string;
      claims: ProcessedClaim[];
      bestClaim: ProcessedClaim;
      score: ScoreBreakdown;
    };

export async function processVideo(params: {
  supabase: SupabaseClient;
  metadata: VideoMetadata;
  myths: Myth[];
  weights: ScoreWeights;
}): Promise<ProcessVideoResult> {
  const { supabase, metadata, myths, weights } = params;
  const videoRef = { externalId: metadata.externalId, url: metadata.url };

  const transcript = await fetchTranscript(metadata.externalId);
  if (!transcript) {
    await logSkip(supabase, videoRef, "no_transcript");
    return { status: "skipped", reason: "no_transcript" };
  }

  const topicResult = await detectTopic(transcript.fullText);
  if (topicResult.topic === "off_topic") {
    await logSkip(supabase, videoRef, "off_topic", topicResult.reasoning);
    return { status: "skipped", reason: "off_topic", detail: topicResult.reasoning };
  }

  const claimCandidates = await extractClaims(formatTranscriptForPrompt(transcript));
  if (claimCandidates.length === 0) {
    await logSkip(supabase, videoRef, "no_claims");
    return { status: "skipped", reason: "no_claims" };
  }

  const { data: videoRow, error: upsertError } = await supabase
    .from("videos")
    .upsert(
      {
        platform: "youtube",
        external_id: metadata.externalId,
        url: metadata.url,
        title: metadata.title,
        channel: metadata.channel,
        published_at: metadata.publishedAt,
        thumbnail: metadata.thumbnail,
      },
      { onConflict: "platform,external_id" },
    )
    .select("id")
    .single();

  if (upsertError || !videoRow) {
    throw new Error(`Video-Upsert fehlgeschlagen: ${upsertError?.message}`);
  }
  const videoId = videoRow.id as string;

  const { data: existingSnapshots } = await supabase
    .from("snapshots")
    .select("views, captured_at")
    .eq("video_id", videoId);

  const deltaViewsPer24h = computeVelocityFromSnapshots(
    (existingSnapshots ?? []).map((s) => ({
      views: Number(s.views),
      capturedAt: s.captured_at as string,
    })),
  );

  await supabase.from("snapshots").insert({
    video_id: videoId,
    views: metadata.views,
    likes: metadata.likes,
    comments: metadata.comments,
  });

  const processedClaims: ProcessedClaim[] = [];

  for (const candidate of claimCandidates) {
    const quoteVerbatim = isQuoteVerbatimInTranscript(candidate.quote, transcript);
    const verifiedTimestamp = findTimestampForQuote(candidate.quote, transcript);
    const timestamp_s = verifiedTimestamp ?? candidate.timestamp_s;

    const normResult = await normalizeAndMatch(candidate.quote, myths);
    const matchedMyth = myths.find((m) => m.id === normResult.myth_id) ?? null;

    const confidence = computeConfidence({
      mythMatched: matchedMyth !== null,
      quoteVerbatimInTranscript: quoteVerbatim,
      coreTopicNutrition: topicResult.topic === "ernaehrung",
      sourcesAvailable: (matchedMyth?.sources_json.length ?? 0) > 0,
    });

    await supabase.from("claims").insert({
      video_id: videoId,
      quote: candidate.quote,
      timestamp_s,
      normalized_claim: normResult.normalized_claim,
      myth_id: matchedMyth?.id ?? null,
      confidence: confidence.score,
      evidence_json: {
        checks: confidence.checks,
        match_reasoning: normResult.match_reasoning,
        topic: topicResult.topic,
        topic_reasoning: topicResult.reasoning,
        verdict: matchedMyth?.verdict ?? null,
        sources: matchedMyth?.sources_json ?? [],
      },
    });

    processedClaims.push({
      quote: candidate.quote,
      timestamp_s,
      normalized_claim: normResult.normalized_claim,
      matchedMyth,
      matchReasoning: normResult.match_reasoning,
      confidence,
    });
  }

  const bestClaim = processedClaims.reduce((best, current) =>
    current.confidence.score > best.confidence.score ? current : best,
  );

  const doneForMyth = bestClaim.matchedMyth
    ? await hasDoneVideoForMyth(supabase, bestClaim.matchedMyth.id)
    : false;
  const isNovel = isMythNovel(
    bestClaim.matchedMyth
      ? {
          covered_by_chris: bestClaim.matchedMyth.covered_by_chris,
          topic_deprioritized: bestClaim.matchedMyth.topic_deprioritized,
        }
      : null,
    doneForMyth,
  );

  const score = computeOpportunityScore(
    {
      views: metadata.views,
      deltaViewsPer24h,
      confidence: bestClaim.confidence.score,
      likes: metadata.likes,
      comments: metadata.comments,
      isNovel,
    },
    weights,
  );

  return {
    status: "processed",
    videoId,
    topic: topicResult.topic,
    topicReasoning: topicResult.reasoning,
    claims: processedClaims,
    bestClaim,
    score,
  };
}
