# MASTERPLAN – Faktencheck-Inbox (Web-App, Aufgabe 2)

> Stand: 05.07.2026 · Status: Konzept final, Umsetzung startet
> Leitprinzip: **"Würde Chris das morgen früh tatsächlich benutzen?"** – Alles, was diese Frage nicht klar mit Ja beantwortet, wird gestrichen.

---

## 1. Produktvision

Chris sucht Falschinformations-Videos bisher stundenlang von Hand. Die App nimmt ihm diese Arbeit ab – und geht einen Schritt weiter: Sie ist kein Such-Tool, sondern ein **Entscheidungsassistent**. Sie beantwortet jeden Morgen die eine Frage:

**"Lohnt es sich, dazu heute ein Video aufzunehmen?"**

### Positionierung (auch fürs Loom-Video)
Die **Discovery-Pipeline IST das Produkt.** Ein Dashboard bauen kann jeder mit KI. Der Wert liegt darin, zuverlässig reichweitenstarke Videos mit klar falschen Aussagen zu finden – ohne richtige Aussagen zu flaggen.

---

## 2. Die Pipeline (Kern-Architektur)

```
Discovery Engine
      ↓
Multi-Platform Collector   (YouTube API live · Adapter-Interfaces für TikTok/IG · manueller URL-Import)
      ↓
Topic Detection            (Ernährung/Fitness/Gesundheit, Deutsch – themenfremdes fliegt raus)
      ↓
Claim Extraction           (Transkript → konkrete Aussage + Timestamp)
      ↓
Claim Normalisierung       ("Honig hat keine Kalorien" ≈ "Honig macht nicht dick")
      ↓
Claim Validation           (Abgleich gegen Mythen-Datenbank → Confidence + Evidence)
      ↓
Opportunity Scoring        (siehe Abschnitt 4)
      ↓
Inbox                      (Accept / Reject mit Grund → Adaptive Ranking)
```

Jeder Schritt ist einzeln erklärbar → im Loom kann jede Auswahl-Entscheidung transparent begründet werden ("Warum wurde dieses Video ausgewählt?").

---

## 3. Kernfunktionen (Must)

### 3.1 Inbox
- Liste priorisierter Video-Vorschläge, sortiert nach Opportunity Score
- Pro Karte: Thumbnail, Titel, Kanal, Falschaussage (Zitat), Timestamp, Score-Badge, Confidence
- **Accept / Reject** – Reject immer mit Quick-Reason:
  - "Thema uninteressant" · "Aussage nicht klar falsch" · "Zu kleine Reichweite" · "Bereits behandelt"
- Filter: Plattform, Thema, Score-Bereich, Status
- **Demo-First:** Inbox ist bei Abgabe mit 15–20 echten, kuratierten Fundstücken vorbefüllt (echte YouTube-Videos, durch die echte Pipeline gelaufen). Erster Eindruck darf nie von einer leeren Liste oder Ladezeit abhängen.

### 3.2 Detailansicht = Entscheidungsassistent
Ein Screen, drei Blöcke:

**A) Die Falschaussage**
- Wörtliches Zitat aus dem Transkript + Timestamp (z. B. `03:41 – "Honig macht nicht dick."`)
- Chris muss kein 12-Minuten-Video schauen.

**B) Warum jetzt reagieren? (= Erklärung des Opportunity Scores)**
Beispiel-Copy:
> **Opportunity Score: 87/100 – Sehr hohe Priorität**
> • 580.000 Aufrufe
> • +62.000 in den letzten 24 Stunden (Velocity)
> • Hohes Engagement (Kommentare/Views überdurchschnittlich)
> • Noch kein Video von Chris zu genau diesem Claim

**C) Confidence mit ehrlicher Checkliste**
> 🟢 94 % – High Confidence
> ✔ Mythos in Datenbank gematcht
> ✔ Aussage wörtlich im Transkript
> ✔ Thema: Ernährung (Chris-Kernthema)
> ✔ Studien/Quellen vorhanden

Nur Checks, die wir wirklich durchführen. **Keine** "Ironie erkannt"-Versprechen.

### 3.3 Reaktions-Baukasten (per Klick bei angenommenen Videos)
Generiert das halbe Skript in Chris' Ton:
```
Hook (3 Varianten)
  ↓
Warum das falsch ist (Kernargument)
  ↓
Studie / Quelle (2–3 seriöse, verlinkt)
  ↓
Analogie (Chris-typisch, anschaulich)
  ↓
Call to Action
```
Alles kopierbar. Groß und prominent auf der Detailseite – das ist der "Nicht vorgeschrieben, aber stark"-Teil der Ausschreibung.

### 3.4 Status-Workflow (bewusst minimal)
```
Neu → Angenommen → Erledigt        (Abgelehnt = impliziter Zustand via Reject)
```
- 3 Stufen statt 6: Ein Ein-Personen-Nutzer pflegt keine 6-stufige Pipeline.
- "Erledigt" (mit Datum) speist automatisch die **"Bereits behandelt"-Badge** → Duplicate-Schutz ohne eigenes Feature.
- Zusätzlich manuell gepflegte Startliste: Chris' ~20 bekannteste Mythen-Videos.

### 3.5 Adaptive Ranking (nicht "Machine Learning")
- Reject-Gründe fließen in Score-Gewichtungen:
  - 20× Keto abgelehnt → Keto-Themen sinken im Ranking
  - "Zu kleine Reichweite" → Reach-Schwelle steigt
- Einfache, transparente Score-Adjustments. Im Loom ehrlich als "Adaptive Ranking" erklärt.

---

## 4. Opportunity Score (EIN Score, EINE Erklärung, EIN Ort)

