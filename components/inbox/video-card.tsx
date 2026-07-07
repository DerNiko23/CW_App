import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { ScoreBadge } from "./score-badge";
import { StatusBadge, HandledElsewhereBadge } from "./badges";
import { ActionButtons } from "./action-buttons";
import { formatTimestamp } from "@/lib/format";
import { topicLabel } from "@/lib/inbox/constants";
import type { InboxItem } from "@/lib/inbox/types";

export function VideoCard({ item, priority = false }: { item: InboxItem; priority?: boolean }) {
  const { video, claim, score, alreadyHandledElsewhere } = item;
  const showActions = video.status === "new" || video.status === "accepted";

  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card transition-shadow duration-200 hover:shadow-[0_8px_30px_-12px_oklch(0.2_0.02_50_/_25%)]">
      <Link href={`/videos/${video.id}`} className="block">
        <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
          <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt=""
                fill
                priority={priority}
                sizes="(max-width: 640px) 112px, 160px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-5" />
              </div>
            )}
            <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {formatTimestamp(claim.timestamp_s)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {video.channel ?? "Unbekannter Kanal"}
                </p>
                <h3 className="line-clamp-1 font-display text-sm font-semibold text-foreground sm:text-base">
                  {video.title}
                </h3>
              </div>
              <ScoreBadge score={score.total} size="sm" showLabel={false} className="shrink-0" />
            </div>

            <blockquote className="mt-2 line-clamp-2 font-serif text-[15px] leading-snug text-foreground/90 italic sm:text-base">
              „{claim.quote}“
            </blockquote>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {Math.round(claim.confidence)}% Confidence
              </span>
              <span aria-hidden>·</span>
              <span>{topicLabel(claim.topic)}</span>
              {alreadyHandledElsewhere && <HandledElsewhereBadge />}
              {video.status !== "new" && <StatusBadge status={video.status} />}
            </div>
          </div>
        </div>
      </Link>

      {showActions && (
        <div className="flex justify-end border-t border-border/70 px-4 py-2.5 sm:px-5">
          <ActionButtons videoId={video.id} status={video.status} size="sm" />
        </div>
      )}
    </article>
  );
}
