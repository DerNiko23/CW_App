import { Download } from "lucide-react";

// MASTERPLAN §7 / ROADMAP Phase 4: Export der angenommenen/erledigten Videos.
// Bewusst reine <a>-Links statt Client-Component: der Browser lädt die Datei
// direkt über die Route (Content-Disposition: attachment), kein JS nötig.
export function ExportLinks() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Download className="size-3.5" />
      <span>Export:</span>
      <a
        href="/api/export?format=csv"
        className="rounded-md px-1.5 py-0.5 font-medium text-accent underline-offset-2 hover:bg-muted hover:underline"
      >
        CSV
      </a>
      <span aria-hidden>·</span>
      <a
        href="/api/export?format=md"
        className="rounded-md px-1.5 py-0.5 font-medium text-accent underline-offset-2 hover:bg-muted hover:underline"
      >
        Markdown
      </a>
    </div>
  );
}
