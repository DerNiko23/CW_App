# CLAUDE.md – Faktencheck-Inbox (Bewerbung Christian Wolf)

## Kontext
Bewerbungsprojekt. Vollständiges Konzept in MASTERPLAN.md, Phasen in ROADMAP.md, offene Aufgaben in TASKS.md. **Lies MASTERPLAN.md vor der ersten Änderung einer Session.** Das Konzept ist final – keine neuen Features ohne Rücksprache, Ideen kommen in IDEAS.md.

## Leitprinzip
**"Würde Chris das morgen früh tatsächlich benutzen?"** Wenn nein: streichen. Ein Nutzer, kein Auth-Flow (nur Passwort-Middleware), keine Settings, kein DevOps-Overhead.

## Eigenständiges Denken & Automatisierung
Bei jeder Aufgabe kurz fragen: Gibt es eine schnellere Lösung für den Nutzer? Kann ein KI-Agent (Claude API) diesen Schritt übernehmen statt Handarbeit/Regeln? Lässt sich etwas automatisieren, ohne Kosten oder Komplexität unkontrolliert zu erhöhen? Wenn ja, umsetzen und kurz begründen – aber jede neue Automatisierung braucht eine erkennbare Kostenobergrenze (Quota, API-Calls), bevor sie automatisch/geplant läuft. Neue automatisierte Cron-Läufe (zusätzlich zu Snapshot) nur nach Rücksprache scharf schalten.

## Stack (fix, keine Abweichung ohne Rücksprache)
Next.js App Router · TypeScript strict · Tailwind · shadcn/ui · Supabase (Free Tier) · Vercel + Vercel Cron · Claude API · YouTube Data API v3

## Befehle
- `npm run dev` – Dev-Server (nach jeder Funktion im Browser prüfen, nicht nur Build)
- `npm run build` – muss vor jedem Push fehlerfrei sein
- `npm run lint` – muss sauber sein
- Deploy: Push auf `main` → Vercel Auto-Deploy

## Harte Regeln
- **Secrets nur in `.env.local`** (in .gitignore) bzw. Vercel ENV. Nie im Code, nie in Commits.
- YouTube-Quota ist knapp (10.000 Units/Tag, search.list = 100): API-Responses in Supabase cachen, nie ungecacht in Loops abfragen. Verbrauch in `youtube_quota_usage` tracken.
- Claude-API-Aufrufe: Transkripte vor dem Prompt auf relevante Segmente kürzen. Bei strukturierten Antworten (JSON) erzwungenes Tool-Use statt Freitext-Parsing verwenden – robuster und reißt nicht ab.
- Confidence < 70 % → Video kommt NICHT in die Inbox (False Positives sind der teuerste Fehler).
- Score = gewichtete Summe aus `weights`-Tabelle (MASTERPLAN §4), nie hartcodieren.
- Keine Fähigkeiten behaupten, die nicht existieren (keine Ironie-Erkennung, kein "ML").

## Design
Eigenes, hochwertiges SaaS-Look-and-Feel – kein Standard-shadcn-Grau. Klare Hierarchie, großzügiger Weißraum, konsistente Abstände, saubere Leer-/Lade-/Fehlerzustände, dezente Animationen. Responsive ist Pflicht (Ausschreibung): jede Seite auf Mobile-Viewport prüfen.

## Arbeitsweise
- Vor jeder größeren Aufgabe: Plan Mode, Plan gegen MASTERPLAN.md prüfen, dann umsetzen.
- Nach jeder Funktion: selbst testen (Happy Path + Fehlerfall + leerer Zustand + Randbedingungen), erst dann abhaken. Bei Pipeline/Datenverarbeitung: mit echten Daten testen, nicht nur Unit-Tests – reale APIs verhalten sich anders als erwartet.
- Eigenständig entscheiden, wenn offensichtlich sinnvoll; nur fragen bei echten Weggabelungen oder fehlenden Informationen (z. B. Zugangsdaten, externe Inhalte wie der Ausschreibungstext).

## Doku-Pflicht (nach jeder abgeschlossenen Aufgabe)
- TASKS.md: erledigte Tasks abhaken, neue eintragen
- CHANGELOG.md: Eintrag mit Datum + Begründung bei Entscheidungen, Bugs und Fixes
- IDEAS.md: verworfene/vertagte Ideen festhalten
- README.md: bei neuen Modulen/Prompts kurz dokumentieren, wie sie funktionieren
