import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function VideoNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="font-heading text-lg font-medium">Video nicht gefunden</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Dieses Video existiert nicht (mehr) oder wurde bereits aus der Inbox entfernt.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        <ArrowLeft className="size-4" />
        Zurück zur Inbox
      </Link>
    </main>
  );
}
