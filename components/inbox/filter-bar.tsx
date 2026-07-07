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
  label,
  paramKey,
  options,
  allLabel,
  defaultValue = "all",
}: {
  label: string;
  paramKey: string;
  options: readonly Option[];
  allLabel: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramKey) ?? defaultValue;
  const items = [{ value: "all", label: allLabel }, ...options];

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
    <div className="flex flex-col gap-1">
      <span className="px-0.5 text-[11px] font-medium text-muted-foreground">{label}</span>
      {/* `items` gibt Select.Value die Label-Zuordnung unabhaengig vom Mount-Status
          der Popup-Liste - ohne das faellt die Anzeige nach dem Schliessen auf den
          rohen `value` zurueck (Base UI Select-Verhalten). */}
      <Select items={items} value={value} onValueChange={handleChange}>
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
    </div>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterSelect
        label="Status"
        paramKey="status"
        options={STATUS_OPTIONS.filter((s) => s.value !== "all")}
        allLabel="Alle Status"
        defaultValue="new"
      />
      <FilterSelect
        label="Plattform"
        paramKey="platform"
        options={PLATFORM_OPTIONS}
        allLabel="Alle Plattformen"
      />
      <FilterSelect label="Thema" paramKey="topic" options={TOPIC_OPTIONS} allLabel="Alle Themen" />
      <FilterSelect
        label="Score-Bereich"
        paramKey="scoreBand"
        options={SCORE_BAND_OPTIONS}
        allLabel="Alle Scores"
      />
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
