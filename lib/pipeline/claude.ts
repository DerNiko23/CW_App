import { unwrapToolInput } from "./toolInput";
import type { ClaimCandidate, Myth, NormalizationResult, TopicDetectionResult } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

// Erzwungenes Tool-Use statt Freitext-JSON: die Anthropic API validiert/parst die
// Tool-Argumente serverseitig gegen das Schema, statt dass wir rohen Modelltext
// parsen müssen (anfällig für abgeschnittenes/leicht fehlerhaftes JSON bei
// Freitext-Antworten – in der Praxis beobachtet).
async function callClaudeTool<T>(
  system: string,
  userMessage: string,
  tool: ToolDefinition,
  maxTokens = 1024,
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nicht gesetzt");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API Fehler: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
  };

  const toolUse = json.content?.find(
    (block) => block.type === "tool_use" && block.name === tool.name,
  );
  if (!toolUse) {
    throw new Error(`Claude API: kein Tool-Use-Block für "${tool.name}" erhalten`);
  }
  return unwrapToolInput<T>(toolUse.input as Record<string, unknown>);
}

// --- 1) Topic Detection ------------------------------------------------
// MASTERPLAN.md §2: Deutsch + Ernährung/Fitness/Gesundheit, sonst raus.
// "ernaehrung" ist bewusst von "fitness"/"gesundheit" unterschieden, weil
// Confidence-Check #3 ("Thema: Ernährung, Chris-Kernthema") genau das abfragt.
const TOPIC_DETECTION_SYSTEM = `Du bist ein Klassifikator für ein deutschsprachiges Video-Transkript.
Ordne das Transkript genau einer Kategorie zu:
- "ernaehrung": Es geht um Ernährung, Diäten, Lebensmittel, Kalorien, Nährstoffe.
- "fitness": Es geht um Training, Sport, Muskelaufbau, Bewegung (ohne Ernährungsfokus).
- "gesundheit": Allgemeine Gesundheitsthemen (Schlaf, Supplements, Wellness) ohne klaren Ernährungs-/Fitness-Fokus.
- "off_topic": Keines der drei Themen, oder das Video ist nicht auf Deutsch.`;

const TOPIC_DETECTION_TOOL: ToolDefinition = {
  name: "classify_topic",
  description: "Klassifiziert ein Video-Transkript in eine Themenkategorie.",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        enum: ["ernaehrung", "fitness", "gesundheit", "off_topic"],
      },
      reasoning: { type: "string", description: "Ein kurzer Satz auf Deutsch." },
    },
    required: ["topic", "reasoning"],
  },
};

export async function detectTopic(transcriptExcerpt: string): Promise<TopicDetectionResult> {
  return callClaudeTool<TopicDetectionResult>(
    TOPIC_DETECTION_SYSTEM,
    `Transkript-Ausschnitt:\n"""\n${transcriptExcerpt.slice(0, 4000)}\n"""`,
    TOPIC_DETECTION_TOOL,
    512,
  );
}

// --- 2) Claim Extraction -------------------------------------------------
// Wörtliches Zitat + Timestamp (MASTERPLAN.md §3.2A). Das Zitat wird
// programmatisch gegen das Transkript verifiziert (transcript.ts) – hier zählt,
// dass Claude wirklich exakt kopiert statt paraphrasiert.
const CLAIM_EXTRACTION_SYSTEM = `Du liest ein deutschsprachiges Video-Transkript mit Zeitstempeln im Format "[MM:SS] Text".
Finde bis zu 3 konkrete, überprüfbare Tatsachenbehauptungen zu Ernährung/Fitness/Gesundheit
(keine Meinungen, keine Fragen). Für jede Behauptung:
- "quote": Kopiere den Satz WÖRTLICH und EXAKT aus dem Transkript (keine Umformulierung,
  keine Kürzung mit "..."). Du darfst mehrere aufeinanderfolgende Zeilen zu einem Satz
  zusammenfügen, aber nur mit exaktem Text.
- "timestamp_s": Der Zeitstempel (in Sekunden) der ERSTEN Zeile, aus der das Zitat stammt.

Wenn keine konkrete Tatsachenbehauptung vorkommt, gib eine leere Liste zurück.`;

