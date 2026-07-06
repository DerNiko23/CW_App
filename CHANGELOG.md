# CHANGELOG

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