**Gewichtete Summe** (nicht Multiplikation – ein Null-Faktor darf nicht alles killen):

```
Score = 0.30 × Reach        (Views, log-normalisiert)
      + 0.30 × Velocity     (Δ Views / 24 h, aus eigenen Snapshots)
      + 0.20 × Confidence   (Sicherheit der Claim-Erkennung)
      + 0.10 × Engagement   (Kommentare + Likes relativ zu Views)
      + 0.10 × Novelty      (Claim noch nicht von Chris behandelt: 1, sonst 0)
```
Normalisiert auf 0–100. Gewichte in Supabase konfigurierbar (→ Adaptive Ranking passt genau hier an).

**Daten-Realität Velocity:** YouTube API liefert keinen View-Verlauf → eigener Snapshot-Cron (Vercel Cron + Supabase) speichert Views täglich. **Cron startet am Tag 1 der Umsetzung**, damit bis zur Einreichung echte Verlaufsdaten existieren.

**Engagement:** Kommentar-*Anzahl* relativ zu Views (gratis in API-Response). Keine Kommentar-Inhaltsanalyse (Quota + NLP-Aufwand → IDEAS.md).

---

## 5. Plattform-Strategie (ehrlich kommuniziert)

| Plattform  | Ansatz |
|------------|--------|
| YouTube    | Voll automatisiert via Data API v3 (Quota-Budget: siehe ROADMAP). Manueller URL-Import funktioniert ebenfalls. |
| TikTok     | Kein offener Such-API-Zugang für einen kommerziellen Ein-Personen-Use-Case (TikTok Research API ist explizit auf akademische/Non-Profit-Forschung beschränkt). **Aktuell weder Auto-Search noch manueller URL-Import umgesetzt** – `processVideoByUrl` (`lib/pipeline/import.ts`) ist vollständig YouTube-hartcodiert (`parseVideoId` erkennt nur `youtube.com`/`youtu.be`). Lösungsvorschlag (Drittanbieter-Scraping-API, Adapter-Interface) ausgearbeitet in IDEAS.md, bewusst zurückgestellt. |
| Instagram  | dito – Instagram Graph API hat keine offene Such-Endpoint für fremde Inhalte (Hashtag-Suche nur für eigenen Business-Account, stark gedeckelt). |

**Manueller URL-Import (Stand: nur YouTube):** Chris (oder Community) wirft eine YouTube-URL ein → App zieht Transkript/Daten und jagt sie durch dieselbe Pipeline. TikTok/Instagram-URLs liefern aktuell einen Fehler ("Konnte keine YouTube-Video-ID extrahieren") statt eines Imports – kein Fake-Feature-Versprechen, sondern ehrlich auf den tatsächlichen Umsetzungsstand korrigiert (2026-07-10, vorher stand hier fälschlich "funktioniert" für alle drei Plattformen).

Loom-Formulierung: *"Instagram und TikTok erlauben keine vollständige öffentliche Suche. Ich habe die Architektur so gebaut, dass ein Adapter pro Plattform reicht – für YouTube live automatisiert, für TikTok/Instagram als ausgearbeiteter, aber bewusst zurückgestellter nächster Schritt (siehe IDEAS.md)."*

---

## 6. Tech-Stack

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**
- **Supabase** (Postgres, Free Tier) – Videos, Claims, Mythen-DB, Snapshots, Feedback, Gewichte
- **Vercel** – Hosting + Cron Jobs
- **Claude API** – Topic Detection, Claim Extraction/Normalisierung, Reaktions-Baukasten
- **YouTube Data API v3** – Discovery (quota-bewusst)
- Zugangsschutz: simples Passwort (Zugangsdaten in der Einreichung) – kein Auth-Flow, es gibt genau einen Nutzer.

### Bewusst gestrichen (Anti-Overhead)
CI/CD-Pipelines, Husky, Semantic Release, Cypress, Docker, Branch-Strategien, User-Profile, Settings, Mehrsprachigkeit. Vercel Auto-Deploy von `main` + ESLint + manuelles Testen der kritischen Flows reicht. Jede DevOps-Stunde ist eine gestohlene Design-Stunde – Chris sieht nur die App, nie den Code.

---

## 7. Datenmodell (Kern)

```
videos        id, platform, external_id, url, title, channel, published_at,
              thumbnail, status (new|accepted|done|rejected), done_at
claims        id, video_id, quote, timestamp_s, normalized_claim,
              myth_id (FK), confidence, evidence_json
myths         id, claim_pattern, category, verdict, sources_json,
              covered_by_chris (bool), chris_video_url
snapshots     id, video_id, views, likes, comments, captured_at
feedback      id, video_id, action (accept|reject), reason, created_at
weights       key, value        (Score-Gewichte, adaptiv angepasst)
```

---

## 8. Bewertungskriterien der Ausschreibung → unsere Antwort

| Kriterium (Ausschreibung)   | Unsere Antwort |
|-----------------------------|----------------|
| Eigenständiges Denken       | Pipeline-Konzept, Score-Design, ehrliche Plattform-Strategie, bewusste Streichungen |
| Qualität & Finish           | Demo-First: vorbefüllte Inbox, poliertes UI, keine Rohbau-Ecken |
| Substanz                    | Echte kuratierte Fundstücke, Timestamp + Zitat, Reaktions-Baukasten |
| Design-Gespür               | Eigenes Designsystem (kein Template), konsistent mit E-Book-Richtung |
| Tempo & Tool-Einsatz        | Claude in der Pipeline UND im Bauprozess; im Loom transparent gemacht |
| Klarheit im Video           | Narrativ: "Die Pipeline ist das Produkt" |
