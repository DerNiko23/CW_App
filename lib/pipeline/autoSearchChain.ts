import type { ProcessVideoResult } from "./process";

// Framework-freie Verkettungs-Logik fuer den Auto-Search-Button, getrennt von
// components/inbox/auto-search-button.tsx extrahiert, damit sie ohne React-Test-Harness direkt
// getestet werden kann (siehe autoSearchChain.test.ts) - der Nutzer wollte diesen Pfad explizit
// nicht ungetestet lassen (er ist verantwortlich fuer live gesehenes Fehlverhalten, siehe
// CHANGELOG 2026-07-11).

export type ChainableSummary = {
  foundCount: number;
  videoIdsNew: number;
  timedOut: boolean;
  results: Array<{ externalId: string; result: ProcessVideoResult }>;
};

export type AttemptOutcome =
  | { kind: "done"; summary: ChainableSummary }
  // Vom Server als {type:"error"} gemeldet (z. B. YouTube-Quota ueberschritten) - nie
  // retry-wuerdig, derselbe Fehler traete beim naechsten Versuch sofort wieder auf.
  | { kind: "serverError"; message: string }
  // Der fetch/die Stream-Verbindung selbst ist fehlgeschlagen (z. B. weil eine
  // Function-Zeitgrenze die Verbindung mitten in der Verarbeitung gekappt hat). Retry lohnt
  // sich, bereits verarbeitete Kandidaten werden dabei uebersprungen (filterUnseenVideoIds).
  | { kind: "networkError"; message: string }
  // Stream endete sauber, aber ohne "done"-Zeile - ebenfalls retry-wuerdig.
  | { kind: "incomplete" };

export function shouldChainNextAttempt(params: {
  targetFound: number;
  bestKnownFoundCount: number;
  lastSummary: ChainableSummary | null;
}): boolean {
  if (params.bestKnownFoundCount >= params.targetFound) return false;
  if (!params.lastSummary) return false;
  // Nichts Neues mehr gefunden - ein Folge-Request wuerde nur die YouTube-Suche wiederholen,
  // ohne neue Kandidaten zu bekommen.
  if (params.lastSummary.videoIdsNew === 0) return false;
  // Nur bei einem Zeitlimit-Abbruch automatisch weitermachen - die anderen Stop-Gruende (Ziel
  // erreicht, MAX_CANDIDATES/MAX_SEARCHES-Sicherheitsnetz) sollen wirklich stoppen, sonst
  // hebelt die Verkettung die bestehende Kostenbremse aus.
  return params.lastSummary.timedOut;
}

export type ChainResult = {
  attemptsMade: number;
  bestKnownFoundCount: number;
  hardError: string | null;
  allResults: ChainableSummary["results"];
};

export async function runChainedSearch(params: {
  targetFound: number;
  maxAttempts: number;
  runAttempt: () => Promise<AttemptOutcome>;
}): Promise<ChainResult> {
  let attemptsMade = 0;
  let bestKnownFoundCount = 0;
  let hardError: string | null = null;
  let allResults: ChainableSummary["results"] = [];

  // Bewusst eine sequentielle while-Schleife mit await - kein Promise.all/verschachtelter
  // Aufruf: der naechste Versuch startet erst, nachdem der vorherige vollstaendig
  // abgeschlossen ist. Verhindert doppelte/ueberlappende Requests strukturell, nicht nur durch
  // Konvention.
  while (attemptsMade < params.maxAttempts && bestKnownFoundCount < params.targetFound) {
    attemptsMade += 1;
    const outcome = await params.runAttempt();

    if (outcome.kind === "serverError") {
      hardError = outcome.message;
      break;
    }

    if (outcome.kind === "networkError") {
      if (attemptsMade >= params.maxAttempts) {
        hardError = outcome.message;
      }
      continue;
    }

    if (outcome.kind === "incomplete") {
      continue;
    }

    allResults = allResults.concat(outcome.summary.results);
    bestKnownFoundCount = Math.max(bestKnownFoundCount, outcome.summary.foundCount);

    if (
      !shouldChainNextAttempt({
        targetFound: params.targetFound,
        bestKnownFoundCount,
        lastSummary: outcome.summary,
      })
    ) {
      break;
    }
  }

  return { attemptsMade, bestKnownFoundCount, hardError, allResults };
}
