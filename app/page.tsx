import { Inbox } from "lucide-react";
import { getInboxItems } from "@/lib/inbox/queries";
import { VideoCard } from "@/components/inbox/video-card";
import { FilterBar } from "@/components/inbox/filter-bar";
import { UrlImportForm } from "@/components/inbox/url-import-form";

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
    status: first(resolvedSearchParams.status),
    platform: first(resolvedSearchParams.platform),
    topic: first(resolvedSearchParams.topic),
    scoreBand: first(resolvedSearchParams.scoreBand),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">
          Faktencheck-Inbox
        </p>
        <h1 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
          Lohnt es sich, dazu heute ein Video aufzunehmen?
        </h1>
      </header>

      <UrlImportForm />

      <FilterBar />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-24 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="font-display text-lg font-medium">Keine Videos für diese Filter</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Passe die Filter an oder starte einen Discovery-Lauf, um neue Fundstücke zu sammeln.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <VideoCard key={item.video.id} item={item} priority={index < 3} />
          ))}
        </div>
      )}
    </main>
  );
}
