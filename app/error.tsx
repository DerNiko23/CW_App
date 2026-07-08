"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function InboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="font-heading text-lg font-medium">Etwas ist schiefgelaufen</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Die Inbox konnte nicht geladen werden. Das kann an einer kurzzeitigen
          Verbindungsstörung zur Datenbank liegen.
        </p>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Erneut versuchen
      </button>
    </main>
  );
}
