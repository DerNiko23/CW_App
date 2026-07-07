import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScoreBullets } from "./scoreBullets";
import type { ClaimInfo, MythInfo } from "./types";

const BASE_SCORE = {
  reach: 50,
  velocity: 50,
  velocityIsFallback: false,
  confidence: 100,
  engagement: 30,
  novelty: 100,
  total: 60,
};

const BASE_CHECKS = {
  mythMatched: true,
  quoteVerbatimInTranscript: true,
  coreTopicNutrition: true,
  sourcesAvailable: true,
};

function claimWithMyth(myth: MythInfo | null): ClaimInfo {
  return {
    id: "claim-1",
    quote: "Testzitat",
    timestamp_s: 42,
    normalized_claim: "Test",
    confidence: 90,
    checks: BASE_CHECKS,
    topic: "ernaehrung",
    myth,
  };
}

function myth(overrides: Partial<MythInfo> = {}): MythInfo {
  return {
    id: "myth-1",
    claim_pattern: "Testmythos",
    category: "Ernährung",
    verdict: "Falsch",
    sources: [],
    covered_by_chris: false,
    topic_deprioritized: false,
    ...overrides,
  };
}

test("Reach-Bullet zeigt formatierte Views", () => {
  const bullets = buildScoreBullets({
    views: 1488,
    deltaViewsPer24h: 200,
    likes: 10,
    comments: 2,
    score: BASE_SCORE,
    snapshotCount: 2,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(null),
  });
  assert.equal(bullets[0], "1.488 Aufrufe");
});

test("Velocity-Fallback-Bullet bei <2 Snapshots statt Delta-Zahl", () => {
  const bullets = buildScoreBullets({
    views: 1000,
    deltaViewsPer24h: null,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, velocityIsFallback: true },
    snapshotCount: 1,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(null),
  });
  assert.match(bullets[1], /Verlaufsdaten/);
  assert.match(bullets[1], /1 Snapshot bisher/);
});

test("Velocity-Bullet mit Vorzeichen bei echtem Delta", () => {
  const bullets = buildScoreBullets({
    views: 1000,
    deltaViewsPer24h: 62000,
    likes: 0,
    comments: 0,
    score: BASE_SCORE,
    snapshotCount: 3,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(null),
  });
  assert.equal(bullets[1], "+62.000 in den letzten 24 Stunden (Velocity)");
});

test("Novelty-Bullet: novel, wenn noch kein Video von Chris dazu existiert", () => {
  const bullets = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 100 },
    snapshotCount: 2,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(null),
  });
  assert.match(bullets[3], /Noch kein Video von Chris/);
});

test("Novelty-Bullet: echt erledigt via alreadyHandledElsewhere -> 'bereits von Chris behandelt'", () => {
  const bullets = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 0 },
    snapshotCount: 2,
    alreadyHandledElsewhere: true,
    claim: claimWithMyth(myth()),
  });
  assert.match(bullets[3], /bereits von Chris behandelt/);
});

test("Novelty-Bullet: echt erledigt via covered_by_chris (Startliste) -> 'bereits von Chris behandelt'", () => {
  const bullets = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 0 },
    snapshotCount: 2,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(myth({ covered_by_chris: true })),
  });
  assert.match(bullets[3], /bereits von Chris behandelt/);
});

test("Novelty-Bullet: nur topic_deprioritized (3x 'Thema uninteressant') -> NICHT 'bereits behandelt'", () => {
  const bullets = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 0 },
    snapshotCount: 2,
    alreadyHandledElsewhere: false,
    claim: claimWithMyth(myth({ topic_deprioritized: true })),
  });
  assert.doesNotMatch(bullets[3], /bereits von Chris behandelt/);
  assert.match(bullets[3], /uninteressant/);
  assert.match(bullets[3], /nicht von Chris behandelt/);
});
