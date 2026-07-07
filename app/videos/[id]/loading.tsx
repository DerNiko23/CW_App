function Block() {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="h-5 w-full animate-pulse rounded bg-muted" />
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
    </section>
  );
}

// Bewusst <div> statt <main> - siehe app/loading.tsx (zwei <main>-Landmarks
// gleichzeitig lassen beim Streaming-SSR-Swap ein leeres Geisterelement zurueck).
export default function VideoDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />

      <header className="flex gap-4">
        <div className="aspect-video w-32 shrink-0 animate-pulse rounded-xl bg-muted sm:w-44" />
        <div className="flex min-w-0 flex-col justify-center gap-2">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </header>

      <Block />
      <Block />
      <Block />
    </div>
  );
}
