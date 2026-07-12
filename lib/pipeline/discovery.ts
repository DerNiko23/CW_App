import type { SupabaseClient } from "@supabase/supabase-js";
import { passesConfidenceThreshold } from "./confidence";
import { loadMyths } from "./myths";
import { processVideo, type ProcessVideoResult } from "./process";
import {
  addQuotaUsage,
  getQuotaUsedToday,
  maxSearchCallsWithinBudget,
  YOUTUBE_SEARCH_COST,
  YOUTUBE_VIDEOS_LIST_COST,
} from "./quota";
import { getVideoDetails, searchVideoIds, VIDEOS_LIST_BATCH_SIZE, type VideoDuration } from "./youtube";
import type { VideoMetadata } from "./types";
import { loadWeights } from "./weights";

export type DiscoveryRunSummary = {
  queriesAvailable: number;
  searchesPerformed: number;
  videoIdsFound: number;
  videoIdsNew: number;
  results: Array<{ externalId: string; result: ProcessVideoResult }>;
  quotaUsedToday: number;
  // true = vorzeitig wegen `deadline` beendet (nicht wegen stopAfterFoundCount/maxCandidatesProcessed).
  // Signal fuer den Client, automatisch mit einem Folge-Request weiterzumachen statt die
  // Vercel-Function-Laufzeitgrenze zu riskieren (siehe route.ts).
  timedOut: boolean;
};

// Auto-Search-Button: Live-Fortschritt fuer einen interaktiv wartenden Nutzer,
// ohne neue Job-State-Tabelle - der Callback treibt direkt einen Streaming-Response.
export type DiscoveryProgressEvent =
  | { type: "candidate"; externalId: string; result: ProcessVideoResult; foundCount: number; checkedCount: number }
  | { type: "done"; summary: DiscoveryRunSummary; foundCount: number; checkedCount: number };

function buildQueries(myths: Awaited<ReturnType<typeof loadMyths>>): string[] {
  const queries = myths.flatMap((myth) =>
    myth.search_queries.length > 0 ? myth.search_queries : [myth.claim_pattern],
  );
  // Duplikate raus (mehrere Mythen können auf dieselbe Query fallen).
  return Array.from(new Set(queries));
}

