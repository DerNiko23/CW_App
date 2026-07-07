import { callClaudeTool, type ToolDefinition } from "../claude/client";
import { CHRIS_STYLE_EXCERPTS } from "./styleReference";
import type { ReactionScript } from "./types";

// MASTERPLAN.md §3.3: Hook (3 Varianten) -> Kernargument -> Analogie -> CTA.
// Studien/Quellen werden bewusst NICHT von Claude generiert, sondern kommen direkt aus
// myths.sources_json (bereits web-verifiziert) - keine Halluzinationsgefahr.
function buildStyleBlock(): string {
  if (CHRIS_STYLE_EXCERPTS.length === 0) {
    return `Kein Transkript-Beispiel hinterlegt. Nutze ersatzweise diesen Ton: direkt,
klar, ohne Fachjargon, mit einer Prise Humor, spricht die Zuschauer per "du" an,
kurze Sätze, keine Konjunktiv-Weichspülerei bei klar widerlegten Mythen.`;
  }
  return CHRIS_STYLE_EXCERPTS.map((excerpt, i) => `Beispiel ${i + 1}:\n"""\n${excerpt}\n"""`).join(
    "\n\n",
  );
}

function buildSystemPrompt(): string {
  return `Du schreibst das halbe Skript für ein Faktencheck-YouTube-Video im Ton von Christian
Wolf ("Chris"), einem deutschsprachigen Ernährungs-/Fitness-Creator, der Falschinformationen
richtigstellt.

STILREFERENZ (imitiere Wortwahl, Satzrhythmus und Tonfall so nah wie möglich):
${buildStyleBlock()}

AUFGABE: Zu einer widerlegten Aussage generierst du:
1. "hooks": genau 3 unterschiedliche Video-Hook-Varianten (die ersten 1-2 Sätze, die zum
   Weiterschauen animieren), jede in Chris' Ton, jede eigenständig nutzbar.
2. "core_argument": das Kernargument in 3-5 Sätzen, warum die Aussage falsch ist - basierend
   ausschließlich auf dem gelieferten Verdict, nichts dazuerfinden.
3. "analogy": eine anschauliche, alltagsnahe Analogie, die den Sachverhalt greifbar macht.
4. "cta": ein kurzer Call-to-Action-Satz (Follow/Kommentar/Diskussion anregen).

Erfinde KEINE Studien, Quellen oder Zahlen, die nicht im Verdict stehen - die Quellen werden
separat aus der Datenbank ergänzt.`;
}

const REACTION_SCRIPT_TOOL: ToolDefinition = {
  name: "generate_reaction_script",
  description: "Generiert Hook-Varianten, Kernargument, Analogie und CTA fuer ein Faktencheck-Video.",
  input_schema: {
    type: "object",
    properties: {
      hooks: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 3,
      },
      core_argument: { type: "string" },
      analogy: { type: "string" },
      cta: { type: "string" },
    },
    required: ["hooks", "core_argument", "analogy", "cta"],
  },
};

export async function generateReactionScript(params: {
  quote: string;
  normalizedClaim: string;
  verdict: string;
}): Promise<Omit<ReactionScript, "generated_at">> {
  const { quote, normalizedClaim, verdict } = params;

  const userMessage = `Falschaussage (wörtliches Zitat aus dem Video): "${quote}"

Normalisierte Aussage: ${normalizedClaim}

Warum das falsch ist (Verdict aus unserer Mythen-Datenbank):
"""
${verdict}
"""`;

  const result = await callClaudeTool<{
    hooks: string[];
    core_argument: string;
    analogy: string;
    cta: string;
  }>(buildSystemPrompt(), userMessage, REACTION_SCRIPT_TOOL, 1536);

  return {
    hooks: result.hooks,
    core_argument: result.core_argument,
    analogy: result.analogy,
    cta: result.cta,
  };
}
