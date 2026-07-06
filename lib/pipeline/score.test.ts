import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReach,
  normalizeVelocity,
  normalizeEngagement,
  computeVelocityFromSnapshots,
  computeOpportunityScore,
} from "./score";

const EQUAL_WEIGHTS = {
  reach: 0.3,
  velocity: 0.3,
  confidence: 0.2,
  engagement: 0.1,
  novelty: 0.1,
};

test("normalizeReach: 0 Views -> 0", () => {
  assert.equal(normalizeReach(0), 0);
});

test("normalizeReach: 10 Mio Views -> ~100 (Cap)", () => {
  assert.ok(normalizeReach(10_000_000) >= 99);
});

test("normalizeReach: monoton steigend", () => {
  assert.ok(normalizeReach(1000) < normalizeReach(100_000));
  assert.ok(normalizeReach(100_000) < normalizeReach(1_000_000));
});

test("normalizeVelocity: 0 Delta -> 0", () => {
  assert.equal(normalizeVelocity(0), 0);
});

test("normalizeVelocity: negative Delta wird auf 0 geklemmt", () => {
  assert.equal(normalizeVelocity(-500), 0);
});

test("normalizeEngagement: 0 Views -> 0 (keine Division durch 0)", () => {
  assert.equal(normalizeEngagement(10, 5, 0), 0);
});

test("normalizeEngagement: hohe Rate wird auf 100 geklemmt", () => {
  assert.equal(normalizeEngagement(1_000_000, 1_000_000, 100), 100);
});

test("computeVelocityFromSnapshots: < 2 Snapshots -> null", () => {
  assert.equal(computeVelocityFromSnapshots([]), null);
  assert.equal(
    computeVelocityFromSnapshots([{ views: 100, capturedAt: "2026-07-06T00:00:00Z" }]),
    null,
  );
});

test("computeVelocityFromSnapshots: 24h Differenz -> exakte Delta", () => {
  const result = computeVelocityFromSnapshots([
    { views: 100_000, capturedAt: "2026-07-05T00:00:00Z" },
    { views: 162_000, capturedAt: "2026-07-06T00:00:00Z" },
  ]);
  assert.equal(result, 62_000);
});

test("computeVelocityFromSnapshots: nimmt frühesten und spätesten Snapshot, ignoriert Reihenfolge", () => {
  const result = computeVelocityFromSnapshots([
    { views: 200_000, capturedAt: "2026-07-07T00:00:00Z" },
    { views: 100_000, capturedAt: "2026-07-05T00:00:00Z" },
  ]);
  // 100k Delta über 48h -> 50k/24h
  assert.equal(result, 50_000);
});

test("computeOpportunityScore: Fallback auf Reach wenn Velocity null (Snapshot-Mangel)", () => {
  const result = computeOpportunityScore(
    {
      views: 1_000_000,
      deltaViewsPer24h: null,
      confidence: 100,
      likes: 0,
      comments: 0,
      isNovel: true,
    },
    EQUAL_WEIGHTS,
  );
  assert.equal(result.velocityIsFallback, true);
  assert.equal(result.velocity, result.reach);
});

test("computeOpportunityScore: Score liegt immer zwischen 0 und 100", () => {
  const result = computeOpportunityScore(
    {
      views: 5_000_000,
      deltaViewsPer24h: 300_000,
      confidence: 100,
      likes: 50_000,
      comments: 10_000,
      isNovel: true,
    },
    EQUAL_WEIGHTS,
  );
  assert.ok(result.total <= 100);
  assert.ok(result.total >= 0);
});

test("computeOpportunityScore: Null-Faktor killt nicht alles (gewichtete Summe, keine Multiplikation)", () => {
  const result = computeOpportunityScore(
    {
      views: 1_000_000,
      deltaViewsPer24h: 0,
      confidence: 0,
      likes: 0,
      comments: 0,
      isNovel: false,
    },
    EQUAL_WEIGHTS,
  );
  // Reach-Anteil bleibt trotz 3 Null-Faktoren erhalten.
  assert.ok(result.total > 0);
});
