---
name: Faktencheck-Inbox
description: Entscheidungsassistent für Chris' Faktencheck-Videos – klinisch präzise, leise selbstbewusst.
colors:
  off-white: "#FAFAFA"
  fast-schwarz: "#141414"
  card-white: "#FFFFFF"
  deep-teal: "#0B7A6A"
  signal-gruen: "#1A7D4F"
  signal-amber: "#7A5F00"
  signal-rost: "#C1432E"
  neutral-secondary: "#EFEFEF"
  neutral-muted: "#F0F0F0"
  neutral-muted-fg: "#737373"
  hairline: "#E3E3E3"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.14em"
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "1.44px"
  md: "1.92px"
  lg: "2.4px"
  xl: "3.36px"
  2xl: "4.32px"
  3xl: "5.28px"
  4xl: "6.24px"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section-gap: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.fast-schwarz}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.full}"
    padding: "0 0.625rem"
    height: "2rem"
  button-primary-hover:
    backgroundColor: "rgba(20,20,20,0.8)"
  button-accept:
    backgroundColor: "{colors.signal-gruen}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.off-white}"
    textColor: "{colors.fast-schwarz}"
    rounded: "{rounded.full}"
    height: "2rem"
  button-destructive-tonal:
    backgroundColor: "rgba(193,67,46,0.1)"
    textColor: "{colors.signal-rost}"
    rounded: "{rounded.full}"
    height: "2rem"
  status-pill:
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
    typography: "{typography.label}"
  score-chip:
    backgroundColor: "{colors.signal-gruen}"
    rounded: "{rounded.2xl}"
    padding: "0.375rem 0.75rem"
  card-video:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.3xl}"
    padding: "1.25rem"
  input-field:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.fast-schwarz}"
    rounded: "{rounded.lg}"
    height: "2.5rem"
---

# Design System: Faktencheck-Inbox

## 1. Overview

**Creative North Star: "Der klare Befund"**

Die App ist kein Dashboard, das um Aufmerksamkeit wirbt – sie liefert einen Befund, so wie ein
Laborbericht: nüchtern, einzeln nachvollziehbar, ohne Interpretationsspielraum. Aber Befund heißt
nicht steril. Die Referenz ist iOS auf seinem präzisesten: klinisch sauber in der Ausführung –
scharfe Kanten, echte Kontraste, kein Weichzeichner – aber warm genug in der Handwerklichkeit
(Hover-States, Timing, Großzügigkeit im Weißraum), dass es sich wie ein durchdachtes Produkt
anfühlt statt wie ein Formular. Präzision ist hier eine Qualität, kein Verzicht.

Bewusst verworfen (Design-Richtung B, siehe CHANGELOG 2026-07-07): warmes Creme/Amber, `rounded-3xl`
überall, kursive Serif-Zitate, weiche Radial-Gradient-Blobs. Dieser Look ist der bekannteste
KI-Generierungs-Default und liest sich wie ein Wellness-Blog – das genaue Gegenteil eines Werkzeugs,
dem man morgens ungeprüft vertraut.

**Key Characteristics:**
- Neutrale Fläche (Off-White/Fast-Schwarz), ein einziger Marken-Akzent (Deep Teal), strikt getrennt
  von der Ampel-Statuslogik (Grün/Amber/Rot).
- Scharfe statt runde Kanten (2–6px) für Struktur/Inhalt (Cards, Inputs, Panels, Dividers),
  Hairline-Trenner statt Card-Nesting auf der Detailseite. **Aktionsflächen (Buttons/CTAs)** sind
  seit dem Button-Redesign (siehe CHANGELOG 2026-07-09) die eine bewusste Ausnahme davon –
  Details unter "Rund vs. scharf" in Abschnitt 5.
- Ein visuelles Signature-Element: die nackte Score-Zahl in Space Grotesk – kein Chip, keine Hülle.
- Ruhig und selbstsicher: keine Dringlichkeits-Chrome außer der Ampel-Logik selbst; das UI konkurriert
  nie mit den Daten.

## 2. Colors

