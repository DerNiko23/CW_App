import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetries } from "./transcript";

test("withRetries: erster Versuch erfolgreich -> kein weiterer Aufruf noetig", async () => {
  let calls = 0;
  const result = await withRetries(async () => {
    calls++;
    return "ok";
  }, 3, 1);
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetries: schlaegt zweimal fehl (null), dann erfolgreich -> gibt Erfolg zurueck", async () => {
  let calls = 0;
  const result = await withRetries(async () => {
    calls++;
    return calls < 3 ? null : "ok";
  }, 3, 1);
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("withRetries: alle Versuche liefern null -> gibt null zurueck, genau maxAttempts Aufrufe", async () => {
  let calls = 0;
  const result = await withRetries(async () => {
    calls++;
    return null;
  }, 3, 1);
  assert.equal(result, null);
  assert.equal(calls, 3);
});
