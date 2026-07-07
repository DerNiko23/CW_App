# CHANGELOG

## [2026-07-07] Bekanntes, ungeklärtes Problem: Reaktions-Baukasten-Fehler (Nutzer-Report)

Nutzer-Report: Klick auf "Skript generieren" im Reaktions-Baukasten liefert
"An error occurred in the Server Components render. The specific message is omitted in
production builds..." - das ist Next.js' generische Fehlermeldung für einen Production-Build
(erscheint so nie im Dev-Server).

**Untersucht, aber nicht reproduziert:**
- `generateAndSaveReactionScript` (die Kernfunktion hinter dem Button) direkt aufgerufen
  (Honig-Video, 751f599d) - lief erfolgreich durch, erzeugte ein brauchbares Skript und
  speicherte es korrekt in der DB.
- Lokal einen echten Production-Build getestet (`npm run build && npm start`, Port 3001) und
  dieselbe Detailseite abgerufen - kein Fehler, Seite rendert korrekt.
- Die Browser-Preview-Session in diesem Chat war zu dem Zeitpunkt bereits unzuverlässig
  (Screenshots liefen in Timeouts, `getBoundingClientRect` lieferte durchgehend Nullen) - ein
  UI-Klick-Test war daher nicht aussagekräftig und wurde nicht als Beleg gewertet.

**Naheliegendste Erklärung:** Der Fehler wurde vermutlich auf dem **deployten Vercel-Stand**
beobachtet, der zum Zeitpunkt des Reports noch auf dem alten Phase-3-Commit lief (nichts aus
dieser Session war bis dahin gepusht) - z. B. durch eine fehlende/abweichende
`ANTHROPIC_API_KEY`-Umgebungsvariable auf Vercel, oder einen dort noch vorhandenen älteren Bug.
Mit diesem Push läuft auf Vercel erstmals der aktuelle Code inkl. aller heutigen Fixes.

**Nächster Schritt:** Nach diesem Deploy auf der echten Vercel-URL erneut "Skript generieren"
testen. Falls der Fehler weiterhin auftritt: Vercel-Function-Logs (Dashboard -> Deployment ->
Functions -> Logs) prüfen - dort steht die volle, nicht redigierte Fehlermeldung, anders als im
Browser. Siehe auch TASKS.md.

## [2026-07-07] Code-Review über die gesamte Projekthistorie (Commit 2cf8ed6 bis heute)

8 unabhängige Review-Durchgänge (Korrektheit, Reuse, Vereinfachung, Effizienz, Architektur,
CLAUDE.md-Konformität) über den kompletten Diff seit Projektstart, jeweils gegen den echten
aktuellen Code gegengeprüft. Gefixt:

- **`proxy.ts`**: Basic-Auth-Parsing hat `user:passwort` naiv an *jedem* `:` gesplittet - ein
  Passwort mit Doppelpunkt wäre lautlos abgeschnitten und die Anmeldung permanent fehlgeschlagen.
  Jetzt wird nur am ersten `:` getrennt.
- **`lib/ranking/adaptive.ts`**: `suppressMythIfRepeatedlyUninteresting` zählte Claim-*Zeilen*
  statt distinkter Video-IDs für den 3er-Schwellenwert - ein Video mit zwei Claims zum selben
  Mythos hätte allein für 2 der nötigen 3 Ablehnungen gezählt. Zählt jetzt distinkte Videos.
- **`app/api/cron/snapshot/route.ts`**: verbrauchte YouTube-Quota (videos.list) ohne sie in
  `youtube_quota_usage` zu tracken - Verstoß gegen die CLAUDE.md-Regel "Verbrauch tracken".
  Praktisch geringe Auswirkung (1 Unit/Aufruf), aber jetzt korrekt erfasst.
- **`lib/inbox/queries.ts`**: die Done-Claims-Abfrage (Duplicate-Schutz) lud bei jedem
  Seitenaufruf *alle* erledigten Claims der gesamten DB statt nur die zu den auf der Seite
  relevanten Mythen - wächst unbegrenzt mit der Feedback-Historie. Jetzt auf die aktuell
  relevanten `mythIds` gescoped (gleiche Umstellung machte die Myths-Abfrage nebenbei auch
  robuster gegen unnötige Vollzugriffe).
