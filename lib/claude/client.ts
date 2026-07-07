import { unwrapToolInput } from "../pipeline/toolInput";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

// Erzwungenes Tool-Use statt Freitext-JSON: die Anthropic API validiert/parst die
// Tool-Argumente serverseitig gegen das Schema, statt dass wir rohen Modelltext
// parsen müssen (anfällig für abgeschnittenes/leicht fehlerhaftes JSON bei
// Freitext-Antworten – in der Praxis beobachtet). Gemeinsam genutzt von der
// Discovery-Pipeline (lib/pipeline/claude.ts) und dem Reaktions-Baukasten
// (lib/reaction/claude.ts).
export async function callClaudeTool<T>(
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
