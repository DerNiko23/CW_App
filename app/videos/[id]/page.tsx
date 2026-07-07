import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { getInboxItem } from "@/lib/inbox/queries";
import { buildScoreBullets } from "@/lib/inbox/scoreBullets";
import { ScoreBadge } from "@/components/inbox/score-badge";
import { ConfidenceChecklist } from "@/components/inbox/confidence-checklist";
import { StatusBadge, HandledElsewhereBadge } from "@/components/inbox/badges";
import { ActionButtons } from "@/components/inbox/action-buttons";
import { ReactionBuilder } from "@/components/inbox/reaction-builder";
import { formatDate, formatTimestamp } from "@/lib/format";
import { topicLabel } from "@/lib/inbox/constants";

export const dynamic = "force-dynamic";

function youtubeTimestampUrl(url: string, seconds: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("t", `${Math.max(0, Math.round(seconds))}s`);
    return parsed.toString();
  } catch {
    return url;
  }
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getInboxItem(id);
  if (!item) notFound();

  const { video, claim, score, alreadyHandledElsewhere } = item;
  const bullets = buildScoreBullets(item);
  const showActions = video.status === "new" || video.status === "accepted";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zurück zur Inbox
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-44">
            {video.thumbnail && (
              <Image
                src={video.thumbnail}
                alt=""
                fill
                priority
                sizes="176px"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1.5">
            <p className="text-xs text-muted-foreground">
              {video.channel ?? "Unbekannter Kanal"} · {formatDate(video.publishedAt)}
            </p>
            <h1 className="font-heading text-lg font-semibold text-balance sm:text-xl">
              {video.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={video.status} />
              {alreadyHandledElsewhere && <HandledElsewhereBadge />}
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline"
              >
                Original ansehen <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex justify-end border-t border-border pt-4">
            <ActionButtons videoId={video.id} status={video.status} />
          </div>
        )}
      </header>

      {/* Block A: Die Falschaussage */}
      <section className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Die Falschaussage
        </h2>
        <blockquote className="border-l-[3px] border-accent py-1 pl-5 text-xl leading-snug font-medium text-foreground sm:text-2xl">
          <span aria-hidden className="mr-0.5 font-heading text-accent">
            „
          </span>
          {claim.quote}
          <span aria-hidden className="ml-0.5 font-heading text-accent">
            “
          </span>
        </blockquote>
        <a
          href={youtubeTimestampUrl(video.url, claim.timestamp_s)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          {formatTimestamp(claim.timestamp_s)} im Video ansehen
        </a>
        {item.otherClaimsCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="size-3.5" />
            {item.otherClaimsCount} weitere{" "}
            {item.otherClaimsCount === 1 ? "Aussage wurde" : "Aussagen wurden"} in diesem Video
            erkannt.
          </p>
        )}
      </section>

      {/* Block B: Warum jetzt reagieren? */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Warum jetzt reagieren?
        </h2>
        <div className="flex items-center gap-4">
          <ScoreBadge score={score.total} size="lg" />
          <p className="font-heading text-sm text-muted-foreground">
            Opportunity Score
            <br />
            <span className="text-foreground">{topicLabel(claim.topic)}</span>
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Block C: Confidence-Checkliste */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Confidence
        </h2>
        <ConfidenceChecklist confidence={claim.confidence} checks={claim.checks} />

        {claim.myth && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gematchter Mythos</p>
              <p className="font-heading text-sm font-medium">{claim.myth.claim_pattern}</p>
            </div>
            <p className="text-sm text-foreground/85">{claim.myth.verdict}</p>
            {claim.myth.sources.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Quellen</p>
                <ul className="flex flex-col gap-1">
                  {claim.myth.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent underline-offset-2 hover:underline"
                      >
                        {source.title} <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MASTERPLAN.md §3.3: Reaktions-Baukasten, nur bei Angenommen/Erledigt sichtbar. */}
      {(video.status === "accepted" || video.status === "done") && claim.myth && (
        <ReactionBuilder
          videoId={video.id}
          initialScript={video.reactionScript}
          sources={claim.myth.sources}
        />
      )}
    </main>
  );
}
