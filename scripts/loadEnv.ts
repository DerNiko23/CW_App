import { readFileSync } from "node:fs";
import { join } from "node:path";

// Next.js lädt .env.local automatisch; eigenständige Scripts (tsx) nicht.
// Bewusst kein dotenv-Paket (Anti-Overhead-Prinzip) – reicht als simpler Parser.
export function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