const CLAIM_EXTRACTION_TOOL: ToolDefinition = {
  name: "extract_claims",
  description: "Extrahiert wörtliche Tatsachenbehauptungen mit Timestamp aus einem Transkript.",
  input_schema: {
    type: "object",
    properties: {
      claims: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            timestamp_s: { type: "integer" },
          },
          required: ["quote", "timestamp_s"],
        },
      },
    },
    required: ["claims"],
  },
};

export async function extractClaims(transcriptForPrompt: string): Promise<ClaimCandidate[]> {
  const result = await callClaudeTool<{ claims: ClaimCandidate[] }>(
    CLAIM_EXTRACTION_SYSTEM,
    `Transkript:\n"""\n${transcriptForPrompt.slice(0, 12000)}\n"""`,
    CLAIM_EXTRACTION_TOOL,
    2048,
  );
  return Array.isArray(result.claims) ? result.claims : [];
}

// --- 3) Normalisierung + Matching gegen Mythen-DB -----------------------
// "Honig hat keine Kalorien" ≈ "Honig macht nicht dick" (MASTERPLAN.md §2).
function formatMythsForPrompt(myths: Myth[]): string {
  return myths
    .map((m) => `- id="${m.id}" category="${m.category}": ${m.claim_pattern}`)
    .join("\n");
}

const NORMALIZATION_SYSTEM = `Du normalisierst eine Aussage aus einem Video-Transkript und gleichst sie gegen eine
Liste bekannter Ernährungs-/Fitness-Mythen ab.

1. "normalized_claim": Formuliere die Aussage als kurzen, kanonischen deutschen Satz
   (z. B. "Honig hat keine Kalorien" und "Honig macht nicht dick" -> "Honig ist kalorienfrei
   bzw. nicht dickmachend").
2. "myth_id": Wenn die Aussage inhaltlich klar zu einem Mythos aus der Liste passt (auch bei
   anderer Formulierung), gib dessen "id" zurück. Bei Unsicherheit oder keinem klaren Match:
   leerer String "". Erfinde niemals eine id, die nicht in der Liste steht.
3. "match_reasoning": Ein kurzer Satz auf Deutsch, warum (nicht) gematcht wurde.`;

const NORMALIZATION_TOOL: ToolDefinition = {
  name: "normalize_and_match",
  description: "Normalisiert eine Aussage und gleicht sie gegen bekannte Mythen ab.",
  input_schema: {
    type: "object",
    properties: {
      normalized_claim: { type: "string" },
      myth_id: {
        type: "string",
        description: "UUID aus der Mythen-Liste, oder leerer String bei keinem Match.",
      },
      match_reasoning: { type: "string" },
    },
    required: ["normalized_claim", "myth_id", "match_reasoning"],
  },
};

export async function normalizeAndMatch(
  quote: string,
  myths: Myth[],
): Promise<NormalizationResult> {
  const result = await callClaudeTool<{
    normalized_claim: string;
    myth_id: string;
    match_reasoning: string;
  }>(
    NORMALIZATION_SYSTEM,
    `Aussage aus dem Transkript:\n"""\n${quote}\n"""\n\nBekannte Mythen:\n${formatMythsForPrompt(myths)}`,
    NORMALIZATION_TOOL,
    1024,
  );

  // Guard gegen Halluzinationen: myth_id muss real in der übergebenen Liste stehen.
  const validIds = new Set(myths.map((m) => m.id));
  const myth_id = result.myth_id && validIds.has(result.myth_id) ? result.myth_id : null;

  return {
    normalized_claim: result.normalized_claim,
    myth_id,
    match_reasoning: result.match_reasoning,
  };
}
