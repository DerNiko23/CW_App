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

## Prinzipien
- **"Würde Chris das morgen früh tatsächlich benutzen?"** – sonst streichen.
- Demo-First: erster Eindruck darf nie von leerer Liste oder Ladezeit abhängen.
- Ehrlichkeit statt Bluff: keine Ironie-Erkennung versprochen, TikTok/IG-Grenzen offen kommuniziert.
- Kein DevOps-Overhead: jede Tooling-Stunde ist eine gestohlene Design-Stunde.
