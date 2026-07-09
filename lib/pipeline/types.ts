// Gemeinsame Typen für die Discovery-Pipeline (MASTERPLAN.md §2, §7).

export type Myth = {
  id: string;
  claim_pattern: string;
  category: string;
  verdict: string;
  sources_json: Array<{ title: string; url: string }>;
  covered_by_chris: boolean;
  topic_deprioritized: boolean;
  chris_video_url: string | null;
  search_queries: string[];
};

export type TranscriptSegment = {
  text: string;
  offsetMs: number;
  durationMs: number;
};

export type Transcript = {
  segments: TranscriptSegment[];
  fullText: string;
};

export type Topic = "ernaehrung" | "fitness" | "gesundheit" | "off_topic";

export type TopicDetectionResult = {
  topic: Topic;
  reasoning: string;
};

export type ClaimCandidate = {
  quote: string;
  timestamp_s: number;
};

export type NormalizationResult = {
  normalized_claim: string;
  myth_id: string | null;
  match_reasoning: string;
};

export type ConfidenceChecks = {
  mythMatched: boolean;
  quoteVerbatimInTranscript: boolean;
  coreTopicNutrition: boolean;
  sourcesAvailable: boolean;
};

export type ConfidenceResult = {
  checks: ConfidenceChecks;
  score: number; // 0-100, 25 Punkte je bestandenem Check
};

export type VideoMetadata = {
  externalId: string;
  url: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string | null;
  thumbnail: string | null;
  views: number;
  likes: number;
  comments: number;
};

export type ScoreInputs = {
  views: number;
  deltaViewsPer24h: number | null; // null = weniger als 2 Snapshots vorhanden
  confidence: number; // 0-100
  likes: number;
  comments: number;
  isNovel: boolean;
};

export type ScoreWeights = {
  reach: number;
  velocity: number;
  confidence: number;
  engagement: number;
  novelty: number;
};

export type ScoreBreakdown = {
  reach: number;
  velocity: number;
  velocityIsFallback: boolean;
  confidence: number;
  engagement: number;
  novelty: number;
  total: number;
};

export type SkipReason = "no_transcript" | "off_topic" | "no_claims" | "own_channel" | "error";
