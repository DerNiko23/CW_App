import { test } from "node:test";
import assert from "node:assert/strict";
import { isMythNovel } from "./novelty";

test("kein Myth-Match -> gilt als novel", () => {
  assert.equal(isMythNovel(null, false), true);
});

test("Myth bereits von Chris behandelt (Startliste) -> nicht novel", () => {
  assert.equal(isMythNovel({ covered_by_chris: true }, false), false);
});

test("Myth bereits in einem 'done'-Video dieser App behandelt -> nicht novel", () => {
  assert.equal(isMythNovel({ covered_by_chris: false }, true), false);
});

test("Myth gematcht, aber weder Startliste noch done -> novel", () => {
  assert.equal(isMythNovel({ covered_by_chris: false }, false), true);
});
