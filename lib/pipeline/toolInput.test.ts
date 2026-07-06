import { test } from "node:test";
import assert from "node:assert/strict";
import { unwrapToolInput } from "./toolInput";

test("lässt korrekt strukturierten Input unverändert", () => {
  const input = { topic: "ernaehrung", reasoning: "Es geht um Kalorien." };
  assert.deepEqual(unwrapToolInput(input), input);
});

test("entpackt beobachteten Bug: komplettes Objekt als JSON-String in einem Feld verpackt", () => {
  const inner = { claims: [{ quote: "Honig macht nicht dick.", timestamp_s: 5 }] };
  const buggyInput = { claims: JSON.stringify(inner) };
  assert.deepEqual(unwrapToolInput(buggyInput), inner);
});

test("lässt Strings unverändert, die kein JSON-Objekt sind (z. B. UUID, Satz)", () => {
  const input = {
    normalized_claim: "Honig ist kalorienfrei",
    myth_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    match_reasoning: "Passt zum bekannten Mythos.",
  };
  assert.deepEqual(unwrapToolInput(input), input);
});

test("ignoriert JSON-Strings, die zu einem Array (nicht Objekt) parsen", () => {
  const input = { claims: "[1,2,3]" };
  assert.deepEqual(unwrapToolInput(input), input);
});
