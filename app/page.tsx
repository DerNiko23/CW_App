import Link from "next/link";
import { Inbox } from "lucide-react";
import { getInboxItems } from "@/lib/inbox/queries";
import { parseListParam } from "@/lib/inbox/filter-params";
import { VideoCard } from "@/components/inbox/video-card";
import { FilterBar } from "@/components/inbox/filter-bar";
import { UrlImportForm } from "@/components/inbox/url-import-form";
import { ExportLinks } from "@/components/inbox/export-links";
import { AutoSearchButton } from "@/components/inbox/auto-search-button";
import { KeyboardTriageProvider, TriageRow } from "@/components/inbox/keyboard-triage";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const items = await getInboxItems({
    status: parseListParam(first(resolvedSearchParams.status), ["new"]),
    platform: parseListParam(first(resolvedSearchParams.platform)),
    topic: parseListParam(first(resolvedSearchParams.topic)),
    scoreBand: parseListParam(first(resolvedSearchParams.scoreBand)),
  });
  const hasActiveFilters = Object.keys(resolvedSearchParams).length > 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-semibold text-accent sm:text-4xl">
          Factcheck Inbox
        </h1>
        <ExportLinks />
      </header>

      <UrlImportForm />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar />
        <AutoSearchButton />
      </div>

      {items.length === 0 ? (
        <div className="animate-in fade-in flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-24 text-center duration-500">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="font-heading text-lg font-medium">Keine Videos für diese Filter</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Passe die Filter an, um mehr Videos zu sehen."
              : "Nutze Auto-Search oben, um neue Fundstücke zu sammeln."}
          </p>
          {hasActiveFilters && (
            <Link href="/" className="text-sm font-medium text-accent hover:underline">
              Filter zurücksetzen
            </Link>
          )}
        </div>
      ) : (
        <KeyboardTriageProvider>
          <div className="flex flex-col divide-y divide-border">
            {items.map((item, index) => (
              <TriageRow
                key={item.video.id}
                id={item.video.id}
                status={item.video.status}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <VideoCard item={item} priority={index < 3} />
              </TriageRow>
            ))}
          </div>
        </KeyboardTriageProvider>
      )}
    </main>
  );
}
