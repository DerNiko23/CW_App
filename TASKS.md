# TASKS – Offene Aufgaben

> Sortiert nach Priorität. ⚠ = kritischer Pfad.

## Morgen (Tag 1, Code-Start)
- [x] ⚠ Projekt-Setup: Next.js + TS + Tailwind + shadcn/ui (Code fertig, gepusht auf GitHub) – Supabase-Projekt anlegen + Vercel-Import bleiben User-Aktion
- [x] ⚠ Supabase-Schema als SQL-Migration fertig (`supabase/migrations/0001_init.sql`) – im SQL Editor ausführen, sobald Supabase-Projekt existiert
- [x] ⚠ **Snapshot-Cron-Route + `vercel.json` deployed** (`app/api/cron/snapshot`) – läuft automatisch täglich, sobald Vercel-Projekt importiert + ENV-Vars gesetzt sind
- [x] Passwort-Middleware (`proxy.ts`, HTTP Basic Auth gegen `AUTH_USERNAME`/`AUTH_PASSWORD`)
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
- [ ] Einreichung via Tally

## E-Book (parallel laufend)
- [ ] ~9 Higgsfield-Bilder generieren + manuell hochladen (Batch)
- [ ] Bilder in PDF v0.5 einbetten, Platzhalter ersetzen
- [ ] Finale Durchsicht: Typos, Seitenumbrüche, Bildqualität
