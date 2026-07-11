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
import { getVideoDetails, searchVideoIds, VIDEOS_LIST_BATCH_SIZE } from "./youtube";
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

export async function runDiscovery(params: {
  supabase: SupabaseClient;
  youtubeApiKey: string;
  maxSearchesThisRun?: number;
  maxResultsPerQuery?: number;
  // Auto-Search: frueher Abbruch der (teuren) Verarbeitungsschleife, sobald genug
  // Treffer gefunden sind oder ein Sicherheitsnetz-Limit erreicht ist.
  stopAfterFoundCount?: number;
  maxCandidatesProcessed?: number;
  // Epoch-ms: Lauf bricht VOR diesem Zeitpunkt sauber ab (eigener "done"-Event) statt zu
  // riskieren, dass die Vercel-Function-Laufzeitgrenze mitten in der Verarbeitung zuschlaegt
  // (dort kommt keine saubere Antwort mehr an - siehe CHANGELOG 2026-07-11). Der Client
  // erkennt `summary.timedOut` und haengt bei Bedarf automatisch einen Folge-Request an.
  deadline?: number;
  onProgress?: (event: DiscoveryProgressEvent) => void;
}): Promise<DiscoveryRunSummary> {
  const { supabase, youtubeApiKey, maxResultsPerQuery = 10, deadline } = params;

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

  const summary: DiscoveryRunSummary = {
    queriesAvailable: queries.length,
    searchesPerformed: 0,
    videoIdsFound: 0,
    videoIdsNew: 0,
    results: [],
    quotaUsedToday: usedToday,
    timedOut: false,
  };

  const allFoundIds: string[] = [];

  for (const query of queries.slice(0, searchLimit)) {
    if (timeUp()) break;
    const videoIds = await searchVideoIds(query, youtubeApiKey, maxResultsPerQuery);
    await addQuotaUsage(supabase, YOUTUBE_SEARCH_COST);
    summary.searchesPerformed += 1;
    summary.videoIdsFound += videoIds.length;
    allFoundIds.push(...videoIds);
  }

  const uniqueFoundIds = Array.from(new Set(allFoundIds));
  const newIds = await filterUnseenVideoIds(supabase, uniqueFoundIds);
  summary.videoIdsNew = newIds.length;

  const { stopAfterFoundCount, maxCandidatesProcessed, onProgress } = params;
  let checkedCount = 0;
  let foundCount = 0;

  // Ziel erreicht / Kosten-Sicherheitsnetz gegriffen - unabhaengig von der Zeit. Bewusst getrennt
  // von der Zeit-Pruefung (siehe targetReached()): beide werden am Ende UNABHAENGIG voneinander
  // aus dem finalen checkedCount/foundCount neu berechnet (computeTimedOut), damit ein
  // zeitgleiches Erreichen beider Bedingungen nicht dazu fuehrt, dass die zuerst ausgewertete
  // das Ergebnis verfaelscht.
  function otherStopReached(): boolean {
    return (
      (stopAfterFoundCount !== undefined && foundCount >= stopAfterFoundCount) ||
      (maxCandidatesProcessed !== undefined && checkedCount >= maxCandidatesProcessed)
    );
  }

  function targetReached(): boolean {
    return otherStopReached() || timeUp();
  }

  // true, wenn eine der beiden Schleifen unten ueber targetReached() vorzeitig verlassen wurde -
  // bewusst nicht aus `checkedCount`/`newIds.length` abgeleitet: `getVideoDetails` kann pro Batch
  // weniger Details liefern als angefragt (z. B. bei zwischenzeitlich geloeschten Videos), dann
  // haette `checkedCount` eine Luecke und wuerde faelschlich wie unvollstaendige Arbeit aussehen.
  let brokeEarly = false;

  candidateLoop: for (let i = 0; i < newIds.length; i += VIDEOS_LIST_BATCH_SIZE) {
    if (targetReached()) {
      brokeEarly = true;
      break;
    }
    const batch = newIds.slice(i, i + VIDEOS_LIST_BATCH_SIZE);
    const details = await getVideoDetails(batch, youtubeApiKey);
    await addQuotaUsage(supabase, YOUTUBE_VIDEOS_LIST_COST);

    for (const metadata of details) {
      const result = await processVideo({ supabase, metadata, myths, weights });
      summary.results.push({ externalId: metadata.externalId, result });
      checkedCount += 1;
      if (result.status === "processed" && passesConfidenceThreshold(result.bestClaim.confidence.score)) {
        foundCount += 1;
      }
      onProgress?.({ type: "candidate", externalId: metadata.externalId, result, foundCount, checkedCount });

      if (targetReached()) {
        brokeEarly = true;
        break candidateLoop;
      }
    }
  }

  summary.timedOut = computeTimedOut({
    timeUp: timeUp(),
    allCandidatesChecked: !brokeEarly,
    otherStopReached: otherStopReached(),
  });

  summary.quotaUsedToday = await getQuotaUsedToday(supabase);
  onProgress?.({ type: "done", summary, foundCount, checkedCount });
  return summary;
}
