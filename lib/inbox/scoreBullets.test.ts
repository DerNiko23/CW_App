import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScoreBullets } from "./scoreBullets";

const BASE_SCORE = {
  reach: 50,
  velocity: 50,
  velocityIsFallback: false,
  confidence: 100,
  engagement: 30,
  novelty: 100,
  total: 60,
};

test("Reach-Bullet zeigt formatierte Views", () => {
  const bullets = buildScoreBullets({
    views: 1488,
    deltaViewsPer24h: 200,
    likes: 10,
    comments: 2,
    score: BASE_SCORE,
    snapshotCount: 2,
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
  });
  assert.equal(bullets[1], "+62.000 in den letzten 24 Stunden (Velocity)");
});

test("Novelty-Bullet unterscheidet novel vs. bereits behandelt", () => {
  const novel = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 100 },
    snapshotCount: 2,
  });
  const handled = buildScoreBullets({
    views: 1,
    deltaViewsPer24h: 0,
    likes: 0,
    comments: 0,
    score: { ...BASE_SCORE, novelty: 0 },
    snapshotCount: 2,
  });
  assert.match(novel[3], /Noch kein Video von Chris/);
  assert.match(handled[3], /bereits behandelt/);
});
