import { test } from "node:test";
import assert from "node:assert/strict";
import { nudgeWeight, MIN_WEIGHT, MAX_WEIGHT } from "./adaptive";
import type { ScoreWeights } from "../pipeline/types";

function sum(weights: ScoreWeights): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

const BASE = { reach: 0.3, velocity: 0.3, confidence: 0.2, engagement: 0.1, novelty: 0.1 };

test("erhöht das Ziel-Gewicht um den Step", () => {
  const result = nudgeWeight(BASE, "reach", 0.02);
  assert.ok(Math.abs(result.reach - 0.32) < 1e-9);
});

test("Summe bleibt immer 1.0 (gewichtete Summe, nicht Multiplikation)", () => {
  const result = nudgeWeight(BASE, "confidence", 0.02);
  assert.ok(Math.abs(sum(result) - 1) < 1e-9);
});

test("andere Gewichte schrumpfen proportional zueinander", () => {
  const result = nudgeWeight(BASE, "novelty", 0.05);
  // velocity und reach waren vorher gleich (0.3) -> bleiben nach proportionaler Kürzung gleich
  assert.ok(Math.abs(result.reach - result.velocity) < 1e-9);
  assert.ok(result.reach < BASE.reach);
});

test("negativer Step verringert das Ziel-Gewicht", () => {
  const result = nudgeWeight(BASE, "reach", -0.05);
  assert.ok(result.reach < BASE.reach);
  assert.ok(Math.abs(sum(result) - 1) < 1e-9);
});

test("Ziel-Gewicht wird nach oben auf MAX_WEIGHT geklemmt", () => {
  const result = nudgeWeight(BASE, "reach", 10);
  assert.equal(result.reach, MAX_WEIGHT);
  assert.ok(Math.abs(sum(result) - 1) < 1e-9);
});

test("Ziel-Gewicht wird nach unten auf MIN_WEIGHT geklemmt (kein Null-Faktor)", () => {
  const result = nudgeWeight(BASE, "novelty", -10);
  assert.equal(result.novelty, MIN_WEIGHT);
  assert.ok(result.novelty > 0, "darf nie auf 0 fallen - gewichtete Summe, kein Faktor darf alles killen");
});

test("wiederholtes Nudging driftet graduell (wie '20x Keto abgelehnt')", () => {
  let weights = BASE;
  for (let i = 0; i < 5; i++) {
    weights = nudgeWeight(weights, "reach", 0.02);
  }
  assert.ok(weights.reach > BASE.reach);
  assert.ok(Math.abs(sum(weights) - 1) < 1e-9);
});
