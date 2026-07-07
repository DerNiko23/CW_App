import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getInboxItems } from "@/lib/inbox/queries";
import { formatDate, formatTimestamp } from "@/lib/format";
import { STATUS_LABEL } from "@/components/inbox/badges";
import type { InboxItem } from "@/lib/inbox/types";

export const dynamic = "force-dynamic";

// Export der von Chris angenommenen/umgesetzten Videos (ROADMAP.md Phase 4,
// MASTERPLAN §7: "Export (CSV/Markdown der angenommenen Videos)"). "Angenommen" wird hier
// als Angenommen + Erledigt verstanden - beides sind Videos, zu denen Chris sich
// entschieden hat zu reagieren, nur in unterschiedlichen Lebenszyklus-Stufen.

const CSV_HEADER = [
  "Titel",
  "Kanal",
  "Plattform",
  "Status",
  "URL",
  "Zitat",
  "Timestamp",
  "Mythos",
  "Score",
  "Confidence",
  "Views",
  "Angenommen/Erledigt am",
];

function csvCell(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildCsv(items: InboxItem[]): string {
  const rows = items.map((item) =>
    [
      item.video.title,
      item.video.channel ?? "",
      item.video.platform,
      STATUS_LABEL[item.video.status],
      item.video.url,
      item.claim.quote,
      formatTimestamp(item.claim.timestamp_s),
      item.claim.myth?.claim_pattern ?? "",
      String(Math.round(item.score.total)),
      `${Math.round(item.claim.confidence)}%`,
      String(item.views),
      item.video.doneAt ? formatDate(item.video.doneAt) : "",
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM, damit Excel Umlaute in der CSV korrekt als UTF-8 erkennt.
  return "﻿" + [CSV_HEADER.join(","), ...rows].join("\n") + "\n";
}

function buildMarkdown(items: InboxItem[]): string {
  const lines: string[] = ["# Faktencheck-Inbox – Angenommene Videos", ""];

  if (items.length === 0) {
    lines.push("Noch keine angenommenen oder erledigten Videos.");
    return lines.join("\n");
  }

  for (const item of items) {
    lines.push(`## ${item.video.title}`);
    lines.push(
      `- **Kanal:** ${item.video.channel ?? "Unbekannt"} · **Plattform:** ${item.video.platform} · **Status:** ${STATUS_LABEL[item.video.status]}`,
    );
    lines.push(`- **Link:** ${item.video.url}`);
    lines.push(
      `- **Score:** ${Math.round(item.score.total)}/100 · **Confidence:** ${Math.round(item.claim.confidence)}%`,
    );
    if (item.claim.myth) lines.push(`- **Mythos:** ${item.claim.myth.claim_pattern}`);
    if (item.video.doneAt) lines.push(`- **Erledigt am:** ${formatDate(item.video.doneAt)}`);
    lines.push("");
    lines.push(`> ${formatTimestamp(item.claim.timestamp_s)} – „${item.claim.quote}"`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "md" ? "md" : "csv";

  const items = await getInboxItems({ status: ["accepted", "done"] });

  const filenameBase = `faktencheck-inbox-${new Date().toISOString().slice(0, 10)}`;

  if (format === "md") {
    return new NextResponse(buildMarkdown(items), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
      },
    });
  }

  return new NextResponse(buildCsv(items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
