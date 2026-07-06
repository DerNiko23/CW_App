# TASKS – Offene Aufgaben

> Sortiert nach Priorität. ⚠ = kritischer Pfad.

## Morgen (Tag 1, Code-Start) — ✅ Phase 0 abgeschlossen
- [x] ⚠ Projekt-Setup: Next.js + TS + Tailwind + shadcn/ui, live auf Vercel deployed
- [x] ⚠ Supabase-Schema als SQL-Migration angelegt und im Supabase-Projekt ausgeführt (`supabase/migrations/0001_init.sql`)
- [x] ⚠ **Snapshot-Cron live** (`app/api/cron/snapshot` + `vercel.json`) – manuell per `?secret=`-Query-Trigger verifiziert, Antwort wie erwartet
- [x] Passwort-Middleware (`proxy.ts`, HTTP Basic Auth) – Login auf Vercel getestet, funktioniert
- [ ] Mythen-DB: erste 10 Mythen mit Quellen einpflegen (Rest parallel in Phase 1)

## Pipeline (Phase 1)
- [ ] YouTube-Discovery-Modul (Query-Generierung aus Mythen-DB, Quota-Zähler)
- [ ] Transkript-Modul + Skip-Logging
- [ ] Claude-Prompts: Topic Detection, Claim Extraction, Normalisierung (in PROMPTS-Abschnitt des README dokumentieren)
- [ ] Confidence-Logik (4 Checks)
- [ ] Score-Berechnung + `weights`-Tabelle
- [ ] Mythen-DB auf 25–30 Einträge ausbauen

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
