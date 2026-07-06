# CHANGELOG

## [2026-07-06] Phase 1 – Discovery-Pipeline live getestet, 2 Bugs gefixt

### Live-Test-Ergebnis (echte YouTube-/Claude-/Supabase-Infrastruktur)
Mehrere `npm run pipeline:test -- --discover`-Läufe (echte Discovery, keine kuratierten URLs):
**39 Videos verarbeitet, 92 Claims extrahiert, 37 davon gegen einen Mythos gematcht.**
Alle Pipeline-Stufen mit echten Daten beobachtet: Discovery (Queries aus Mythen-DB, Quota
sauber gezählt: 2004/10.000 Units verbraucht), Transkript-Skip+Log (`no_transcript` einmal
ausgelöst), Topic-Detection-Skip+Log (`off_topic` zweimal korrekt ausgelöst, u. a. ein
portugiesisches Video), `no_claims`-Skip mehrfach, Claim-Extraction mit korrektem
Timestamp+Zitat, Normalisierung+Matching (u. a. mehrfach korrekt gegen "Kohlenhydrate nach
18 Uhr machen dick" und "Honig macht nicht dick" gematcht), Confidence 50 % bei Aussagen ohne
Mythos-Match vs. 100 % bei klar gematchten Mythen (Threshold von 70 % wirkt wie in ROADMAP.md
vorgesehen), Opportunity Score mit Velocity-Fallback (alle Videos frisch entdeckt, < 2
Snapshots).

### 2 Bugs beim Live-Test gefunden und gefixt
1. **Freitext-JSON von Claude gelegentlich abgeschnitten/fehlerhaft** (`normalizeAndMatch`
   crashte bei langem Mythen-Kontext im Prompt). Root-Cause-Fix statt Pflaster: alle 3
   Claude-Aufrufe auf erzwungenes Tool-Use (`tool_choice`) umgestellt – die API validiert/parst
   serverseitig gegen ein Schema statt rohen Modelltext zu parsen. `lib/pipeline/json.ts`
   (Freitext-Parser) und dessen Tests entfernt, da danach ungenutzt.
2. **Tool-Use-Antworten mit Array-Property reproduzierbar doppelt kodiert**: die API lieferte
   bei `extract_claims` das komplette Argument-Objekt als JSON-String verpackt in einem
   einzelnen Feld, statt strukturierter Felder (reproduzierbar unabhängig von `maxItems` oder
   zusätzlichen Sibling-Properties) – führte dazu, dass 13/13 echte Videos fälschlich als
   "keine Aussage gefunden" geskippt wurden. Fix: `lib/pipeline/toolInput.ts`
   (`unwrapToolInput`) erkennt und entpackt diesen Fall generisch, ohne normale String-Felder
   (UUIDs, Sätze) anzufassen; 4 Unit-Tests.
- max_tokens für alle 3 Prompts erhöht (Topic 256→512, Claim Extraction 1024→2048,
  Normalisierung 512→1024) als zusätzliche Absicherung gegen Abschneiden.

### Gebaut
- Vollständige Pipeline in `lib/pipeline/`: YouTube-Suche+Quota (`youtube.ts`, `quota.ts`), Transkript-Abruf mit Skip+Log (`transcript.ts`, `discoveryLog.ts`), 3 Claude-Prompts für Topic Detection/Claim Extraction/Normalisierung+Matching (`claude.ts`, dokumentiert in README), Confidence (`confidence.ts`, nur die 4 ehrlichen Checks), Opportunity Score (`score.ts`, gewichtete Summe aus `weights`-Tabelle), Novelty-Check (`novelty.ts`), Orchestrierung für Discovery-Läufe und manuellen URL-Import (`discovery.ts`, `import.ts`, `process.ts`).
- Neue Routen: `app/api/cron/discover` (quota-bewusste Discovery, `CRON_SECRET`-geschützt wie der Snapshot-Cron) und `app/api/pipeline/import` (manueller URL-Import, über `proxy.ts` Basic-Auth-geschützt).
- Migrationen `0002_pipeline_support.sql` (`discovery_log`, `youtube_quota_usage`, `myths.search_queries`) und `0003_myths_seed.sql` (32 Mythen mit web-verifizierten Quellen, Meta-Analysen bevorzugt; inkl. aller 5 vom User bestätigten Beispiele aus der Ausschreibung).
- 26 Unit-Tests (Node-Test-Runner via `tsx`, `npm test`) für die reinen Logik-Funktionen (Confidence, Score-Normalisierung, Velocity-Berechnung, Novelty, Tool-Input-Unwrap) – alle grün, TDD-first geschrieben.
- End-to-End-Test-Script `scripts/test-pipeline.ts` (`npm run pipeline:test -- <url1> <url2> <url3>` oder `--discover`).

### Entschieden
- Confidence-Score als Summe von je 25 Punkten pro bestandenem Check (0/25/50/75/100) statt künstlich präziser Prozentwerte – ehrlicher, da nur 4 diskrete Checks existieren.
- Confidence-Check "Thema: Ernährung" ist strenger als das allgemeine Topic-Gate (Fitness/Gesundheit passieren die Pipeline, zählen aber nicht als Chris' Kernthema für diesen Check).
- Reach/Velocity log-normalisiert (Caps: 10 Mio. Views bzw. 200k Views/24h = 100 Punkte) statt linear – lineare Skalen hätten bei den üblichen Größenordnungsunterschieden fast binär gewirkt.
- Velocity-Fallback bei < 2 Snapshots: Reach-Wert wird übernommen statt 0 (vermeidet künstliches Kill eines neuen Videos allein wegen fehlender Historie).
- Skip+Log (kein Transkript / themenfremd / keine Aussage) schreibt bewusst keinen `videos`-Eintrag – diese Fälle werden nie Inbox-Kandidaten.
- Claim-Verbatim-Check vertraut Claude nicht, sondern verifiziert das Zitat programmatisch gegen den Transkripttext (Halluzinations-Schutz).
- Mythen-DB-Inhalte per 3 parallelen Recherche-Agents mit Web-Suche zusammengestellt statt aus dem Trainingswissen fabriziert, um echte, verifizierbare Quellen (keine erfundenen DOIs/Links) sicherzustellen.

### Nachgetragen
- User hat die 5 Beispiele aus der Ausschreibung bestätigt (Honig macht nicht dick, Datteln enthalten keinen Zucker, Frühstück ist die wichtigste Mahlzeit, Süßstoffe sind ungesund, Kohlenhydrate am Abend machen dick) – alle 5 mit web-verifizierten Quellen in `0003_myths_seed.sql` ergänzt (32 Mythen gesamt). "Süßstoffe sind ungesund" bewusst nuanciert verifiziert (nicht plattes Debunking): EFSA hält zugelassene Süßstoffe innerhalb der ADI für sicher, WHO rät seit 2023 dennoch von Süßstoffen zur Gewichtskontrolle ab, NutriNet-Santé-Kohortenstudie (BMJ 2022) fand erhöhtes CVD-Risiko bei hohem Konsum – Studienlage ehrlich als differenziert dargestellt statt einseitig.

### Offen
- Discovery-Cron (`app/api/cron/discover`) ist bewusst noch nicht in `vercel.json` eingetragen – jeder automatische Lauf kostet YouTube-Quota + Claude-API-Kosten, das sollte der User bewusst aktivieren (Cadence-Entscheidung offen).
- 39 Videos/92 Claims aus den Live-Test-Läufen liegen jetzt in der DB (echte Daten, kein Testmüll) – können als Grundlage für die Phase-4-Demo-Kuratierung (15–20 Fundstücke) mitgenutzt werden.

---

## [2026-07-06] Phase 0 abgeschlossen – Live-Verifikation

### Verifiziert
- App live auf Vercel, Passwort-Login (`proxy.ts` Basic Auth) im Browser getestet – funktioniert.
- Snapshot-Cron manuell über neuen `?secret=`-Query-Trigger auf `/api/cron/snapshot` ausgelöst (zusätzlich zum automatischen Bearer-Header-Weg für Vercel Cron) – Antwort wie erwartet.
- Damit ist Phase 0 (ROADMAP.md) vollständig abgeschlossen; Cron sammelt ab sofort täglich Velocity-Daten, auch ohne auf die geplante Uhrzeit zu warten.

### Nachgetragen
- Neuer Task in TASKS.md (Abschluss/Phase 4–5): `CRON_SECRET` vor der finalen Einreichung rotieren, da der aktuelle Wert beim manuellen Testen in der Browser-URL sichtbar war.

---

## [2026-07-06] Phase 0 – Setup & Snapshot-Cron live

### Entschieden
- Next.js-Scaffold in leerem Unterordner erzeugt (create-next-app akzeptiert keinen Ordnernamen mit Großbuchstaben/nicht-leere Verzeichnisse), danach eine Ebene hochgezogen – Konzeptdokumente blieben unangetastet erhalten.
- Next.js 16 installiert (aktuellste Version): `middleware.ts` heißt dort `proxy.ts` (`export function proxy`) – Umbenennung übernommen statt der veralteten Middleware-Konvention.
- Supabase-Schema als reine SQL-Datei (`supabase/migrations/0001_init.sql`) zum Einfügen im SQL Editor – kein Supabase-CLI-Linking (Anti-Overhead-Prinzip).
- RLS auf allen Tabellen aktiviert, bewusst ohne Policies: Zugriff ausschließlich serverseitig über den Supabase Service-Role-Key, da Ein-Nutzer-App ohne Supabase-Auth.
- Passwort-Schutz als HTTP Basic Auth in `proxy.ts` (kein eigener Login-Flow) – Cron-Route ist vom Matcher ausgenommen und hat stattdessen einen eigenen `CRON_SECRET`-Check (Vercel setzt den Bearer-Header automatisch).
- Snapshot-Cron-Route verhält sich bei 0 Videos in der DB sauber als No-Op (200) – muss ab heute laufen, auch bevor die Discovery-Pipeline (Phase 1) existiert.
- GitHub-Repo-Erstellung per MCP-Tool scheiterte an fehlenden Token-Rechten (403); Repo wurde stattdessen manuell angelegt (`DerNiko23/CW_App`) und der fertige Commit dorthin gepusht.

### Offen (User-Aktion)
- Supabase-Projekt anlegen, `0001_init.sql` im SQL Editor ausführen, Keys besorgen.
- Repo in Vercel importieren, alle Env-Vars aus `.env.example` setzen (inkl. `CRON_SECRET`, `AUTH_USERNAME`/`AUTH_PASSWORD`).
- Danach automatische Verifikation: Cron-Route liefert `{ snapshotted, skipped, videos_total }` gegen echte Daten statt des lokal getesteten Fehlerfalls.

---

## [2026-07-05] Konzept-Finalisierung Web-App (v1.0 des Plans)

### Entschieden
- **Ein** Score: "Opportunity Score" als gewichtete Summe (Reach 0.30, Velocity 0.30, Confidence 0.20, Engagement 0.10, Novelty 0.10). Priority Score und Opportunity Score zusammengelegt; Multiplikations-Modell verworfen (Null-Faktor-Problem).
- "Warum jetzt reagieren?"-Panel = die Erklärung des Opportunity Scores (ein Konzept, ein Ort in der UI).
- Status-Workflow auf 3 Stufen reduziert: Neu → Angenommen → Erledigt. "Erledigt" speist die "Bereits behandelt"-Badge.
- Reject nur mit Quick-Reason → macht Adaptive Ranking erst möglich.
- Confidence-Checkliste auf 4 ehrliche Checks beschränkt (keine Ironie-Erkennung versprochen).
- Velocity über eigene Snapshots (Vercel Cron ab Tag 1), da YouTube API keinen View-Verlauf liefert.
- Engagement = Kommentar-Anzahl relativ zu Views (keine Inhaltsanalyse).
- Demo-First: Inbox bei Abgabe mit 15–20 echten kuratierten Fundstücken vorbefüllt.
- Leitprinzip in PROJEKTANWEISUNG aufgenommen: "Würde Chris das morgen früh tatsächlich benutzen?"

### Gestrichen (bewusst)
- "Chris Match" als Score-Faktor (nicht operationalisierbar an Tag 1; entsteht implizit durch Adaptive Ranking)
- CI/CD, Husky, Semantic Release, Cypress, Docker, Branch-Strategien
- User-Auth/Profile/Settings/Mehrsprachigkeit (ein Nutzer, Passwort-Schutz reicht)
- 6-stufiger Status-Workflow, Kommentar-Inhaltsanalyse, volle Duplicate Detection → IDEAS.md

### Nächster Schritt
- 06.07.: Code-Start (Phase 0 + Snapshot-Cron sofort live)

---

## [früher] E-Book
- v0.4 (31 Seiten): Blank-Page-Bug behoben (100vh × break-before), Cover live, 2 SVG-Illustrationen, ~9 Bild-Platzhalter offen (Higgsfield-CDN im Sandbox-Proxy blockiert → manueller Upload-Workflow bestätigt)
- Design-Richtung B: warmes Off-White, Charcoal, Amber-Akzent, Space Grotesk + Newsreader
