# CHANGELOG

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
