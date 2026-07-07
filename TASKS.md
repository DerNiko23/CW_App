# TASKS – Offene Aufgaben

> Sortiert nach Priorität. ⚠ = kritischer Pfad.

## Morgen (Tag 1, Code-Start) — ✅ Phase 0 abgeschlossen
- [x] ⚠ Projekt-Setup: Next.js + TS + Tailwind + shadcn/ui, live auf Vercel deployed
- [x] ⚠ Supabase-Schema als SQL-Migration angelegt und im Supabase-Projekt ausgeführt (`supabase/migrations/0001_init.sql`)
- [x] ⚠ **Snapshot-Cron live** (`app/api/cron/snapshot` + `vercel.json`) – manuell per `?secret=`-Query-Trigger verifiziert, Antwort wie erwartet
- [x] Passwort-Middleware (`proxy.ts`, HTTP Basic Auth) – Login auf Vercel getestet, funktioniert
- [x] Mythen-DB: 32 Mythen mit Quellen eingepflegt (siehe Phase 1)

## Pipeline (Phase 1) — ✅ abgeschlossen, live getestet
- [x] YouTube-Discovery-Modul (Query-Generierung aus Mythen-DB, Quota-Zähler) – `lib/pipeline/discovery.ts`, `youtube.ts`, `quota.ts`
- [x] Transkript-Modul + Skip-Logging – `lib/pipeline/transcript.ts` (`youtube-transcript`), Skips in `discovery_log` (Migration 0002)
- [x] Claude-Prompts: Topic Detection, Claim Extraction, Normalisierung (in PROMPTS-Abschnitt des README dokumentiert) – `lib/pipeline/claude.ts`, per erzwungenem Tool-Use
- [x] Confidence-Logik (4 Checks) – `lib/pipeline/confidence.ts`, 5 Unit-Tests grün
- [x] Score-Berechnung + `weights`-Tabelle – `lib/pipeline/score.ts`, 13 Unit-Tests grün
- [x] Mythen-DB auf 32 Einträge ausgebaut (Migration `0003_myths_seed.sql`, Quellen web-verifiziert), inkl. aller 5 Beispiele aus der Ausschreibung (Honig macht nicht dick / Datteln enthalten keinen Zucker / Frühstück ist die wichtigste Mahlzeit / Süßstoffe sind ungesund / Kohlenhydrate am Abend machen dick)
- [x] **End-to-End-Test mit echten YouTube-Videos** – mehrere Discovery-Läufe gegen die echte YouTube-/Claude-/Supabase-Infrastruktur, siehe CHANGELOG für Details und gefundene/gefixte Bugs. 39 Videos, 92 Claims (37 gematcht), inkl. korrektem Skip+Log (no_transcript/off_topic/no_claims) und Confidence-Threshold-Wirkung in echten Daten beobachtet.

## UI (Phase 2–3)
- [x] Inbox-Liste mit Filtern (Plattform/Thema/Score-Bereich/Status als URL-Params) – `app/page.tsx`, `components/inbox/filter-bar.tsx`
- [x] Accept/Reject + Quick-Reasons – `app/actions.ts`, `components/inbox/action-buttons.tsx`, Popover mit den 4 Gründen aus MASTERPLAN §3.1
- [x] Detailseite (3 Blöcke: Aussage / Warum jetzt / Confidence) – `app/videos/[id]/page.tsx`
- [x] Reaktions-Baukasten (Hook ×3, Kernargument, Quellen aus Mythen-DB, Analogie, CTA, alles einzeln + gesamt kopierbar) – `lib/reaction/`, `components/inbox/reaction-builder.tsx`, live mit 2 echten Videos getestet (siehe CHANGELOG)
- [x] Manueller URL-Import – UI-Formular `components/inbox/url-import-form.tsx` auf der Inbox (Backend existierte bereits aus Phase 1)
- [x] Adaptive Ranking (MASTERPLAN §3.5) – Reject-Grund passt `weights`-Tabelle an bzw. markiert Mythos als abgedeckt (`lib/ranking/adaptive.ts`)
- [x] Status-Flow (Neu→Angenommen→Erledigt) + "Bereits behandelt"-Badge – live mit echten Daten getestet (siehe CHANGELOG)
- [x] Liste von Chris' ~20 bekanntesten Mythen-Videos recherchieren und in `myths.covered_by_chris` pflegen – 1 echter Fund durch die Pipeline selbst (Datteln-Mythos, Chris' eigener Kanal), gepflegt inkl. `chris_video_url`. Die vollständige ~20er-Liste bleibt offen (siehe Bewertung MASTERPLAN §8).