- **`app/api/export/route.ts`**: rief für "Angenommen" und "Erledigt" zwei komplett getrennte
  `getInboxItems`-Durchläufe auf (inkl. doppeltem Laden von Weights/Myths/Done-Claims).
  `getInboxItems`/`InboxFilters.status` akzeptiert jetzt auch ein Array, ein Aufruf reicht.
  Zusätzlich: `statusLabel()` duplizierte `STATUS_LABEL` aus `components/inbox/badges.tsx` -
  jetzt von dort importiert (exportiert), eine Quelle der Wahrheit.
- **`lib/pipeline/novelty.ts`**: `topic_deprioritized` war optional typisiert, obwohl beide
  echten Aufrufer es immer mitgeben (die DB-Spalte ist `NOT NULL`) - jetzt required, verhindert
  dass ein zukünftiger Aufrufer es versehentlich weglässt und `undefined` fälschlich als
  "false" durchrutscht.

**Bewusst nicht gefixt** (Begründung statt Diskussion):
- `lib/pipeline/quota.ts`s `addQuotaUsage` (Read-then-Write, keine atomare Erhöhung) - reale
  Race Condition bei echt gleichzeitigen Cron-/manuellen Discovery-Läufen, aber ein sauberer
  Fix bräuchte eine neue Postgres-Funktion + Migration - außerhalb des Scopes dieses Durchgangs.
- `lib/pipeline/discovery.ts`s sequenzielle YouTube-/Claude-Aufrufe in Schleifen - echtes
  Effizienzpotenzial, aber eine Parallelisierung der Kern-Pipeline ohne dedizierten Test bringt
  Regressionsrisiko, das den Zeitgewinn für dieses Projekt nicht rechtfertigt.
- Zwei Kandidaten wurden nach eigener Prüfung des tatsächlichen Codes **verworfen** (nicht
  bestätigt): ein vermuteter Double-Submit-Race in `action-buttons.tsx` (Accept/Reject teilen
  sich denselben `isPending`-State aus demselben `useTransition()`-Hook, kein Race möglich) und
  eine vermutete Doppel-`<main>`-Regression in `error.tsx`/`not-found.tsx` (beide sind volle
  Seiten-Ersetzungen ohne Suspense-Fallback-Race, anders als `loading.tsx` - die CHANGELOG-
  Formulierung dazu war nur zu ungenau, jetzt präzisiert).

## [2026-07-07] Phase 4 – Bug-Fix "bereits behandelt", Kuration, Export, Polish

### Kuration der Demo-Inbox (13 statt 15–20 Fundstücke)
Beim Kuratieren der 39 vorhandenen Videos fiel auf: die Discovery-Suchqueries sind die
Mythen-Namen selbst (z. B. "keine Kohlenhydrate nach 18 Uhr"), das findet strukturell sowohl
Videos, die den Mythos verbreiten, als auch Fakten-Check-/Debunking-Kanäle zum selben
Suchbegriff. Bei manueller Prüfung jedes 100%-Confidence-Matches (Zitat, bei Grenzfällen
Volltranskript) stellte sich heraus, dass ein erheblicher Teil der automatisch gematchten
Videos neutrale, bereits korrekte oder sogar explizit entkräftende Aussagen enthält (z. B.
Ärzte-Kanäle, die Honig sachlich einordnen, oder Reissirup/"Christian Wolf"-Reaktionsvideos)
statt der Falschaussage selbst - ein Video war sogar eine Stand-up-Comedy-Nummer.

