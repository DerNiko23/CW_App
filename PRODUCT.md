# Product

## Register

product

## Users

Ein einziger Nutzer: Chris, YouTube-Creator im Bereich Ernährung/Fitness/Gesundheit, der
Reaktionsvideos zu Falschinformations-Content dreht. Er nutzt die App morgens, um schnell zu
entscheiden, worauf er heute reagieren sollte – nicht um selbst zu recherchieren. Kein
Team-Kontext, kein Auth-Flow, keine Rollen: eine Person mit einem täglichen Workflow.

## Product Purpose

Die App ist kein Such-Tool, sondern ein **Entscheidungsassistent**. Sie beantwortet jeden Morgen
eine Frage: "Lohnt es sich, dazu heute ein Video aufzunehmen?" Die Discovery-Pipeline (YouTube
→ Claim-Erkennung → Confidence → Opportunity Score) ist der eigentliche Wert; die Inbox macht
diesen Wert nutzbar. Erfolg heißt: Chris vertraut den Vorschlägen genug, um ohne eigene
Vorprüfung zu handeln – dafür müssen False Positives (falsch geflaggte Videos) praktisch
ausgeschlossen sein (Confidence < 70 % erscheint gar nicht erst in der Inbox).

## Brand Personality

**Präzise, analytisch, vertrauenswürdig.** Die App tritt auf wie ein eigenständiges,
seriöses SaaS-Analyse-Werkzeug – nicht wie ein weicher Consumer-/Wellness-Auftritt. Jede
Entscheidung (Score, Confidence) ist transparent und einzeln erklärbar; nichts wird
versprochen, was die Pipeline nicht wirklich leistet (keine Ironie-Erkennung, kein "ML").
Ruhige, sachliche Tonalität statt Spielerei – Chris muss der Zahl vertrauen können, ohne sie
zu hinterfragen.

## Anti-references

**Design-Richtung B (verworfen, siehe CHANGELOG 2026-07-07):** warmes Creme/Amber-Farbschema,
`rounded-3xl` überall, kursive Serif-Zitate (Newsreader), weiche Radial-Gradient-Blobs im
Hintergrund. Das ist der bekannteste KI-Generierungs-Default und wirkt wie ein
Wellness-/Lifestyle-Blog statt wie ein unabhängiges Analyse-Tool – schwächt gerade das
Bewertungskriterium "Design-Gespür", das dieses Projekt explizit adressiert.

Generell: keine dekorativen Spielereien, die die Kernaussage (Zahl, Zitat, Quelle) verwässern.
Kein Feature-Theater – jede sichtbare Aussage muss von der echten Pipeline gedeckt sein.

## Design Principles

- **"Würde Chris das morgen früh tatsächlich benutzen?"** – einziger Filter für Umfang und
  Feinschliff. Alles, was diese Frage nicht klar mit Ja beantwortet, wird gestrichen.
- **Demo-First / Erklärbarkeit.** Jede Pipeline-Entscheidung (warum dieser Score, warum diese
  Confidence) muss auf einen Blick nachvollziehbar sein – kein Blackbox-UI.
- **Ehrlichkeit vor Feature-Liste.** Keine Fähigkeiten suggerieren, die nicht existieren.
  Confidence-Checkliste zeigt nur Checks, die wirklich laufen.
- **Ein Signal, ein Ort.** Score/Confidence haben je eine autoritative Berechnung und eine
  visuelle Sprache (Ampel-Logik für Status, Deep Teal exklusiv für Marke/Aktion) – nie vermischt.
- **Ruhige Fläche, präzise Kante.** Neutrale Off-White/Fast-Schwarz-Basis, ein Akzent, scharfe
  statt runde Radien, Hairline-Trenner statt Card-Nesting. Weißraum trägt die Hierarchie, nicht
  Dekoration.

## Accessibility & Inclusion

- Ziel: WCAG AA (bereits gelebte Praxis – z. B. Deep-Teal-Akzent gezielt für AA-Kontrast auf
  Weiß nachgeschärft, Kontrast-Bugs wie `text-accent-foreground` auf hellem Grund behoben).
- **Ampelfarben (Score/Confidence-Tiers) sind nie alleinige Bedeutungsträgerin** – für
  Rot-Grün-Sehschwäche immer mit Zahl, Text oder Icon kombinieren, nie Farbe pur als Statuscode.
- Mobile ist Pflicht (Ausschreibungsanforderung, kein optionaler Breakpoint) – jede Seite auf
  Mobile-Viewport prüfen, nicht nur Desktop.
