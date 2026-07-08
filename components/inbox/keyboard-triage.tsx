"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptVideo, rejectVideo, markVideoDone } from "@/app/actions";
import { REJECT_REASONS } from "@/lib/inbox/constants";
import type { VideoStatus } from "@/lib/inbox/types";

type HoveredItem = { id: string; status: VideoStatus } | null;

const HoverContext = createContext<{ setHovered: (item: HoveredItem) => void } | null>(null);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

// Power-User-Shortcuts fuer die tägliche Triage (Kritik P2, 2026-07-08): Zeile
// hovern, dann a=annehmen, 1-4=ablehnen mit Grund, d=erledigt (bei Angenommen).
// Bewusst hover- statt tab-fokus-gebunden - passt zum bestehenden Maus-Workflow,
// ohne eine separate Roving-Tabindex-Navigation einzufuehren.
export function KeyboardTriageProvider({ children }: { children: React.ReactNode }) {
  const hoveredRef = useRef<HoveredItem>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const setHovered = useCallback((item: HoveredItem) => {
    hoveredRef.current = item;
  }, []);

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if (isPending || isTypingTarget(e.target)) return;
      const hovered = hoveredRef.current;
      if (!hovered) return;

      if (e.key === "a" && hovered.status === "new") {
        setIsPending(true);
        try {
          await acceptVideo(hovered.id);
          toast.success("Angenommen");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setIsPending(false);
        }
        return;
      }

      if (e.key === "d" && hovered.status === "accepted") {
        setIsPending(true);
        try {
          await markVideoDone(hovered.id);
          toast.success("Als erledigt markiert");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setIsPending(false);
        }
        return;
      }

      const reasonIndex = ["1", "2", "3", "4"].indexOf(e.key);
      if (reasonIndex !== -1 && hovered.status === "new") {
        const reason = REJECT_REASONS[reasonIndex];
        setIsPending(true);
        try {
          await rejectVideo(hovered.id, reason);
          toast.info(`Abgelehnt: ${reason}`);
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setIsPending(false);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, router]);

  return <HoverContext.Provider value={{ setHovered }}>{children}</HoverContext.Provider>;
}

function useRowHover(id: string, status: VideoStatus) {
  const ctx = useContext(HoverContext);
  if (!ctx) throw new Error("useRowHover must be used within KeyboardTriageProvider");

  return {
    onMouseEnter: () => ctx.setHovered({ id, status }),
    onMouseLeave: () => ctx.setHovered(null),
  };
}

export function TriageRow({
  id,
  status,
  className,
  style,
  children,
}: {
  id: string;
  status: VideoStatus;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const hoverHandlers = useRowHover(id, status);
  return (
    <div className={className} style={style} {...hoverHandlers}>
      {children}
    </div>
  );
}
