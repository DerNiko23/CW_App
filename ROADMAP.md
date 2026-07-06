# ROADMAP – Faktencheck-Inbox

> Stand: 05.07.2026 · Konzept final · Code-Start: 06.07.2026
> Prinzip: Demo-First. Jede Funktion wird so gebaut, dass sie beim ersten Öffnen sofort beeindruckt.

---

## Phase 0 – Setup (0,5 Tage)
- [ ] Next.js (App Router) + TypeScript + Tailwind + shadcn/ui aufsetzen
- [ ] Supabase-Projekt anlegen, Schema aus MASTERPLAN §7 migrieren
- [ ] Vercel-Deploy von `main` (Auto-Deploy, kein CI-Overhead)
- [ ] ENV-Setup: YouTube API Key, Claude API Key, Supabase Keys (nie im Repo)
- [ ] Passwort-Schutz (Middleware, ein User)

**⚠ Sofort am Tag 1 (kritischer Pfad):**
- [ ] **Snapshot-Cron live schalten** (Vercel Cron → Views/Likes/Comments täglich in `snapshots`). Jeder Tag Verzögerung = ein Tag weniger echte Velocity-Daten bei der Einreichung.

## Phase 1 – Pipeline-Kern (2–3 Tage) ← DAS Produkt
- [ ] YouTube Discovery: Suchqueries aus Mythen-DB generieren, quota-bewusst (Budget: 10.000 Units/Tag; search.list = 100 Units → max. ~60–80 Suchen/Tag einplanen, Rest für videos.list/commentThreads)
- [ ] Transkript-Abruf (youtube-transcript, Fallback: kein Transkript → Video überspringen und loggen)
- [ ] Topic Detection (Claude): Deutsch + Ernährung/Fitness/Gesundheit, sonst raus
- [ ] Claim Extraction (Claude): wörtliches Zitat + Timestamp
- [ ] Claim-Normalisierung + Matching gegen Mythen-DB
- [ ] Confidence-Berechnung (4 ehrliche Checks, MASTERPLAN §3.2C)
- [ ] Opportunity Score (gewichtete Summe, Gewichte aus `weights`-Tabelle)
- [ ] Mythen-DB initial befüllen: 25–30 Mythen inkl. der 5 Beispiele aus der Ausschreibung, je 2–3 seriöse Quellen (Meta-Analysen bevorzugt)

## Phase 2 – Inbox & Detailansicht (2 Tage)
- [ ] Inbox: Karten, Score-Badge, Confidence, Filter (Plattform/Thema/Score/Status)
- [ ] Accept / Reject mit Quick-Reasons
- [ ] Detailansicht: Falschaussage + Timestamp, "Warum jetzt reagieren?"-Panel, Confidence-Checkliste
- [ ] Status-Flow: Neu → Angenommen → Erledigt (+ "Bereits behandelt"-Badge)
- [ ] Responsive: Mobile-Layout explizit testen (Pflicht laut Ausschreibung)

## Phase 3 – Reaktions-Baukasten & Adaptive Ranking (1,5 Tage)
- [ ] Ein-Klick-Generierung: Hook (3 Varianten) → Argument → Quellen → Analogie → CTA, alles kopierbar
- [ ] Ton-Kalibrierung: Prompt mit 3–4 Transkript-Ausschnitten von Chris als Stil-Referenz
- [ ] Adaptive Ranking: Reject-Reasons → Gewichts-Adjustments in `weights`
- [ ] Manueller URL-Import (YouTube-URL → volle Pipeline)

## Phase 4 – Demo-Daten & Polish (1,5 Tage)
- [ ] 15–20 echte Fundstücke kuratieren (durch echte Pipeline gelaufen), Inbox vorbefüllen
- [ ] Export (CSV/Markdown der angenommenen Videos)
- [ ] Design-Feinschliff: Animationen, Leerzustände, Ladezustände, Fehlerzustände
- [ ] Mobile-Endabnahme, Performance-Check (Ladezeit Inbox < 1,5 s)

## Phase 5 – Einreichung (1 Tag)
- [ ] Loom-Video: Narrativ "Die Pipeline ist das Produkt", ehrliche Plattform-Aussage (MASTERPLAN §5)
- [ ] Zugangsdaten dokumentieren
- [ ] E-Book-PDF-Link + App-Link + Tally-Formular

**Gesamtschätzung: 8–9 Arbeitstage** (parallel: E-Book-Bilder finalisieren)

---

## Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| YouTube-Quota erschöpft | Query-Budget pro Tag, Caching in Supabase, Discovery-Läufe batchen |
| Videos ohne Transkript | Überspringen + loggen; Anteil beobachten, ggf. Whisper als Fallback (IDEAS) |
| Claim fälschlich geflaggt (False Positive) | Confidence-Schwelle: unter 70 % gar nicht erst in die Inbox |
| Velocity-Daten zu dünn am Demo-Tag | Cron ab Tag 1; Fallback-Anzeige "Views gesamt" wenn < 2 Snapshots |
| Claude-API-Kosten | Transkripte auf relevante Segmente kürzen, Batch-Verarbeitung |
