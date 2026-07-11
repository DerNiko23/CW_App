import { test } from "node:test";
import assert from "node:assert/strict";
import { runChainedSearch, shouldChainNextAttempt, type AttemptOutcome, type ChainableSummary } from "./autoSearchChain";

function summary(overrides: Partial<ChainableSummary> = {}): ChainableSummary {
  return { foundCount: 0, videoIdsNew: 5, timedOut: false, results: [], ...overrides };
}

// --- shouldChainNextAttempt: die eigentliche "lohnt sich ein Folge-Request"-Entscheidung ---

test("shouldChainNextAttempt: Ziel bereits erreicht -> nie verketten", () => {
  assert.equal(
    shouldChainNextAttempt({
      targetFound: 5,
      bestKnownFoundCount: 5,
      lastSummary: summary({ timedOut: true, videoIdsNew: 10 }),
    }),
    false,
  );
});

test("shouldChainNextAttempt: Timeout, Ziel offen, noch Kandidaten uebrig -> verketten", () => {
  assert.equal(
    shouldChainNextAttempt({
      targetFound: 5,
      bestKnownFoundCount: 1,
      lastSummary: summary({ timedOut: true, videoIdsNew: 10 }),
    }),
    true,
  );
});

test("shouldChainNextAttempt: kein Timeout (Sicherheitsnetz/natuerliches Ende) -> nie verketten", () => {
  assert.equal(
    shouldChainNextAttempt({
      targetFound: 5,
      bestKnownFoundCount: 1,
      lastSummary: summary({ timedOut: false, videoIdsNew: 10 }),
    }),
    false,
  );
});

test("shouldChainNextAttempt: Timeout, aber nichts Neues mehr zu pruefen -> nie verketten", () => {
  assert.equal(
    shouldChainNextAttempt({
      targetFound: 5,
      bestKnownFoundCount: 1,
      lastSummary: summary({ timedOut: true, videoIdsNew: 0 }),
    }),
    false,
  );
});

// --- runChainedSearch: die eigentliche Ablaufsteuerung ---

test("runChainedSearch: Ziel im ersten Versuch erreicht -> genau ein Aufruf, kein Verketten", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 5,
    runAttempt: async () => {
      calls += 1;
      return { kind: "done", summary: summary({ foundCount: 5, timedOut: false }) } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.attemptsMade, 1);
  assert.equal(result.bestKnownFoundCount, 5);
  assert.equal(result.hardError, null);
});

test("runChainedSearch: Timeout im ersten Versuch -> haengt genau EINEN Folge-Request an, dann fertig", async () => {
  const callOrder: number[] = [];
  let concurrentCalls = 0;
  let maxConcurrentCalls = 0;

  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 5,
    runAttempt: async () => {
      concurrentCalls += 1;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
      callOrder.push(callOrder.length + 1);
      const attemptNumber = callOrder.length;

      // Simuliert echte asynchrone Serverarbeit - deckt auf, falls runChainedSearch faelschlich
      // einen zweiten Versuch startet, BEVOR der erste wirklich fertig ist (Promise.all-artiges
      // Verhalten statt sequentiellem await).
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrentCalls -= 1;

      if (attemptNumber === 1) {
        return { kind: "done", summary: summary({ foundCount: 1, timedOut: true, videoIdsNew: 10 }) } satisfies AttemptOutcome;
      }
      return { kind: "done", summary: summary({ foundCount: 5, timedOut: false }) } satisfies AttemptOutcome;
    },
  });

  assert.equal(maxConcurrentCalls, 1, "runAttempt darf nie ueberlappend/parallel laufen");
  assert.equal(result.attemptsMade, 2, "genau EIN Folge-Request, nicht mehr");
  assert.deepEqual(callOrder, [1, 2]);
  assert.equal(result.bestKnownFoundCount, 5);
  assert.equal(result.hardError, null);
});