**Reaktion (mit Rücksprache):** zusätzlicher, gezielter Discovery-Lauf mit neuen,
assertions-artig formulierten Suchqueries ("Honig macht nicht dick" statt "...Mythos") statt
der bisherigen Mythos-/Frage-Formulierungen, die vor allem Fakten-Checker antriggern. Fand
deutlich mehr echte Treffer (707/10.000 Units verbraucht). Nach Prüfung aller Kandidaten:
**42 Videos** per direktem DB-Update auf `rejected` gesetzt (mit ehrlichem, individuell
geprüftem Grund je Video - "Aussage nicht klar falsch" für neutrale/entkräftende/ironische
Treffer, "Zu kleine Reichweite" für Videos mit sehr wenig Views), bewusst **nicht** über
`applyAdaptiveRanking` (das wäre redaktionelle Bereinigung, keine organische Nutzung -
`weights` bleiben bei den Defaults). Darunter 2 zuvor fälschlich "Angenommene" Videos
(Test-Session-Artefakte, keine echte Redaktionsentscheidung) und Chris' eigenes YouTube-Video
zum Datteln-Mythos (jetzt `myths.covered_by_chris = true` + `chris_video_url` gesetzt - damit
ein echter, belegter Teil des offenen "~20 Mythen-Videos"-Tasks erledigt). Bei einem Video
(751f599d, "Honig kann beim Abnehmen helfen!") wurde das gespeicherte Zitat gegen einen
klareren, ebenfalls verbatim im Transkript geprüften Satz aus demselben Video ausgetauscht.

**Ergebnis:** 10 Videos in "Neu" (Score 46–73, Confidence ≥70%), 1 "Angenommen", 2 "Erledigt"
– macht 13 statt der geplanten 15–20. Bewusst nicht mit schwächeren/mehrdeutigen Funden auf
20 aufgefüllt (Prinzip: keine Ironie-Erkennung, False Positives sind der teuerste Fehler).
Zwei der 10 zeigen `alreadyHandledElsewhere=true` (Duplicate-Schutz live sichtbar: derselbe
Mythos wurde bereits in einem "Erledigt"-Video behandelt) - gutes Demo-Material für den Loom.
Die Score-Spanne deckt "Mittlere" bis "Hohe Priorität" ab, nicht "Sehr hohe" (80+) oder
"Niedrige" (<40) - dafür hätte ein Video mit Multi-Millionen-Views UND klarer Falschaussage
gefunden werden müssen; solche Kombination kam in diesem Themenfeld nicht vor.

### Design-Polish
`app/loading.tsx` (Karten-Skeleton) und `app/videos/[id]/loading.tsx` (Block-Skeleton) sowie
`app/error.tsx` (freundlicher Fehlertext + Retry) und `app/videos/[id]/not-found.tsx` neu -
vorher gab es keinen eigenen Loading-/Error-State, nur `force-dynamic`. Karten in der Inbox
bekommen ein dezentes, gestaffeltes Fade-in (`tw-animate-css`, keine neue Dependency).

**Live gefundener und gefixter Bug beim Bauen:** Sowohl `loading.tsx` als auch die echte Seite
rendern ein `<main>` - bei einer echten Hard-Navigation (Streaming-SSR, `force-dynamic`) blieb
das leere Fallback-`<main>` nach dem Swap als Geisterelement im DOM (per `preview_eval` live
nachgestellt: `document.querySelectorAll('main').length` war 2 statt 1). Kein sichtbarer
visueller Fehler, aber ungültiges Markup (zwei "main"-Landmarks verwirren Screenreader) und ein
Fussabdruck fuer jeden Code, der `document.querySelector('main')` erwartet. Betrifft nur die
beiden `loading.tsx`-Dateien (echte Suspense-Fallbacks, die neben der echten Seite existieren
koennen) - `error.tsx`/`not-found.tsx` sind volle Seiten-Ersetzungen ohne diese Race und
behalten bewusst ihr eigenes `<main>`. Fix: beide `loading.tsx` rendern jetzt `<div>` statt
`<main>` - pro Seite existiert dadurch garantiert genau eine `<main>`-Landmark.

**Live geprüft:** Mobile-Viewport 375px (kein horizontales Overflow, Inbox + Detailseite +
Export-Links + Not-Found), Ladezeit Inbox 296–884ms (Ziel < 1,5 s laut ROADMAP, deutlich
unterschritten), leerer Filter-Zustand, Not-Found-Seite.

