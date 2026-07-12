import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTimedOut, runInterleavedDiscovery } from "./discovery";
import type { ProcessVideoResult } from "./process";
import type { VideoMetadata } from "./types";

function meta(externalId: string): VideoMetadata {
  return {
    externalId,
    url: `https://youtu.be/${externalId}`,
    title: externalId,
    channel: "c",
    channelId: "ch",
    publishedAt: null,
    thumbnail: null,
    views: 0,
    likes: 0,
    comments: 0,
  };
}

// runInterleavedDiscovery liest von einem "processed"-Result nur status + bestClaim.confidence.score,
// von einem "skipped"-Result nur status/reason - deshalb reichen diese minimalen Fakes.
function found(): ProcessVideoResult {
  return { status: "processed", bestClaim: { confidence: { score: 100 } } } as unknown as ProcessVideoResult;
}
function skipped(): ProcessVideoResult {
  return { status: "skipped", reason: "no_transcript" } as ProcessVideoResult;
}

type Overrides = Partial<Parameters<typeof runInterleavedDiscovery>[0]>;
function makeDeps(over: Overrides): Parameters<typeof runInterleavedDiscovery>[0] {
  return {
    queries: ["q1", "q2", "q3", "q4"],
    searchLimit: 4,
    maxResultsPerQuery: 10,
    stopAfterFoundCount: 5,
    timeUp: () => false,
    search: async () => [],
    filterUnseen: async (ids) => ids,
    getDetails: async (ids) => ids.map(meta),
    process: async () => skipped(),
    onSearchCost: () => {},
    onDetailsCost: () => {},
    ...over,
  };
}

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

// --- runInterleavedDiscovery: der eigentliche Quota-Spar-Mechanismus (Suche stoppt bei genug Treffern) ---

test("runInterleavedDiscovery: stoppt weitere Suchen, sobald das Ziel erreicht ist", async () => {
  let searchCalls = 0;
  const deps = makeDeps({
    stopAfterFoundCount: 2,
    search: async (q) => {
      searchCalls += 1;
      return [`${q}-a`, `${q}-b`];
    },
    process: async () => found(),
  });

  const r = await runInterleavedDiscovery(deps);
  // Erste Suche liefert 2 Kandidaten, beide Treffer -> Ziel (2) erreicht -> KEINE weitere Suche.
  assert.equal(searchCalls, 1);
  assert.equal(r.searchesPerformed, 1);
  assert.equal(r.foundCount, 2);
  assert.equal(r.timedOut, false);
});

test("runInterleavedDiscovery: ohne Treffer werden alle erlaubten Suchen ausgeschöpft (kein Timeout)", async () => {
  let searchCalls = 0;
  const deps = makeDeps({
    searchLimit: 3,
    search: async (q) => {
      searchCalls += 1;
      return [`${q}-a`];
    },
    process: async () => skipped(),
  });

  const r = await runInterleavedDiscovery(deps);
  assert.equal(searchCalls, 3);
  assert.equal(r.searchesPerformed, 3);
  assert.equal(r.foundCount, 0);
  assert.equal(r.timedOut, false);
});

test("runInterleavedDiscovery: Timeout mitten drin -> timedOut true, spätere Suchen unterbleiben", async () => {
  let searchCalls = 0;
  let ticks = 0;
  const deps = makeDeps({
    searchLimit: 4,
    timeUp: () => ticks >= 2,
    search: async (q) => {
      searchCalls += 1;
      return [`${q}-a`];
    },
    process: async () => {
      ticks += 1;
      return skipped();
    },
  });

  const r = await runInterleavedDiscovery(deps);
  assert.ok(searchCalls < 4, `erwartet < 4 Suchen, waren ${searchCalls}`);
  assert.equal(r.timedOut, true);
});

test("runInterleavedDiscovery: videoDurationFilter wird an die Suche durchgereicht", async () => {
  const seen: Array<string | undefined> = [];
  const deps = makeDeps({
    queries: ["q1"],
    searchLimit: 1,
    videoDurationFilter: "short",
    search: async (_q, _max, duration) => {
      seen.push(duration);
      return [];
    },
  });

  await runInterleavedDiscovery(deps);
  assert.deepEqual(seen, ["short"]);
});

test("runInterleavedDiscovery: dieselbe ID aus zwei Queries wird nur einmal verarbeitet", async () => {
  let processCalls = 0;
  const deps = makeDeps({
    queries: ["q1", "q2"],
    searchLimit: 2,
    search: async () => ["dup"],
    process: async () => {
      processCalls += 1;
      return skipped();
    },
  });

  const r = await runInterleavedDiscovery(deps);
  assert.equal(processCalls, 1, "dieselbe Video-ID darf nicht doppelt durch die Verarbeitung");
  assert.equal(r.searchesPerformed, 2, "die Suchen selbst laufen trotzdem beide (Suche ist blind für Duplikate)");
  assert.equal(r.videoIdsNew, 1);
});

test("runInterleavedDiscovery: Quota-Callbacks feuern pro Suche bzw. pro Detail-Batch", async () => {
  let searchCost = 0;
  let detailsCost = 0;
  const deps = makeDeps({
    searchLimit: 2,
    stopAfterFoundCount: 5,
    search: async (q) => [`${q}-a`],
    process: async () => skipped(),
    onSearchCost: () => {
      searchCost += 1;
    },
    onDetailsCost: () => {
      detailsCost += 1;
    },
  });

  await runInterleavedDiscovery(deps);
  // 2 Suchen (kein früher Abbruch, da nichts gefunden), je 1 Detail-Batch mit 1 ID.
  assert.equal(searchCost, 2);
  assert.equal(detailsCost, 2);
});
