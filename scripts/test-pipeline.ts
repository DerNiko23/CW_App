// End-to-End-Test der Discovery-Pipeline mit echten YouTube-Videos.
//
// Usage:
//   npm run pipeline:test -- <youtube-url-1> <youtube-url-2> <youtube-url-3>
//   npm run pipeline:test -- --discover              (echte Discovery statt fixer URLs)
//
// Braucht ANTHROPIC_API_KEY, YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { loadEnvLocal } from "./loadEnv";
loadEnvLocal();

import { createAdminClient } from "../lib/supabase/admin";
import { processVideoByUrl } from "../lib/pipeline/import";
import { runDiscovery } from "../lib/pipeline/discovery";
import type { ProcessVideoResult } from "../lib/pipeline/process";

function printResult(label: string, result: ProcessVideoResult) {
  console.log(`\n${"=".repeat(70)}\n${label}\n${"=".repeat(70)}`);

  if (result.status === "skipped") {
    console.log(`SKIPPED – Grund: ${result.reason}${result.detail ? ` (${result.detail})` : ""}`);
    return;
  }

  console.log(`Video-ID (DB): ${result.videoId}`);
  console.log(`Topic: ${result.topic}  (${result.topicReasoning})`);
  console.log(`\nExtrahierte Claims: ${result.claims.length}`);
  result.claims.forEach((claim, i) => {
    const mm = String(Math.floor(claim.timestamp_s / 60)).padStart(2, "0");
    const ss = String(claim.timestamp_s % 60).padStart(2, "0");
    console.log(`\n  [${i + 1}] ${mm}:${ss} – "${claim.quote}"`);
    console.log(`      Normalisiert: ${claim.normalized_claim}`);
    console.log(
      `      Myth-Match: ${claim.matchedMyth ? claim.matchedMyth.claim_pattern : "kein Match"} (${claim.matchReasoning})`,
    );
    console.log(
      `      Confidence: ${claim.confidence.score}% – Checks: ${JSON.stringify(claim.confidence.checks)}`,
    );
  });

  console.log(`\nBester Claim -> Opportunity Score: ${result.score.total}/100`);
  console.log(
    `  Reach=${result.score.reach.toFixed(1)} Velocity=${result.score.velocity.toFixed(1)}${result.score.velocityIsFallback ? " (Fallback: <2 Snapshots)" : ""} Confidence=${result.score.confidence} Engagement=${result.score.engagement.toFixed(1)} Novelty=${result.score.novelty}`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const supabase = createAdminClient();
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) throw new Error("YOUTUBE_API_KEY fehlt in .env.local");

  if (args.includes("--discover")) {
    console.log("Führe echte Discovery aus (Queries aus Mythen-DB, quota-bewusst)...");
    const summary = await runDiscovery({ supabase, youtubeApiKey, maxSearchesThisRun: 5 });
    console.log(
      `\nQueries verfügbar: ${summary.queriesAvailable}, Suchen durchgeführt: ${summary.searchesPerformed}, gefundene IDs: ${summary.videoIdsFound}, neue IDs: ${summary.videoIdsNew}, Quota heute: ${summary.quotaUsedToday}`,
    );
    summary.results.forEach(({ externalId, result }) => printResult(`https://youtube.com/watch?v=${externalId}`, result));
    return;
  }

  const urls = args.filter((a) => !a.startsWith("--"));
  if (urls.length === 0) {
    console.error("Keine URLs übergeben. Usage: npm run pipeline:test -- <url1> <url2> <url3>");
    process.exit(1);
  }

  for (const url of urls) {
    try {
      const result = await processVideoByUrl({ supabase, youtubeApiKey, url });
      printResult(url, result);
    } catch (err) {
      console.error(`\nFEHLER bei ${url}:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
