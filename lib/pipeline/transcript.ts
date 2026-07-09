import { YoutubeTranscript } from "youtube-transcript";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { Transcript, TranscriptSegment } from "./types";

// Diagnose 2026-07-08 (CHANGELOG): fetchTranscript scheitert auf Vercel bei
// praktisch allen Kandidaten mit no_transcript, obwohl dieselben Videos lokal
// zuverlaessig ein Transkript liefern - vermutlich IP-basierte YouTube-Drossel
// gegen Vercels Serverless-Range. Retry-Versuch (kein Kostenrisiko): mehrere
// Anlaeufe mit kurzem Delay.
// Update 2026-07-10: Seit dem Webshare-Proxy-Fix (siehe createProxyFetch unten)
// ist das harte IP-Blocking geloest, aber ein Teil des rotierenden Proxy-IP-Pools
// liefert vereinzelt eine Consent-/Zwischenseite statt der echten Watch-Page
// (YoutubeTranscriptVideoUnavailableError trotz vorhandenem Transkript, live auf
// Vercel-Preview verifiziert: 2/4 mit 3 Anlaeufen). Da jeder Anlauf eine neue
// rotierte IP zieht, erhoeht mehr Anlaeufe direkt die Trefferchance - deshalb 3 -> 5.
const TRANSCRIPT_FETCH_ATTEMPTS = 5;
const TRANSCRIPT_RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fix 2026-07-09: Retry allein half nicht gegen das IP-Blocking (siehe oben) -
// Requests laufen stattdessen ueber einen rotierenden Webshare-Residential-Proxy,
// sobald PROXY_*-Env-Vars gesetzt sind. Fehlen sie (z. B. lokal ohne konfigurierten
// Proxy), faellt der Code automatisch auf direkten fetch zurueck - kein Hard-Requirement.
// Einmal pro warmem Serverless-Container gebaut, nicht pro Request.
const proxyFetch = createProxyFetch();

function createProxyFetch(): typeof fetch | null {
  const { PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD } = process.env;
  if (!PROXY_HOST || !PROXY_PORT || !PROXY_USERNAME || !PROXY_PASSWORD) return null;

  const dispatcher = new ProxyAgent({
    uri: `http://${PROXY_HOST}:${PROXY_PORT}`,
    token: `Basic ${Buffer.from(`${PROXY_USERNAME}:${PROXY_PASSWORD}`).toString("base64")}`,
  });

  // undici.fetch ist strukturell kompatibel zum globalen fetch, aber nominell ein
  // anderer Typ (eigene Response/RequestInit) - Cast ist hier bewusst und sicher.
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as string, { ...(init as object), dispatcher })) as unknown as typeof fetch;
}

// Generischer Retry-Loop: ruft `attemptFn` bis zu `maxAttempts`-mal auf, wartet
// `delayMs` zwischen Versuchen, gibt das erste Nicht-null-Ergebnis zurueck oder
// `null`, wenn alle Versuche `null` liefern. Isoliert von `YoutubeTranscript.*`
// testbar, ohne echte Netzwerk-/Timer-Wartezeit in Tests zu brauchen.
export async function withRetries<T>(
  attemptFn: () => Promise<T | null>,
  maxAttempts: number,
  delayMs: number,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await attemptFn();
    if (result !== null) return result;
    if (attempt < maxAttempts) await sleep(delayMs);
  }
  return null;
}

async function fetchTranscriptOnce(videoId: string): Promise<Transcript | null> {
  const fetchOpt = proxyFetch ? { fetch: proxyFetch } : {};
  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "de", ...fetchOpt });
    return toTranscript(raw);
  } catch (err) {
    console.error(
      `[fetchTranscript] videoId=${videoId} attempt=lang:de error=${(err as Error).name}: ${(err as Error).message}`,
    );
    try {
      // Fallback ohne erzwungene Sprache (Auto-Caption ist manchmal nur "en" getaggt).
      const raw = await YoutubeTranscript.fetchTranscript(videoId, fetchOpt);
      return toTranscript(raw);
    } catch (err) {
      console.error(
        `[fetchTranscript] videoId=${videoId} attempt=fallback error=${(err as Error).name}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}

// Holt das Transkript über die inoffizielle YouTube-Timedtext-Route (kein API-Key
// nötig). Liefert `null` statt zu werfen, wenn kein Transkript existiert oder
// verfügbar ist – Aufrufer entscheidet, ob/wie geloggt wird (Skip + Log).
export async function fetchTranscript(videoId: string): Promise<Transcript | null> {
  return withRetries(() => fetchTranscriptOnce(videoId), TRANSCRIPT_FETCH_ATTEMPTS, TRANSCRIPT_RETRY_DELAY_MS);
}

function toTranscript(
  raw: Array<{ text: string; offset: number; duration: number }>,
): Transcript | null {
  if (!raw || raw.length === 0) return null;

  const segments: TranscriptSegment[] = raw.map((entry) => ({
    text: entry.text,
    offsetMs: entry.offset,
    durationMs: entry.duration,
  }));

  return {
    segments,
    fullText: segments.map((s) => s.text).join(" "),
  };
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Formatiert das Transkript mit Timestamps für den Claude-Prompt, z. B.:
// "[03:41] Honig macht nicht dick, weil..."
export function formatTranscriptForPrompt(transcript: Transcript): string {
  return transcript.segments
    .map((s) => `[${formatTimestamp(s.offsetMs)}] ${s.text}`)
    .join("\n");
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Verifiziert programmatisch (nicht auf Claudes Wort vertrauend), ob ein Zitat
// tatsächlich wörtlich im Transkript vorkommt – Basis für Confidence-Check #2.
export function isQuoteVerbatimInTranscript(
  quote: string,
  transcript: Transcript,
): boolean {
  const normalizedFullText = normalizeForMatch(transcript.fullText);
  const normalizedQuote = normalizeForMatch(quote);
  if (!normalizedQuote) return false;
  return normalizedFullText.includes(normalizedQuote);
}

// Findet den Timestamp (Sekunden) des Segments, in dem ein Zitat beginnt –
// zur Selbst-Verifikation des von Claude gelieferten Timestamps.
export function findTimestampForQuote(
  quote: string,
  transcript: Transcript,
): number | null {
  const normalizedQuote = normalizeForMatch(quote);
  const firstWords = normalizedQuote.split(" ").slice(0, 4).join(" ");
  if (!firstWords) return null;

  for (const segment of transcript.segments) {
    if (normalizeForMatch(segment.text).includes(firstWords)) {
      return Math.round(segment.offsetMs / 1000);
    }
  }
  return null;
}
