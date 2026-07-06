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
- [ ] Inbox-Liste mit Filtern
- [ ] Accept/Reject + Quick-Reasons
- [ ] Detailseite (3 Blöcke: Aussage / Warum jetzt / Confidence)
- [ ] Reaktions-Baukasten
- [ ] Manueller URL-Import
- [ ] Status-Flow + "Bereits behandelt"-Badge
- [ ] Liste von Chris' ~20 bekanntesten Mythen-Videos recherchieren und in `myths.covered_by_chris` pflegen

## Abschluss (Phase 4–5)
- [ ] 15–20 Demo-Fundstücke kuratieren
- [ ] Export-Funktion
- [ ] Design-Polish (Leer-/Lade-/Fehlerzustände, Animationen, Mobile)
- [ ] Loom-Skript schreiben (Narrativ: Pipeline ist das Produkt)
- [ ] `CRON_SECRET` vor der finalen Einreichung rotieren (aktueller Wert war zum manuellen Testen per Browser-URL sichtbar)
- [ ] Einreichung via Tally

## E-Book (parallel laufend)
- [ ] ~9 Higgsfield-Bilder generieren + manuell hochladen (Batch)
- [ ] Bilder in PDF v0.5 einbetten, Platzhalter ersetzen
- [ ] Finale Durchsicht: Typos, Seitenumbrüche, Bildqualität
