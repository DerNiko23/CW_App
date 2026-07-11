import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { FlowFieldBackground } from "@/components/flow-field-background";
import { Flipbook } from "@/components/ebook/flipbook";

export default function EbookPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <FlowFieldBackground durationSeconds={10} />

      <Link
        href="/"
        className="relative z-10 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zurück zur Inbox
      </Link>

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            E-Book
          </p>
          <h1 className="font-heading text-3xl font-semibold text-accent [text-shadow:0_2px_20px_rgba(250,250,250,0.9)] sm:text-4xl">
            Heißhunger
          </h1>
        </div>
        <a
          href="/ebook.pdf"
          download
          className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-accent underline-offset-2 hover:bg-muted hover:underline"
        >
          <Download className="size-3.5" />
          PDF herunterladen
        </a>
      </header>

      <div className="relative z-10">
        <Flipbook />
      </div>
    </main>
  );
}
