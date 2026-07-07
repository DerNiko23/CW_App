function CardSkeleton() {
  return (
    <div className="flex gap-4 rounded-3xl border border-border bg-card p-4 sm:gap-5 sm:p-5">
      <div className="aspect-video w-28 shrink-0 animate-pulse rounded-xl bg-muted sm:w-40" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// Bewusst <div> statt <main>: Next.js rendert diesen Suspense-Fallback UND die
// echte Seite (die selbst ein <main> hat) - zwei <main>-Landmarks gleichzeitig
// haetten bei der Streaming-SSR (App Router, force-dynamic) dazu gefuehrt, dass
// der leere Fallback-Knoten nach dem Swap als Geisterelement im DOM haengen
// bleibt (per preview_eval live nachgestellt: 2x <main> statt 1x).
export default function InboxLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-1">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
      </header>

      <div className="h-11 w-full animate-pulse rounded-2xl bg-muted/70" />
      <div className="flex gap-2">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/70" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
