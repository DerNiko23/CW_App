"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { parseListParam, serializeListParam } from "@/lib/inbox/filter-params";
import {
  PLATFORM_OPTIONS,
  TOPIC_OPTIONS,
  SCORE_BAND_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/inbox/constants";

type Option = { value: string; label: string };

function FilterGroup({
  label,
  paramKey,
  options,
  defaultValue = [],
}: {
  label: string;
  paramKey: string;
  options: readonly Option[];
  defaultValue?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const applied = parseListParam(searchParams.get(paramKey) ?? undefined, defaultValue);
  const [pending, setPending] = useState(applied);
  const isActive = applied.length > 0 && applied.join(",") !== defaultValue.join(",");

  function handleOpenChange(next: boolean) {
    // Beim Oeffnen immer auf den zuletzt tatsaechlich angewendeten Stand zuruecksetzen - sonst
    // zeigt ein ohne "Anwenden" geschlossenes Panel beim naechsten Oeffnen einen veralteten,
    // nie uebernommenen Zwischenstand.
    if (next) setPending(applied);
    setOpen(next);
  }

  function toggle(value: string) {
    setPending((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function handleApply() {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeListParam(pending);
    if (serialized) {
      params.set(paramKey, serialized);
    } else {
      params.delete(paramKey);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "gap-1 border-white/40 bg-white/20 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md hover:bg-white/30",
              open
                ? "border-2 border-accent px-[7px]"
                : isActive && "border-accent/40 text-accent",
            )}
          >
            {label}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto min-w-72 rounded-[12px] p-4">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={pending.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <Button onClick={handleApply} className="mt-4 w-fit">
          Anwenden
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="px-0.5 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase [text-shadow:0_2px_20px_rgba(250,250,250,0.9)]">
        Filtern
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          paramKey="status"
          options={STATUS_OPTIONS.filter((s) => s.value !== "all")}
          defaultValue={["new"]}
        />
        <FilterGroup label="Plattform" paramKey="platform" options={PLATFORM_OPTIONS} />
        <FilterGroup label="Thema" paramKey="topic" options={TOPIC_OPTIONS} />
        <FilterGroup label="Score" paramKey="scoreBand" options={SCORE_BAND_OPTIONS} />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
