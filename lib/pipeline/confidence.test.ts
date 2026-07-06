import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConfidence, passesConfidenceThreshold } from "./confidence";

test("alle 4 Checks bestanden -> 100", () => {
  const result = computeConfidence({
    mythMatched: true,
    quoteVerbatimInTranscript: true,
    coreTopicNutrition: true,
    sourcesAvailable: true,
  });
  assert.equal(result.score, 100);
});

test("kein Check bestanden -> 0", () => {
  const result = computeConfidence({
    mythMatched: false,
    quoteVerbatimInTranscript: false,
    coreTopicNutrition: false,
    sourcesAvailable: false,
  });
  assert.equal(result.score, 0);
});

test("2 von 4 Checks -> 50", () => {
  const result = computeConfidence({
    mythMatched: true,
    quoteVerbatimInTranscript: true,
    coreTopicNutrition: false,
    sourcesAvailable: false,
  });
  assert.equal(result.score, 50);
});

test("3 von 4 Checks -> 75, Checks werden 1:1 durchgereicht", () => {
  const checks = {
    mythMatched: true,
    quoteVerbatimInTranscript: true,
    coreTopicNutrition: true,
    sourcesAvailable: false,
  };
  const result = computeConfidence(checks);
  assert.equal(result.score, 75);
  assert.deepEqual(result.checks, checks);
});

test("Schwelle: < 70 gilt als nicht bestanden (ROADMAP-Risiko: False Positives)", () => {
  assert.equal(passesConfidenceThreshold(75), true);
  assert.equal(passesConfidenceThreshold(50), false);
  assert.equal(passesConfidenceThreshold(70), true);
});
