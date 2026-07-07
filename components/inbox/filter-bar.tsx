"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLATFORM_OPTIONS,
  TOPIC_OPTIONS,
  SCORE_BAND_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/inbox/constants";

type Option = { value: string; label: string };

function FilterSelect({
  paramKey,
  options,
  allLabel,
  defaultValue = "all",
}: {
  paramKey: string;
  options: readonly Option[];
  allLabel: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramKey) ?? defaultValue;

  function handleChange(next: string | null) {
    if (next === null) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultValue) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, next);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        paramKey="status"
        options={STATUS_OPTIONS.filter((s) => s.value !== "all")}
        allLabel="Alle Status"
        defaultValue="new"
      />
      <FilterSelect paramKey="platform" options={PLATFORM_OPTIONS} allLabel="Alle Plattformen" />
      <FilterSelect paramKey="topic" options={TOPIC_OPTIONS} allLabel="Alle Themen" />
      <FilterSelect paramKey="scoreBand" options={SCORE_BAND_OPTIONS} allLabel="Alle Scores" />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          Zurücksetzen
        </button>
      )}
    </div>
  );
}
