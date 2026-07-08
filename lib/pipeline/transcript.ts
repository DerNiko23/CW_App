import { YoutubeTranscript } from "youtube-transcript";
import type { Transcript, TranscriptSegment } from "./types";

// Diagnose 2026-07-08 (CHANGELOG): fetchTranscript scheitert auf Vercel bei
// praktisch allen Kandidaten mit no_transcript, obwohl dieselben Videos lokal
// zuverlaessig ein Transkript liefern - vermutlich IP-basierte YouTube-Drossel
// gegen Vercels Serverless-Range. Retry-Versuch (kein Kostenrisiko): 3 Anlaeufe
// mit kurzem Delay, falls es eher ein weiches Rate-Limit als ein hartes Blocken
// ist. Wenn das nichts bringt, ist das selbst ein Root-Cause-Datenpunkt.
const TRANSCRIPT_FETCH_ATTEMPTS = 3;
const TRANSCRIPT_RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "de" });
    return toTranscript(raw);
  } catch {
    try {
      // Fallback ohne erzwungene Sprache (Auto-Caption ist manchmal nur "en" getaggt).
      const raw = await YoutubeTranscript.fetchTranscript(videoId);
      return toTranscript(raw);
    } catch {
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