### Gefundener Bug (vor Live-Auswirkung gefixt)
Nutzer-Hinweis: Wenn ein Mythos durch 3x Reject mit Grund "Thema uninteressant" als
`covered_by_chris=true` markiert wird (`suppressMythIfRepeatedlyUninteresting` in
`lib/ranking/adaptive.ts`), hätte die Detailseite fälschlich "Dieser Mythos wurde bereits
behandelt (Duplicate-Schutz)" angezeigt (`lib/inbox/scoreBullets.ts`) - obwohl Chris den Mythos
nie in einem eigenen Video aufgegriffen hat, sondern ihn nur wiederholt als uninteressant
abgelehnt hat. Die Karten-/Detail-Badge (`HandledElsewhereBadge`) war davon nicht betroffen (hängt
korrekt nur an einem echten `status=done`-Video), aber der Score-Bullet-Text auf der Detailseite
verwechselte beide Faelle. Root Cause: `covered_by_chris` wurde fuer zwei verschiedene Bedeutungen
wiederverwendet. Fix: neue Spalte `myths.topic_deprioritized` (Migration `0005`) trennt "Chris hat
das Thema abgelehnt" von "Chris hat dazu schon ein Video". Die Score-Absenkung (Novelty-Faktor)
bleibt fuer beide Faelle identisch zu vorher (`isMythNovel` prueft jetzt
`covered_by_chris OR topic_deprioritized`) - nur die Anzeige unterscheidet jetzt ehrlich. In der
Live-DB war noch kein Mythos betroffen (keine 3 "Thema uninteressant"-Rejects zum selben Mythos
bisher), der Bug war also latent, nicht bereits sichtbar.

## [2026-07-07] Phase 3 – Reaktions-Baukasten, Adaptive Ranking, URL-Import

### Gebaut
- **Reaktions-Baukasten** (MASTERPLAN §3.3): `lib/reaction/` generiert Hook (3 Varianten),
  Kernargument, Analogie und CTA per Claude (Tool-Use, gleicher robuster Client wie die
  Pipeline – dafür extrahiert nach `lib/claude/client.ts`, jetzt von Pipeline UND
  Reaktions-Baukasten geteilt). **Quellen kommen bewusst nicht von Claude**, sondern direkt
  aus dem bereits web-verifizierten `myths.sources_json` – keine Halluzinationsgefahr.
  Ergebnis wird in `videos.reaction_script` (Migration `0004_reaction_scripts.sql`)
  persistiert, damit nicht bei jedem Seitenaufruf neu generiert werden muss.
  UI (`components/inbox/reaction-builder.tsx`): prominent auf der Detailseite (Angenommen/
  Erledigt), jeder Teil einzeln kopierbar plus ein "Alles kopieren"-Button.
