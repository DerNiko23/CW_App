# Faktencheck-Inbox – Bewerbungsprojekt Christian Wolf

Zwei Deliverables:
1. **E-Book "Heißhunger"** (30–40 Seiten, Deutsch, in Chris' Ton) – Stand: v0.4, 31 Seiten, ~9 Bilder offen
2. **Web-App "Faktencheck-Inbox"** – Konzept final, Umsetzung ab 06.07.2026

## Die App in einem Satz
Ein Entscheidungsassistent, der Chris jeden Morgen die reichweitenstärksten Videos mit klar falschen Ernährungs-/Fitness-Aussagen liefert – inklusive Zitat, Timestamp, Begründung ("Warum jetzt?") und halbfertigem Reaktions-Skript.

## Kernidee
**Die Discovery-Pipeline ist das Produkt.** Details: [MASTERPLAN.md](MASTERPLAN.md)

```
Discovery → Collector → Topic Detection → Claim Extraction →
Normalisierung → Validation (Mythen-DB) → Opportunity Score → Inbox
```

## Dokumente
| Datei | Inhalt |
|---|---|
| MASTERPLAN.md | Vollständiges Produktkonzept, Score-Formel, Datenmodell |
| ROADMAP.md | Phasen, Zeitplan (8–9 Tage), Risiken |
| TASKS.md | Offene Aufgaben nach Priorität |
| IDEAS.md | Bewusst zurückgestellte Features |
| CHANGELOG.md | Entscheidungshistorie |
| PROJEKTANWEISUNG.md | Arbeitsprinzipien für die Zusammenarbeit |

## Stack
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel (+ Cron) · Claude API · YouTube Data API v3

## Prompts (Claude API, Discovery-Pipeline)

Die Pipeline ruft Claude an drei Stellen auf (`lib/pipeline/claude.ts`), jeweils über
erzwungenes Tool-Use (`tool_choice`) statt Freitext-JSON – die API validiert/parst die
Antwort serverseitig gegen ein Schema, das ist robuster als das Parsen von Modelltext
(in der Praxis kam es bei Freitext-JSON zu vereinzelt abgeschnittenen/leicht fehlerhaften
Antworten, v. a. bei der Normalisierung mit ihrer langen Mythen-Liste im Prompt).

1. **Topic Detection** – klassifiziert das Transkript in `ernaehrung` / `fitness` /
   `gesundheit` / `off_topic`. `ernaehrung` ist bewusst von den anderen beiden getrennt,
   weil Confidence-Check #3 ("Thema: Ernährung, Chris-Kernthema") genau darauf abfragt.
   Off-Topic-Videos brechen die Pipeline ab (Skip + Log, `discovery_log`).
2. **Claim Extraction** – liest das Transkript mit `[MM:SS]`-Zeitstempeln und liefert bis
   zu 3 wörtliche Zitate + Timestamp. "Wörtlich" wird nicht Claude geglaubt, sondern
   programmatisch gegen den Transkripttext verifiziert (`isQuoteVerbatimInTranscript`).
3. **Normalisierung + Matching** – bringt das Zitat in eine kanonische Kurzform und
   gleicht es gegen alle Mythen-DB-Einträge ab (`myth_id` oder `null`). Ein Guard prüft,
   dass Claude keine erfundene id zurückgibt.

Alle drei Prompts stehen im Volltext in `lib/pipeline/claude.ts`.

## Inbox & Detailansicht (`app/page.tsx`, `app/videos/[id]/page.tsx`)

Beide Seiten sind reine Server Components, die `lib/inbox/queries.ts` aufrufen – diese lädt
Videos/Claims/Myths/Snapshots/Weights und berechnet Score/Novelty pro Video mit denselben
`lib/pipeline`-Funktionen, die auch die Pipeline nutzt (kein doppelter Score-Code).

- **Filter** (Status/Plattform/Thema/Score-Bereich) sind URL-Query-Params
  (`components/inbox/filter-bar.tsx`), damit die Inbox serverseitig gerendert und dennoch
  linkbar/bookmarkbar bleibt.
- **Confidence < 70 %** wird aus der Standard-"Neu"-Warteschlange gefiltert (CLAUDE.md, ROADMAP.md-Risiko
  "False Positives sind der teuerste Fehler"), bleibt aber über den Status-Filter "Alle"
  einsehbar – nicht komplett versteckt, nur nicht in der aktiven Queue.
- **Accept/Reject/Erledigt** sind Server Actions (`app/actions.ts`), aufgerufen aus
  `components/inbox/action-buttons.tsx`; schreiben `videos.status` + `feedback`-Tabelle.
- **"Bereits behandelt"**: die Badge zeigt nur an, wenn ein *anderes* Video mit demselben
  `myth_id` bereits `status = done` ist. Der Opportunity-Score (Novelty-Faktor) sinkt zusätzlich,
  wenn `myths.covered_by_chris` (manuell gepflegte Startliste) oder `myths.topic_deprioritized`
  (Adaptive Ranking, s. u.) gesetzt ist (`lib/pipeline/novelty.ts`) - aber nur `covered_by_chris`
  bzw. ein echtes `done`-Video lässt den Bullet-Text auf der Detailseite "bereits behandelt"
  sagen. `topic_deprioritized` bedeutet nur "uninteressant", nicht "erledigt", und bekommt
  deshalb einen eigenen, ehrlichen Text (`lib/inbox/scoreBullets.ts`) - sonst würde die App eine
  Erledigung behaupten, die nie stattfand.
- **Design**: eigene Farbpalette (warmes Off-White/Charcoal/Amber, konsistent mit der
  E-Book-Richtung) statt Standard-shadcn-Grau, siehe `app/globals.css`.

## Reaktions-Baukasten (`lib/reaction/`, `components/inbox/reaction-builder.tsx`)

Ein-Klick-Generierung bei Angenommen/Erledigt (MASTERPLAN §3.3): Hook (3 Varianten),
Kernargument, Analogie, CTA per Claude (`lib/reaction/claude.ts`, gleicher Tool-Use-Client
wie die Pipeline, siehe `lib/claude/client.ts`). **Quellen kommen nicht von Claude**, sondern
direkt aus dem bereits verifizierten `myths.sources_json` – keine Halluzinationsgefahr.
Ton-Kalibrierung über 4 echte Transkript-Ausschnitte von Chris (`lib/reaction/styleReference.ts`).
Ergebnis wird in `videos.reaction_script` persistiert (Migration `0004`), damit nicht bei
jedem Aufruf neu generiert wird. Alle Teile einzeln + gesamt kopierbar.

## Adaptive Ranking (`lib/ranking/adaptive.ts`)

MASTERPLAN §3.5: Reject-Gründe passen die `weights`-Tabelle an. "Zu kleine Reichweite" /
"Aussage nicht klar falsch" / "Bereits behandelt" erhöhen das jeweils passende Score-Gewicht
(reach/confidence/novelty) leicht, alle 5 Gewichte werden renormalisiert (Summe bleibt 1.0,
kein Gewicht fällt unter 0.05 oder über 0.6). "Thema uninteressant" hat keine eigene
Score-Komponente – stattdessen markiert die Funktion den gematchten Mythos nach 3
Wiederholungen als `topic_deprioritized` (eigene Spalte, *nicht* `covered_by_chris` - "Chris
findet das uninteressant" ist etwas anderes als "Chris hat dazu schon ein Video gemacht"; beide
senken die Novelty gleichermaßen, aber nur Letzteres zeigt der UI als "bereits behandelt" an,
siehe `lib/inbox/scoreBullets.ts`).

## Manueller URL-Import (`components/inbox/url-import-form.tsx`)

MASTERPLAN §5: Formular auf der Inbox, ruft `/api/pipeline/import` auf (volle Pipeline für
eine einzelne URL, Backend aus Phase 1). Erfolg → Redirect zur Detailseite, Skip/Fehler →
Inline-Meldung.

## Prinzipien
- **"Würde Chris das morgen früh tatsächlich benutzen?"** – sonst streichen.
- Demo-First: erster Eindruck darf nie von leerer Liste oder Ladezeit abhängen.
- Ehrlichkeit statt Bluff: keine Ironie-Erkennung versprochen, TikTok/IG-Grenzen offen kommuniziert.
- Kein DevOps-Overhead: jede Tooling-Stunde ist eine gestohlene Design-Stunde.