## Abschluss (Phase 4–5)
- [x] Demo-Fundstücke kuratieren – 13 statt der geplanten 15–20 (10 in "Neu", 1 "Angenommen", 2 "Erledigt"); nach striktem Zitat-Check kleiner als geplant, siehe CHANGELOG für Details/Begründung.
- [x] Export-Funktion (CSV + Markdown, `app/api/export/route.ts`)
- [x] Design-Polish (Leer-/Lade-/Fehlerzustände, Animationen, Mobile) – `app/loading.tsx`, `app/videos/[id]/loading.tsx`, `app/error.tsx`, `app/videos/[id]/not-found.tsx` neu; Karten-Fade-in-Animation; Mobile (375px) und Ladezeit (<400ms) live geprüft, siehe CHANGELOG für den dabei gefundenen/gefixten Doppel-`<main>`-Bug.
- [x] Code-Review über die gesamte Projekthistorie (8 Review-Winkel, Commit 2cf8ed6 bis heute) – 6 echte Bugs/Regeln-Verstöße gefunden und gefixt, 2 Kandidaten nach Prüfung verworfen, 2 bewusst zurückgestellt (Details/Begründung in CHANGELOG).
- [x] ⚠ **Reaktions-Baukasten-Fehler auf Vercel** – Root Cause via `vercel logs` gefunden:
  `ANTHROPIC_API_KEY` fehlte in Vercel Production/Preview-ENV (nur lokal gesetzt). Hinzugefügt
  + redeployed + live auf `cw-app-eosin.vercel.app` mit echtem Basic-Auth-Login verifiziert
  (Skript generiert sich jetzt fehlerfrei). Details in CHANGELOG.
- [x] Design-Redesign (weg vom "KI-generiert"-Look): neues Token-System (Off-White/Fast-Schwarz,
  Deep-Teal-Akzent, echte Ampel-Logik, scharfe Radien, Inter+Space-Grotesk-Typografie) auf allen
  3 Views angewendet. Dabei einen latenten Bug gefunden+gefixt (`font-display` war nie eine echte
  Tailwind-Utility). Details in CHANGELOG.
- [x] ⚠ **Detailseite blieb auf Production im Lade-Skeleton hängen** – gezielt gegen die echte
  Vercel-URL getestet (Hard-Reload, echter Chrome-Browser): 2 von 3 Versuchen blieben dauerhaft
  hängen. Root Cause: Bitdefender-Erweiterung interferiert mit Reacts Streaming-Suspense-Reveal
  (gleiches Muster wie der Phase-2-Bug). Fix: `app/videos/[id]/loading.tsx` entfernt (Seite
  blockiert jetzt bis fertig statt einen hängenbleiben-fähigen Fallback zu streamen). Details in
  CHANGELOG.
- [ ] Loom-Skript schreiben (Narrativ: Pipeline ist das Produkt)
- [ ] `CRON_SECRET` vor der finalen Einreichung rotieren (aktueller Wert war zum manuellen Testen per Browser-URL sichtbar)
- [x] `AUTH_PASSWORD` ist in Vercel Production bereits ein echtes Passwort (nicht mehr `test-local-only`) – beim Nachtesten entdeckt, nur der Haken hatte noch gefehlt
- [ ] Einreichung via Tally

## E-Book (parallel laufend)
- [ ] ~9 Higgsfield-Bilder generieren + manuell hochladen (Batch)
- [ ] Bilder in PDF v0.5 einbetten, Platzhalter ersetzen
- [ ] Finale Durchsicht: Typos, Seitenumbrüche, Bildqualität