- **Ton-Kalibrierung**: 4 Transkript-Ausschnitte von Chris als Stilreferenz
  (`lib/reaction/styleReference.ts`), abgerufen über das bestehende Transkript-Modul aus den
  zwei Videos, die schon fürs E-Book als Referenz dienten. Ausgewählt wegen unterschiedlicher
  stilistischer Signale: die "dumme Ratte"-Analogie (Chris' Reframing-Technik), eine direkte/
  provokante Passage ("das ist wie Masochismus"), persönliche Offenheit (eigene
  Diät-/Fressattacken-Geschichte) und ein lockerer Studien-Bezug mit Alltagsbeispiel.
- **Adaptive Ranking** (MASTERPLAN §3.5, `lib/ranking/adaptive.ts`): "Zu kleine Reichweite" /
  "Aussage nicht klar falsch" / "Bereits behandelt" erhöhen das jeweils passende
  Score-Gewicht (reach/confidence/novelty) leicht und renormalisieren alle 5 Gewichte auf
  Summe 1.0, geklemmt in [0.05, 0.6] (kein Nullfaktor). "Thema uninteressant" hat keine
  eigene Score-Komponente – stattdessen wird der gematchte Mythos nach 3 solchen
  Ablehnungen als `covered_by_chris` markiert (nutzt die bestehende Novelty-Logik statt
  neuer Infrastruktur). 7 Unit-Tests für die Renormalisierung.
- **Manueller URL-Import** (MASTERPLAN §5): UI-Formular auf der Inbox
  (`components/inbox/url-import-form.tsx`), ruft die bereits aus Phase 1 bestehende
  `/api/pipeline/import`-Route auf; bei Erfolg Redirect zur Detailseite, bei Skip/Fehler
  Inline-Meldung.

### Live-Test: Reaktions-Baukasten mit 2 echten Videos
1. **"Das vergessene Heilmittel Honig..."** (Honig-Mythos) → Hooks u. a. "Honig ist gesünder
   als Zucker, oder? Sorry, aber das ist einer der hartnäckigsten Mythen..."; Analogie:
   SUV-Vergleich ("Ich fahre nicht mit dem SUV in die Stadt, sondern mit dem etwas kleineren
   SUV...").
2. **"Die späten Abendessen füllen die Särge..."** (Kohlenhydrate-nach-18-Uhr-Mythos) →
   Hooks u. a. "...müsste dein Körper ja quasi eine innere Uhr haben, die um Punkt sechs auf
   'Fettspeicher-Modus' umschaltet. Spoiler: Die hat er nicht."; Analogie: Auto/Tankstelle
   nachts vs. tagsüber.

Beide live über die UI verifiziert (Generieren-Button, Kopieren-Buttons inkl.
Clipboard-Inhalt geprüft, Mobile-Viewport), nicht nur per Script.

### Entschieden
- Claude-API-Client aus `lib/pipeline/claude.ts` nach `lib/claude/client.ts` extrahiert,
  damit der Reaktions-Baukasten dieselbe robuste Tool-Use-Logik nutzt statt sie zu
  duplizieren.
- Adaptive Ranking bewusst nur auf die 3 Reject-Gründe angewendet, die sich ehrlich auf eine
  bestehende Score-Komponente abbilden lassen. "Thema uninteressant" hätte laut
  MASTERPLAN-Beispiel ("Keto-Themen sinken im Ranking") einen Per-Kategorie-Mechanismus
  gebraucht, den die `weights`-Tabelle (nur 5 globale Keys) nicht hergibt – statt dafür neue
  Schema-Komplexität einzuführen, wird die bestehende `covered_by_chris`/Novelty-Logik
  wiederverwendet, die denselben Effekt (sinkender Score für den Mythos) erzielt.

---

## [2026-07-07] Phase 2 – Inbox + Detailansicht gebaut, live getestet

### Gebaut
- Design-System auf Design-Richtung B umgestellt (warmes Off-White, Charcoal, Amber-Akzent,
  Space Grotesk + Newsreader) statt Standard-shadcn-Neutralgrau – konsistent mit der
  E-Book-Richtung (MASTERPLAN.md §8). `app/globals.css`, `app/layout.tsx`.
- Inbox (`app/page.tsx`): Karten mit Thumbnail, Zitat (Serif-Pull-Quote), Score-Badge,
  Confidence-Prozent, Filter nach Status/Plattform/Thema/Score-Bereich als URL-Params
  (`components/inbox/filter-bar.tsx`), sortiert nach Opportunity Score absteigend.
- Detailseite (`app/videos/[id]/page.tsx`): die 3 Blöcke aus MASTERPLAN §3.2 – Falschaussage
  + Timestamp-Link ins Original, "Warum jetzt reagieren?" mit Score-Bullets
  (`lib/inbox/scoreBullets.ts`, 4 Unit-Tests), Confidence-Checkliste
  (`components/inbox/confidence-checklist.tsx`) inkl. Mythos-Verdict + Quellen.
- Accept/Reject mit den 4 Quick-Reasons aus MASTERPLAN §3.1 (Popover), Status-Flow
  Neu→Angenommen→Erledigt, "Bereits behandelt"-Badge (Duplicate-Schutz) – Server Actions in
  `app/actions.ts`, UI in `components/inbox/action-buttons.tsx`.
- Datenschicht `lib/inbox/queries.ts`: lädt Videos+Claims+Myths+Snapshots+Weights, berechnet
  Score/Novelty pro Video mit den bestehenden `lib/pipeline`-Funktionen (kein Duplicate-Code
  zwischen Pipeline und UI).
- Alle Seiten mit den echten 39 Videos/92 Claims aus den Pipeline-Testläufen verifiziert,
  keine künstlichen Platzhalter.
- **Nachtrag:** `CLAUDE.md` bestätigt explizit die schon in ROADMAP.md stehende Regel
  "Confidence < 70 % kommt NICHT in die Inbox" – beim Bauen zunächst nur angezeigt, nicht
  gefiltert. Nachträglich in `lib/inbox/queries.ts` gefixt: Filter gilt nur für die
  "Neu"-Warteschlange (Status-Filter "Alle" zeigt weiterhin alles, zur Transparenz/Debugging).
  Live verifiziert: Default-Ansicht zeigte vorher u. a. eine Karte mit 50 % Confidence,
  danach korrekt ausgeblendet (24 statt 36 "Neu"-Karten), unter "Alle" weiterhin sichtbar.

### Live-Test (echter Dev-Server, Basic-Auth-geschützt, reale DB)
Accept-, Reject-mit-Grund- und Erledigt-Flow einzeln gegen die echte Datenbank verifiziert
(DB-Zustand nach jedem Klick direkt geprüft, nicht nur UI-Optik). "Bereits behandelt"-Badge
gezielt getestet: zwei Videos teilen sich denselben gematchten Mythos
("Kohlenhydrate nach 18 Uhr..."); nach "Erledigt" auf dem einen zeigt das andere korrekt den
Badge, den entsprechenden Bullet-Text und einen niedrigeren Score (Novelty-Faktor sinkt auf 0).
Filter (Status/Thema/Score-Bereich) korrekt kombinierbar getestet. Mobile-Viewport (390×844)
für Inbox und Detailseite geprüft: kein horizontales Overflow, Filter-Zeile und Karten-Layout
bleiben lesbar (Fenster-Resize funktionierte im Testcontainer nicht zuverlässig, daher
Verifikation über ein same-origin `<iframe>` mit eigenem CSS-Viewport statt echtem
Browser-Resize).

### Gefundener Bug (Testartefakt, kein Produktionscode-Fehler)
Ein wiederholtes React-Hydration-Warning im Dev-Overlay entpuppte sich als Fehlalarm einer
im Testbrowser installierten Antiviren-Erweiterung (Bitdefender; injiziert `bis_skin_checked`/
`bis_register`-Attribute vor dem React-Hydration). Zur Absicherung trotzdem ein reales
Robustheits-Problem behoben: `app/page.tsx` nutzte einen Suspense-Fallback für die Video-Liste;
wenn das Reveal-Script eines gestreamten Suspense-Boundary durch eine Browser-Erweiterung
blockiert wird, bleibt der Inhalt dauerhaft in einem `hidden`-Container hängen (0×0, keine
Bilder laden). Fix: Suspense entfernt, Seite awaited die Daten direkt – für eine Inbox mit
~40 Zeilen ohnehin kein spürbarer Performance-Nachteil, aber robuster gegenüber Erweiterungen,
die Chris in seinem echten Browser installiert haben könnte.

### Entschieden
- Farbpalette/Fonts bewusst identisch zur E-Book-Richtung übernommen statt neu erfunden
  (MASTERPLAN §8 fordert Konsistenz) – Weiterverwendung eines bereits getroffenen,
  dokumentierten Entscheids ist hier die richtige Wahl, keine Bequemlichkeit.
  Serif (Newsreader) bewusst nur für Zitate/Editorial-Text, Space Grotesk für UI/Zahlen.
  Confidence-/Score-Badges nutzen Intensitätsstufen der Markenfarbe statt generischem
  Ampel-Rot/Gelb/Grün.
  Oberhalb der ersten Bildschirmseite liegende Thumbnails erhalten `priority` (echter
  Next.js-Performance-Vorteil für LCP, kein reiner Test-Workaround).
- Bilder oberhalb des ersten Bildschirms (erste 3 Karten, Detail-Hero) laden mit `priority`;
  der Rest bleibt nativ lazy – Standard-Next.js-Empfehlung für LCP, unabhängig vom oben
  genannten Testartefakt.
- Discovery-Cron (`app/api/cron/discover`) bleibt bewusst manuell (nicht in `vercel.json`),
  bis Phase 2 steht und der User die laufenden API-Kosten bewusst freigibt.
- Keine "Zurücksetzen auf Neu"-Aktion für Angenommen/Erledigt/Abgelehnt gebaut – nicht
  angefragt, hätte Scope unnötig vergrößert.

### Bekannter Zustand
- Aus den Live-Tests sind 2 Videos jetzt `accepted`/`done` und 1 Video `rejected` (echte,
  korrekte Beispiele des Status-Flows, kein Testmüll) – kann vor der Phase-4-Demo-Kuratierung
  bei Bedarf in Supabase zurückgesetzt werden.

---

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