async function filterUnseenVideoIds(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<string[]> {
  if (videoIds.length === 0) return [];

  // Fix 2026-07-10: no_transcript-Skips waren vor dem Proxy-Fix (siehe transcript.ts) fast immer
  // ein Infrastruktur-Problem (Vercel-IP-Block), keine echte Aussage ueber das Video - anders als
  // off_topic/no_claims, die stabile inhaltliche Urteile sind und bei erneuter Pruefung mit hoher
  // Wahrscheinlichkeit gleich ausfallen. 70 von 100 discovery_log-Eintraegen waren no_transcript
  // und blockierten dadurch dauerhaft jede Neuentdeckung, obwohl der Proxy die meisten davon jetzt
  // loesen wuerde. Deshalb zaehlen no_transcript-Skips hier nicht mehr als "schon gesehen".
  const [{ data: existingVideos }, { data: loggedSkips }] = await Promise.all([
    supabase.from("videos").select("external_id").in("external_id", videoIds),
    supabase
      .from("discovery_log")
      .select("external_id")
      .in("external_id", videoIds)
      .neq("reason", "no_transcript"),
  ]);

  const seen = new Set([
    ...(existingVideos ?? []).map((v) => v.external_id as string),
    ...(loggedSkips ?? []).map((v) => v.external_id as string),
  ]);

  return videoIds.filter((id) => !seen.has(id));
}

// Als eigene, reine Funktion extrahiert (statt inline in runDiscovery), damit dieser Pfad ohne
// Netzwerk-/DB-Mocks direkt getestet werden kann - siehe discovery.test.ts. Ein gewolltes Ende
// (Ziel erreicht, Sicherheitsnetz gegriffen, oder alle Kandidaten ohne vorzeitigen Abbruch
// durchgelaufen) hat immer Vorrang vor `timeUp`, selbst wenn die Deadline zufaellig im selben
// Moment auch ueberschritten wurde - sonst haengt der Client unnoetig einen Folge-Request an
// (echter Bug einer frueheren Fassung: `timeUp` wurde zuerst geprueft und hat den Rest der
// Bedingungen gar nicht mehr ausgewertet).
export function computeTimedOut(params: {
  timeUp: boolean;
  otherStopReached: boolean;
  allCandidatesChecked: boolean;
}): boolean {
  return params.timeUp && !(params.otherStopReached || params.allCandidatesChecked);
}

export type InterleavedDiscoveryResult = {
  searchesPerformed: number;
  videoIdsFound: number;
  videoIdsNew: number;
  results: Array<{ externalId: string; result: ProcessVideoResult }>;
  foundCount: number;
  checkedCount: number;
  timedOut: boolean;
};

// Kernschleife der Discovery, mit injizierten IO-Funktionen (Suche/Details/Verarbeitung/Quota),
// damit das Verhalten OHNE echte Netzwerk-/DB-Aufrufe getestet werden kann (siehe
// discovery.test.ts). Wichtigste Eigenschaft: Suche und Verarbeitung sind VERZAHNT - nach jeder
// einzelnen Suche werden deren Kandidaten sofort geprüft und die Schleife bricht ab, sobald genug
// Treffer da sind. So kostet ein Lauf, der schnell 5 Videos findet, nur 1-2 search.list-Aufrufe
// (100-200 Units) statt vorher immer alle `searchLimit` Suchen im Voraus (bis 800 Units), auch
// wenn die ersten Treffer längst gereicht hätten. Filter/Länge ändern die Quota-Kosten NICHT.
export async function runInterleavedDiscovery(deps: {
  queries: string[];
  searchLimit: number;
  maxResultsPerQuery: number;
  videoDurationFilter?: VideoDuration;
  stopAfterFoundCount?: number;
  maxCandidatesProcessed?: number;
  timeUp: () => boolean;
  search: (query: string, maxResults: number, videoDuration?: VideoDuration) => Promise<string[]>;
  filterUnseen: (ids: string[]) => Promise<string[]>;
  getDetails: (ids: string[]) => Promise<VideoMetadata[]>;
  process: (metadata: VideoMetadata) => Promise<ProcessVideoResult>;
  onSearchCost: () => Promise<void> | void;
  onDetailsCost: () => Promise<void> | void;
  onCandidate?: (
    result: ProcessVideoResult,
    externalId: string,
    foundCount: number,
    checkedCount: number,
  ) => void;
}): Promise<InterleavedDiscoveryResult> {
  const {
    queries,
    searchLimit,
    maxResultsPerQuery,
    videoDurationFilter,
    stopAfterFoundCount,
    maxCandidatesProcessed,
    timeUp,
    search,
    filterUnseen,
    getDetails,
    process,
    onSearchCost,
    onDetailsCost,
    onCandidate,
  } = deps;

  let searchesPerformed = 0;
  let videoIdsFound = 0;
  let videoIdsNew = 0;
  const results: Array<{ externalId: string; result: ProcessVideoResult }> = [];
  let foundCount = 0;
  let checkedCount = 0;
  // IDs, die in diesem Lauf schon zur Verarbeitung eingereiht wurden - verhindert, dass zwei
  // Queries dasselbe Video doppelt durch die (teure) Claude-Verarbeitung schicken.
  const seenThisRun = new Set<string>();
  let brokeEarly = false;

  function otherStopReached(): boolean {
    return (
      (stopAfterFoundCount !== undefined && foundCount >= stopAfterFoundCount) ||
      (maxCandidatesProcessed !== undefined && checkedCount >= maxCandidatesProcessed)
    );
  }

  function targetReached(): boolean {
    return otherStopReached() || timeUp();
  }

  searchLoop: for (const query of queries.slice(0, searchLimit)) {
    if (targetReached()) {
      brokeEarly = true;
      break;
    }

    const ids = await search(query, maxResultsPerQuery, videoDurationFilter);
    await onSearchCost();
    searchesPerformed += 1;
    videoIdsFound += ids.length;

    const fresh = ids.filter((id) => !seenThisRun.has(id));
    fresh.forEach((id) => seenThisRun.add(id));
    const newIds = await filterUnseen(fresh);
    videoIdsNew += newIds.length;

    for (let i = 0; i < newIds.length; i += VIDEOS_LIST_BATCH_SIZE) {
      if (targetReached()) {
        brokeEarly = true;
        break searchLoop;
      }
      const batch = newIds.slice(i, i + VIDEOS_LIST_BATCH_SIZE);
      const details = await getDetails(batch);
      await onDetailsCost();

      for (const metadata of details) {
        const result = await process(metadata);
        results.push({ externalId: metadata.externalId, result });
        checkedCount += 1;
        if (result.status === "processed" && passesConfidenceThreshold(result.bestClaim.confidence.score)) {
          foundCount += 1;
        }
        onCandidate?.(result, metadata.externalId, foundCount, checkedCount);

        if (targetReached()) {
          brokeEarly = true;
          break searchLoop;
        }
      }
    }
  }

  const timedOut = computeTimedOut({
    timeUp: timeUp(),
    otherStopReached: otherStopReached(),
    allCandidatesChecked: !brokeEarly,
  });

  return { searchesPerformed, videoIdsFound, videoIdsNew, results, foundCount, checkedCount, timedOut };
}

export async function runDiscovery(params: {
  supabase: SupabaseClient;
  youtubeApiKey: string;
  maxSearchesThisRun?: number;
  maxResultsPerQuery?: number;
  // Auto-Search: frueher Abbruch der (teuren) Verarbeitungsschleife, sobald genug
  // Treffer gefunden sind oder ein Sicherheitsnetz-Limit erreicht ist.
  stopAfterFoundCount?: number;
  maxCandidatesProcessed?: number;
  // Optionaler Längen-Filter für die YouTube-Suche (z. B. "short" für Kurzvideos). Ändert die
  // Quota-Kosten NICHT, ist rein inhaltlich - siehe VideoDuration in youtube.ts.
  videoDurationFilter?: VideoDuration;
  // Epoch-ms: Lauf bricht VOR diesem Zeitpunkt sauber ab (eigener "done"-Event) statt zu
  // riskieren, dass die Vercel-Function-Laufzeitgrenze mitten in der Verarbeitung zuschlaegt
  // (dort kommt keine saubere Antwort mehr an - siehe CHANGELOG 2026-07-11). Der Client
  // erkennt `summary.timedOut` und haengt bei Bedarf automatisch einen Folge-Request an.
  deadline?: number;
  onProgress?: (event: DiscoveryProgressEvent) => void;
}): Promise<DiscoveryRunSummary> {
  const {
    supabase,
    youtubeApiKey,
    maxResultsPerQuery = 10,
    deadline,
    videoDurationFilter,
    stopAfterFoundCount,
    maxCandidatesProcessed,
    onProgress,
  } = params;

  function timeUp(): boolean {
    return deadline !== undefined && Date.now() >= deadline;
  }

  const [myths, weights, usedToday] = await Promise.all([
    loadMyths(supabase),
    loadWeights(supabase),
    getQuotaUsedToday(supabase),
  ]);

  const queries = buildQueries(myths);
  const budgetAllowedSearches = maxSearchCallsWithinBudget(usedToday);
  const searchLimit = Math.min(
    queries.length,
    budgetAllowedSearches,
    params.maxSearchesThisRun ?? budgetAllowedSearches,
  );

  const loop = await runInterleavedDiscovery({
    queries,
    searchLimit,
    maxResultsPerQuery,
    videoDurationFilter,
    stopAfterFoundCount,
    maxCandidatesProcessed,
    timeUp,
    search: (query, maxResults, duration) => searchVideoIds(query, youtubeApiKey, maxResults, duration),
    filterUnseen: (ids) => filterUnseenVideoIds(supabase, ids),
    getDetails: (ids) => getVideoDetails(ids, youtubeApiKey),
    process: (metadata) => processVideo({ supabase, metadata, myths, weights }),
    onSearchCost: () => addQuotaUsage(supabase, YOUTUBE_SEARCH_COST),
    onDetailsCost: () => addQuotaUsage(supabase, YOUTUBE_VIDEOS_LIST_COST),
    onCandidate: (result, externalId, foundCount, checkedCount) =>
      onProgress?.({ type: "candidate", externalId, result, foundCount, checkedCount }),
  });

  const summary: DiscoveryRunSummary = {
    queriesAvailable: queries.length,
    searchesPerformed: loop.searchesPerformed,
    videoIdsFound: loop.videoIdsFound,
    videoIdsNew: loop.videoIdsNew,
    results: loop.results,
    quotaUsedToday: await getQuotaUsedToday(supabase),
    timedOut: loop.timedOut,
  };

  onProgress?.({ type: "done", summary, foundCount: loop.foundCount, checkedCount: loop.checkedCount });
  return summary;
}