Neutrale Basis trägt die Fläche, ein Akzent trägt die Marke, drei Signalfarben tragen den Status –
diese drei Rollen werden nie vermischt.

### Primary
- **Deep Teal** (`#0B7A6A`): der einzige Marken-Akzent. Links, aktive Filter, Fokus-Ringe, das
  Zitat-Trennzeichen, der Signature-Streifen des Reaktions-Baukastens. Auf Weiß AA-nachgeschärft
  (Ausgangswert war `#0C8C7A`).

### Neutral
- **Off-White** (`#FAFAFA`): Seitenhintergrund. Kein Creme, keine Wärme – neutrales Grau-Weiß.
- **Fast-Schwarz** (`#141414`): Haupttextfarbe und `primary`-Buttonfläche (invertierter Button, kein
  Blau/Teal als Standard-CTA).
- **Karten-Weiß** (`#FFFFFF`): Card-/Popover-Hintergrund, hebt sich nur minimal vom Off-White ab.
- **Neutral Secondary** (`#EFEFEF`) / **Neutral Muted** (`#F0F0F0`): sekundäre Flächen (z. B.
  Timestamp-Pill, „Neu"-Status), Platzhalter-Icons.
- **Muted Foreground** (`#737373`): sekundärer Text (Meta-Zeilen, Kanalname, Captions).
- **Hairline** (`#E3E3E3`): einzige Border-/Divider-Farbe im gesamten System.

### Signalfarben (Ampel-Logik – nie mit dem Marken-Akzent vermischt)
- **Signal-Grün** (`#1A7D4F`): hohe Priorität/Confidence. Trägt außerdem den "Annehmen"-Button –
  die einzige Stelle, an der eine Signalfarbe eine primäre Aktion einfärbt. Nachgeschärft von der
  ursprünglichen Vorschau-Farbe `#1E8E5A` auf AA-Kontrast (5,1:1 Weiß-auf-Grün, siehe Kritik
  2026-07-07).
- **Signal-Amber** (`#7A5F00`): mittlere Priorität/Confidence. Nachgeschärft von `#C99A02` (Vorschau
  lag bei ~2,3:1 auf der tonalen Chip-Fläche, deutlich unter AA) auf ~5,3:1.
- **Signal-Rost** (`#B03A26`): niedrige Priorität/Confidence sowie destruktive Aktionen (tonal:
  10–20 % Deckkraft auf Weiß, nie Vollton). Nachgeschärft von `#C1432E` (Audit 2026-07-08: die
  "Abgelehnt"-Statuspille lag bei ~4,4:1, knapp unter AA) auf ~5,2:1.

### Named Rules
**Die Ein-Akzent-Regel.** Deep Teal ist Marke, nicht Status. Grün/Amber/Rot sind Status, nicht
Marke. Eine Fläche bekommt nie beide Bedeutungen gleichzeitig zugewiesen – das war ein realer Bug
vor dem Redesign (Score-Mid-Tier nutzte fälschlich die Akzentfarbe) und darf nicht zurückkehren.

**Die Ampel-ist-nie-allein-Regel.** Farbcodierte Status (Score-Tier, Confidence-Tier) sind nie die
alleinige Bedeutungsträgerin. Immer mit Zahl, Text oder Icon kombiniert (WCAG AA,
Rot-Grün-Sehschwäche) – siehe `ScoreBadge`/`ConfidenceChecklist`: Farbe + Prozentzahl + Label,
nie Farbe pur.

## 3. Typography

**Display-/Heading-Font:** Space Grotesk (mit `sans-serif`-Fallback)
**Body-/UI-Font:** Inter (mit `sans-serif`-Fallback)
**Mono-Font:** Geist Mono – ausschließlich für Zeitstempel (Video-Timecodes)

**Character:** Space Grotesk trägt jede Zahl und jede Überschrift – geometrisch, leicht technisch,
macht die Score-Zahl zum Blickfang ohne Dekoration. Inter führt den Fließtext ruhig im Hintergrund.
Die Paarung ist die gesamte typografische Hierarchie; es gibt keine dritte Display-Schrift und keine
Serife (die frühere Newsreader-Kursivschrift für Zitate wurde im Redesign vollständig entfernt).

### Hierarchy
- **Display** (600, `text-6xl`/3.75rem, `leading-none`, tabular-nums): ausschließlich die
  Opportunity-Score-Zahl auf der Detailseite – bewusst ohne umschließenden Chip.
- **Headline** (600, `text-2xl`–`text-3xl`, `text-balance`): Seiten-H1 ("Lohnt es sich, dazu heute
  ein Video aufzunehmen?").
- **Title** (600, `text-sm`–`text-xl`, je nach Kontext): Kartentitel, Video-Titel, Score-Chip-Zahl.
- **Body** (400, `text-sm`/0.875rem, `leading-normal`): Standard-Fließtext, Listen, Beschreibungen.
- **Quote** (500, `text-[15px]`–`text-2xl`, `leading-snug`): Falschaussage-Zitate – die einzige
  Stelle mit vergrößertem, betontem Body-Text statt eigener Display-Schrift.
- **Label** (500, `text-xs`/0.75rem, `tracking-[0.14em]`, uppercase): Block-Überschriften
  ("Die Falschaussage", "Warum jetzt reagieren?") und die Eyebrow "Faktencheck-Inbox". Funktionale
  Wegweiser innerhalb einer App-Seite, keine Marketing-Eyebrows über Sections.

### Named Rules
**Die Eine-Zahl-Regel.** `text-6xl` Space Grotesk ist ausschließlich für die Score-Zahl reserviert.
Kein anderes Element der App darf so groß gesetzt werden – die Score-Zahl bleibt der unangefochtene
Blickfang jeder Detailseite.

## 4. Elevation

Flach standardmäßig. Karten, Sections und Buttons tragen keinen Schatten – Trennung entsteht durch
Hairline-Borders (`#E3E3E3`) und Weißraum (`gap-14`/3.5rem zwischen Detailseiten-Blöcken), nicht
durch Tiefe. Schatten sind reserviert für Overlay-Ebenen, die tatsächlich über dem Inhalt schweben.

### Shadow Vocabulary
- **Overlay** (`box-shadow: var(--shadow-md); ring: 1px solid oklch(foreground/10%)`): Popover- und
  Select-Dropdowns. Die einzige Stelle im System mit echtem Schatten – funktional (schwebt über
  Inhalt), nicht dekorativ.
- **Filter-Dropdown-Panel** (seit 2026-07-09, `components/inbox/filter-bar.tsx`): teilt sich die
  Overlay-Schatten-Regel mit Popover/Select, bekommt aber `rounded-[12px]` statt der sonst
  scharfen 2–6px – zweite bewusste Radius-Ausnahme (nach Status-Pills), begründet durch den
  Referenz-Screenshot des Nutzers. Gilt nur für dieses eine Panel, nicht als generelle
  Overlay-Regel.

### Named Rules
**Die Flach-außer-Overlay-Regel.** Wenn es nicht über dem Inhalt schwebt, hat es keinen Schatten.
Tiefe wird nur simuliert, wo sie technisch wahr ist (Popover, Dropdown), nie als Stilmittel auf
Cards oder Buttons.

## 5. Components

Ruhig und selbstsicher: keine Komponente signalisiert Dringlichkeit, außer der Ampel-Logik selbst.
Hover- und Fokus-Zustände sind spürbar, aber unaufgeregt (Farbverschiebung, kein Bounce, kein Scale
außer bei Thumbnails).

### Buttons
- **Shape:** `rounded-full` (seit Redesign 2026-07-09, vorher `rounded-lg`/2,4px). Siehe
  "Rund vs. scharf" unten für die Begründung – gilt für alle Buttons ausnahmslos (Primary,
  Accept, Outline/Ghost, Destructive, in jeder Größe inkl. `xs`/`sm`/Icon-Buttons).
- **Primary:** Fast-Schwarz-Fläche, Off-White-Text (`hover:` 80 % Deckkraft). Bewusst kein
  Teal-Standard-Button – der Akzent bleibt selten.
- **Accept-Variante:** einzige Ausnahme von "Primary ist schwarz" – der Annehmen-Button auf
  Signal-Grün, weil er selbst Teil der Ampel-Entscheidung ist.
- **Outline/Ghost:** transparente/Off-White-Fläche, Hairline-Border, `hover:bg-muted`.
- **Destructive:** tonal (10–20 % Deckkraft Signal-Rost), nie Vollton-Rot – passt zur generell
  zurückhaltenden Farbnutzung.
- **Zustand:** Aktive Buttons verschieben sich 1px nach unten (`active:translate-y-px`) – ein
  spürbarer, aber winziger "Tastendruck"; keine Skalierung, kein Schatten-Pop.
- **Aktiver Filter-Trigger (FilterBar):** `border-2 border-accent` statt der Standard-Hairline,
  Chevron rotiert 180°. Nutzt die bereits bestehende Regel "Deep Teal = aktive Filter" (Abschnitt
  2) statt einer neuen Farbe.

### Rund vs. scharf (Named Rule, seit 2026-07-09)
Das System hatte bis 2026-07-08 durchgängig scharfe Radien inkl. Buttons. Auf Nutzerwunsch
(Referenz-Screenshot eines Filter-UIs) wurde das für **Aktionsflächen** bewusst aufgebrochen:
**rund = Aktion, scharf = Struktur/Inhalt.** Buttons/CTAs (alles, was man klickt, um etwas
auszulösen) sind `rounded-full`. Cards, Inputs, Panels und Dividers bleiben scharf (2–6px) – die
Unterscheidung ist jetzt semantisch (klickbare Aktion vs. Inhalt/Struktur) statt rein ästhetisch,
und bewusst nicht die pauschale Rückkehr zur unter "Design-Richtung B" verworfenen weichen
Formsprache (die betraf Cards/Zitate/Hintergründe, nicht Buttons).

### Status-Pills (Tag-Semantik)
- **Style:** `rounded-full`, tonale Hintergrundfarbe je Status (Neu = Secondary, Angenommen =
  Teal/15 %, Erledigt = Grün/15 %, Abgelehnt = Rost/10 %).
- **Regel:** Pills waren schon vor dem Button-Redesign rund (eigene Tag/Chip-Formsprache) und
  sind seit 2026-07-09 kein Sonderfall mehr, sondern teilen die Form mit Buttons.

### Score-Badge (Signature-Komponente)
- **Liste und Detailseite teilen sich dieselbe nackte-Zahl-Sprache** – kein Chip, keine Hülle,
  irgendwo. Nur die Größe unterscheidet: `text-2xl` in der Liste, `text-6xl` exklusiv auf der
  Detailseite (siehe "Die Eine-Zahl-Regel"). Space-Grotesk-Zahl in Ampelfarbe, optional Punkt +
  Label darunter. Seit dem Listen-Redesign (2026-07-08) das durchgängige visuelle Signature-Element
  der ganzen App, nicht mehr nur der Detailseite vorbehalten.

### Listen/Cards
- **Video-Zeile (Liste, seit 2026-07-08):** kein Card-Chrome mehr – `-mx-4 px-4`/`-mx-6 px-6`
  Full-Bleed-Zeile, `hover:bg-muted/40` statt Border-Hover. Zeilen durch `divide-y divide-border`
  im Listen-Container getrennt (Hairline), nicht durch eigene Card-Border. Thumbnail bleibt
  `rounded-xl` mit dezentem `scale-105`-Hover (300ms); Zeitstempel-Overlay: `bg-black/75`,
  Mono-Font, Weiß.
- **Detailseite:** verzichtet komplett auf Card-Chrome. Drei Blöcke (Falschaussage / Warum jetzt /
  Confidence) sind durch `border-t` Hairlines plus 3,5rem Weißraum getrennt – keine verschachtelten
  Cards.
- **Reaktions-Baukasten (Signature-Section):** einzige Komponente mit 4px-Akzentstreifen –
  `border-t-4 border-t-accent`, sonst Hairline-Border. Diese Top-Stripe ist bewusst die einzige
  Stelle im System mit einer dicken Akzent-Kante; sie markiert den "Nicht vorgeschrieben, aber
  stark"-Teil der App.

### Inputs / Fields
- **Style:** Hairline-Border, Karten-Weiß-Hintergrund, `rounded-lg`, `h-8`–`h-10` je nach Kontext.
- **Focus:** `focus-visible:border-ring` + 3px Ring in Teal/50 % – der Akzent taucht hier bewusst
  wieder auf (Fokus ist ein Marken-Moment, kein Statusmoment).
- **Checkbox** (`components/ui/checkbox.tsx`, seit 2026-07-09, FilterBar-Panels): bleibt bei
  `rounded-sm` – Formular-Kontrolle, keine Aktionsfläche, folgt also der scharfen Struktur-Regel,
  nicht der Button-Regel. Checked-State in Deep Teal (Ein-Akzent-Regel).

### Zitate (Blockquote)
- **Style:** `border-l-[2–3px] border-accent`, stilisierte „Anführungszeichen in Space Grotesk statt
  Kursivschrift. Ersetzt die frühere Serif-Kursivschrift vollständig.

## 6. Do's and Don'ts

### Do:
- **Do** Deep Teal (`#0B7A6A`) ausschließlich für Marke/Aktion/Fokus verwenden – nie für Status.
- **Do** Ampel-Farbe (Grün/Amber/Rost) immer mit Zahl, Text oder Icon kombinieren, nie als alleinigen
  Bedeutungsträger (Rot-Grün-Sehschwäche, WCAG AA).
- **Do** neue Sections mit Hairline-`border-t` + großzügigem Weißraum trennen statt mit Card-Chrome,
  sobald es sich um sequenzielle Inhaltsblöcke (nicht Listen-Items) handelt.
- **Do** die Score-Zahl als einziges `text-6xl`-Element behandeln – kein anderes UI-Element darf mit
  ihr um Größe konkurrieren.
- **Do** neue primäre Aktionsflächen in Fast-Schwarz halten; Farbe nur einsetzen, wenn die Aktion
  selbst Teil der Ampel-Entscheidung ist (wie "Annehmen").
- **Do** neue Animationen unter der globalen `prefers-reduced-motion`-Regel in `globals.css`
  belassen (seit Polish 2026-07-08: kollabiert Dauer statt Sichtbarkeit zu togglen) – keine
  Einzelfall-Ausnahmen einführen, die diese Regel umgehen.
- **Do** neue Buttons/CTAs `rounded-full` setzen (der `Button`-Basiskomponente folgen, nicht
  manuell überschreiben) – siehe "Rund vs. scharf". Cards/Inputs/Panels bleiben scharf.

### Don't:
- **Don't** zur warmen Creme-/Amber-Palette, kursiven Serif-Zitaten oder Radial-Gradient-Blobs
  zurückkehren (Design-Richtung B, explizit verworfen – "der bekannteste KI-Generierungs-Default").
  Das betrifft weiterhin nicht die Button-Form – `rounded-full` bei Aktionsflächen ist eine
  bewusste, separate Entscheidung (siehe "Rund vs. scharf"), keine Rückkehr zu Design-Richtung B.
- **Don't** Deep Teal für Status-Bedeutung verwenden (das war der Bug vor dem Redesign: Mid-Tier
  nutzte fälschlich die Akzentfarbe statt Amber).
- **Don't** Schatten auf Cards, Buttons oder Sections einsetzen – Schatten sind ausschließlich für
  Overlays (Popover/Select/Filter-Dropdown-Panel) reserviert.
- **Don't** scharfe Radien bei Cards/Inputs/Panels auf `rounded-full` umstellen, nur weil Buttons
  jetzt rund sind – die Rund-Regel gilt ausschließlich für Aktionsflächen.
- **Don't** neue Fähigkeiten visuell suggerieren, die die Pipeline nicht wirklich prüft (z. B. eine
  "Ironie erkannt"-Badge) – die Confidence-Checkliste zeigt nur echte Checks, und das Design darf das
  nie unterlaufen.
- **Don't** die Ein-Signal-ein-Ort-Regel brechen: Score und Confidence haben je eine einzige
  autoritative Anzeige-Stelle pro Screen; nicht doppelt mit leicht abweichenden Werten anzeigen.
