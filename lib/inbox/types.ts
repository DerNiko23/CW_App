import type { ConfidenceChecks, ScoreBreakdown } from "@/lib/pipeline/types";
import type { ReactionScript } from "@/lib/reaction/types";

export type VideoStatus = "new" | "accepted" | "done" | "rejected";

export type MythInfo = {
  id: string;
  claim_pattern: string;
  category: string;
  verdict: string;
  sources: Array<{ title: string; url: string }>;
  covered_by_chris: boolean;
  topic_deprioritized: boolean;
};

export type ClaimInfo = {
  id: string;
  quote: string;
  timestamp_s: number;
  normalized_claim: string;
  confidence: number;
  checks: ConfidenceChecks;
  topic: string;
  myth: MythInfo | null;
};

export type InboxItem = {
  video: {
    id: string;
    platform: string;
    externalId: string;
    url: string;
    title: string;
    channel: string | null;
    publishedAt: string | null;
    thumbnail: string | null;
    status: VideoStatus;
    doneAt: string | null;
    reactionScript: ReactionScript | null;
  };
  claim: ClaimInfo;
  otherClaimsCount: number;
  score: ScoreBreakdown;
  views: number;
  likes: number;
  comments: number;
  deltaViewsPer24h: number | null;
  snapshotCount: number;
  alreadyHandledElsewhere: boolean;
};

export type InboxFilters = {
  platform?: string;
  topic?: string;
  scoreBand?: string;
  status?: string | string[];
};
