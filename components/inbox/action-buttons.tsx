"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REJECT_REASONS, type RejectReason } from "@/lib/inbox/constants";
import { acceptVideo, rejectVideo, markVideoDone } from "@/app/actions";
import type { VideoStatus } from "@/lib/inbox/types";

export function ActionButtons({
  videoId,
  status,
  size = "default",
}: {
  videoId: string;
  status: VideoStatus;
  size?: "sm" | "default";
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function handleAccept() {
    startTransition(async () => {
      await acceptVideo(videoId);
      router.refresh();
    });
  }

  function handleReject(reason: RejectReason) {
    setOpen(false);
    startTransition(async () => {
      await rejectVideo(videoId, reason);
      router.refresh();
    });
  }

  function handleDone() {
    startTransition(async () => {
      await markVideoDone(videoId);
      router.refresh();
    });
  }

  if (status === "new") {
    return (
      <div className="flex items-center gap-2" onClick={stop}>
        <Button
          size={size}
          onClick={handleAccept}
          disabled={isPending}
          className="bg-success text-success-foreground hover:bg-success/85"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Annehmen
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={isPending}
            render={
              <Button size={size} variant="outline" disabled={isPending}>
                <X /> Ablehnen
              </Button>
            }
          />
          <PopoverContent className="w-64" align="end">
            <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
              Grund für Ablehnung
            </p>
            <div className="flex flex-col gap-0.5">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReject(reason)}
                  className="rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  {reason}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div onClick={stop}>
        <Button size={size} onClick={handleDone} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <CircleCheck />}
          Als erledigt markieren
        </Button>
      </div>
    );
  }

  return null;
}
