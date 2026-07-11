import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTimedOut } from "./discovery";

test("computeTimedOut: Zeit nicht um -> nie timedOut, egal was sonst gilt", () => {
  assert.equal(computeTimedOut({ timeUp: false, otherStopReached: false, allCandidatesChecked: false }), false);
  assert.equal(computeTimedOut({ timeUp: false, otherStopReached: true, allCandidatesChecked: false }), false);
  assert.equal(computeTimedOut({ timeUp: false, otherStopReached: false, allCandidatesChecked: true }), false);
});

test("computeTimedOut: Zeit um, kein anderer Stop-Grund -> echter Timeout", () => {
  assert.equal(computeTimedOut({ timeUp: true, otherStopReached: false, allCandidatesChecked: false }), true);
});

test("computeTimedOut: Zeit um, aber Ziel/Sicherheitsnetz gleichzeitig erreicht -> KEIN Timeout", () => {
  // Der ursprüngliche Bug: eine frühere Fassung prüfte `timeUp` zuerst und ignorierte dabei, ob
  // stopAfterFoundCount/maxCandidatesProcessed im selben Moment ebenfalls erreicht wurden -
  // dadurch hängte der Client nach einem eigentlich sauber beendeten Lauf unnötig einen
  // Folge-Request an.
  assert.equal(computeTimedOut({ timeUp: true, otherStopReached: true, allCandidatesChecked: false }), false);
});

test("computeTimedOut: Zeit um, aber alle Kandidaten wurden noch fertig durchlaufen -> KEIN Timeout", () => {
  assert.equal(computeTimedOut({ timeUp: true, otherStopReached: false, allCandidatesChecked: true }), false);
});

test("computeTimedOut: Zeit um UND Ziel erreicht UND alle Kandidaten durch -> KEIN Timeout (mehrfach abgesichert)", () => {
  assert.equal(computeTimedOut({ timeUp: true, otherStopReached: true, allCandidatesChecked: true }), false);
});
