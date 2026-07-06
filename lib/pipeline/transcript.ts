import { YoutubeTranscript } from "youtube-transcript";
import type { Transcript, TranscriptSegment } from "./types";

// Holt das Transkript über die inoffizielle YouTube-Timedtext-Route (kein API-Key
// nötig). Liefert `null` statt zu werfen, wenn kein Transkript existiert oder
// verfügbar ist – Aufrufer entscheidet, ob/wie geloggt wird (Skip + Log).
export async function fetchTranscript(videoId: string): Promise<Transcript | null> {
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
