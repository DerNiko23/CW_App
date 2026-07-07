import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/inbox/types";

const STATUS_STYLE: Record<VideoStatus, string> = {
  new: "bg-secondary text-secondary-foreground",
  accepted: "bg-accent/15 text-accent border border-accent/30",
  done: "bg-success/15 text-success border border-success/30",
  rejected: "bg-destructive/10 text-destructive border border-destructive/20",
};

export const STATUS_LABEL: Record<VideoStatus, string> = {
  new: "Neu",
  accepted: "Angenommen",
  done: "Erledigt",
  rejected: "Abgelehnt",
};

export function StatusBadge({
  status,
  className,
}: {
  status: VideoStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// MASTERPLAN.md §3.4: "Erledigt" speist die "Bereits behandelt"-Badge -> Duplicate-Schutz.
export function HandledElsewhereBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap",
        className,
      )}
    >
      <History className="size-3" />
      Bereits behandelt
    </span>
  );
}