test("runChainedSearch: MAX_ATTEMPTS deckelt eine Dauerschleife aus Timeouts", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 3,
    runAttempt: async () => {
      calls += 1;
      // Jeder Versuch findet nie genug und laeuft immer wieder in den Timeout -
      // ohne Deckel wuerde das endlos so weitergehen.
      return { kind: "done", summary: summary({ foundCount: 0, timedOut: true, videoIdsNew: 10 }) } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 3);
  assert.equal(result.attemptsMade, 3);
  assert.equal(result.bestKnownFoundCount, 0);
});

test("runChainedSearch: natuerliches Ende (kein Timeout) stoppt sofort, auch wenn Ziel offen ist", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 5,
    runAttempt: async () => {
      calls += 1;
      // MAX_CANDIDATES-Sicherheitsnetz gegriffen, kein Timeout - soll NICHT verkettet werden,
      // sonst wuerde das die Kostenbremse aushebeln.
      return { kind: "done", summary: summary({ foundCount: 1, timedOut: false, videoIdsNew: 10 }) } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.attemptsMade, 1);
});

test("runChainedSearch: serverError (z. B. Quota ueberschritten) stoppt sofort ohne Retry", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 5,
    runAttempt: async () => {
      calls += 1;
      return { kind: "serverError", message: "Quota exceeded" } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 1, "serverError ist nie retry-wuerdig - derselbe Fehler traete sofort wieder auf");
  assert.equal(result.attemptsMade, 1);
  assert.equal(result.hardError, "Quota exceeded");
  assert.equal(result.bestKnownFoundCount, 0);
});

test("runChainedSearch: networkError wird retried, solange Versuche uebrig sind", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 3,
    runAttempt: async () => {
      calls += 1;
      if (calls === 1) return { kind: "networkError", message: "connection reset" } satisfies AttemptOutcome;
      return { kind: "done", summary: summary({ foundCount: 5, timedOut: false }) } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.attemptsMade, 2);
  assert.equal(result.hardError, null, "nach erfolgreichem Retry kein Fehler mehr gemeldet");
  assert.equal(result.bestKnownFoundCount, 5);
});

test("runChainedSearch: networkError auf dem letzten erlaubten Versuch wird als Fehler gemeldet", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 2,
    runAttempt: async () => {
      calls += 1;
      return { kind: "networkError", message: "connection reset" } satisfies AttemptOutcome;
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.attemptsMade, 2);
  assert.equal(result.hardError, "connection reset");
});

test("runChainedSearch: bereits gefundene Videos bleiben nach einem spaeten Fehler erhalten", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 2,
    runAttempt: async () => {
      calls += 1;
      if (calls === 1) {
        return { kind: "done", summary: summary({ foundCount: 2, timedOut: true, videoIdsNew: 10 }) } satisfies AttemptOutcome;
      }
      return { kind: "serverError", message: "Quota exceeded" } satisfies AttemptOutcome;
    },
  });

  assert.equal(result.attemptsMade, 2);
  assert.equal(result.bestKnownFoundCount, 2, "der Fund aus Versuch 1 darf nicht verloren gehen");
  assert.equal(result.hardError, "Quota exceeded");
});

test("runChainedSearch: allResults sammelt ueber mehrere Versuche kumulativ", async () => {
  let calls = 0;
  const result = await runChainedSearch({
    targetFound: 5,
    maxAttempts: 3,
    runAttempt: async () => {
      calls += 1;
      const externalId = `video-${calls}`;
      if (calls < 3) {
        return {
          kind: "done",
          summary: summary({
            foundCount: calls,
            timedOut: true,
            videoIdsNew: 10,
            results: [{ externalId, result: { status: "skipped", reason: "no_transcript" } }],
          }),
        } satisfies AttemptOutcome;
      }
      return {
        kind: "done",
        summary: summary({
          foundCount: 5,
          timedOut: false,
          results: [{ externalId, result: { status: "skipped", reason: "no_transcript" } }],
        }),
      } satisfies AttemptOutcome;
    },
  });

  assert.equal(result.attemptsMade, 3);
  assert.equal(result.allResults.length, 3);
  assert.deepEqual(
    result.allResults.map((r) => r.externalId),
    ["video-1", "video-2", "video-3"],
  );
});
