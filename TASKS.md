# TASKS – Offene Aufgaben

> Sortiert nach Priorität. ⚠ = kritischer Pfad.

## Morgen (Tag 1, Code-Start) — ✅ Phase 0 abgeschlossen
- [x] ⚠ Projekt-Setup: Next.js + TS + Tailwind + shadcn/ui, live auf Vercel deployed
- [x] ⚠ Supabase-Schema als SQL-Migration angelegt und im Supabase-Projekt ausgeführt (`supabase/migrations/0001_init.sql`)
- [x] ⚠ **Snapshot-Cron live** (`app/api/cron/snapshot` + `vercel.json`) – manuell per `?secret=`-Query-Trigger verifiziert, Antwort wie erwartet
- [x] Passwort-Middleware (`proxy.ts`, HTTP Basic Auth) – Login auf Vercel getestet, funktioniert
- [x] Mythen-DB: 32 Mythen mit Quellen eingepflegt (siehe Phase 1)

## Pipeline (Phase 1) — ✅ abgeschlossen, live getestet
- [x] YouTube-Discovery-Modul (Query-Generierung aus Mythen-DB, Quota-Zähler) – `lib/pipeline/discovery.ts`, `youtube.ts`, `quota.ts`
- [x] Transkript-Modul + Skip-Logging – `lib/pipeline/transcript.ts` (`youtube-transcript`), Skips in `discovery_log` (Migration 0002)
- [x] Claude-Prompts: Topic Detection, Claim Extraction, Normalisierung (in PROMPTS-Abschnitt des README dokumentiert) – `lib/pipeline/claude.ts`, per erzwungenem Tool-Use
- [x] Confidence-Logik (4 Checks) – `lib/pipeline/confidence.ts`, 5 Unit-Tests grün
- [x] Score-Berechnung + `weights`-Tabelle – `lib/pipeline/score.ts`, 13 Unit-Tests grün
- [x] Mythen-DB auf 32 Einträge ausgebaut (Migration `0003_myths_seed.sql`, Quellen web-verifiziert), inkl. aller 5 Beispiele aus der Ausschreibung (Honig macht nicht dick / Datteln enthalten keinen Zucker / Frühstück ist die wichtigste Mahlzeit / Süßstoffe sind ungesund / Kohlenhydrate am Abend machen dick)
- [x] **End-to-End-Test mit echten YouTube-Videos** – mehrere Discovery-Läufe gegen die echte YouTube-/Claude-/Supabase-Infrastruktur, siehe CHANGELOG für Details und gefundene/gefixte Bugs. 39 Videos, 92 Claims (37 gematcht), inkl. korrektem Skip+Log (no_transcript/off_topic/no_claims) und Confidence-Threshold-Wirkung in echten Daten beobachtet.

## UI (Phase 2–3)
- [x] Inbox-Liste mit Filtern (Plattform/Thema/Score-Bereich/Status als URL-Params) – `app/page.tsx`, `components/inbox/filter-bar.tsx`
- [x] Accept/Reject + Quick-Reasons – `app/actions.ts`, `components/inbox/action-buttons.tsx`, Popover mit den 4 Gründen aus MASTERPLAN §3.1
- [x] Detailseite (3 Blöcke: Aussage / Warum jetzt / Confidence) – `app/videos/[id]/page.tsx`
- [x] Reaktions-Baukasten (Hook ×3, Kernargument, Quellen aus Mythen-DB, Analogie, CTA, alles einzeln + gesamt kopierbar) – `lib/reaction/`, `components/inbox/reaction-builder.tsx`, live mit 2 echten Videos getestet (siehe CHANGELOG)
- [x] Manueller URL-Import – UI-Formular `components/inbox/url-import-form.tsx` auf der Inbox (Backend existierte bereits aus Phase 1)
- [x] Adaptive Ranking (MASTERPLAN §3.5) – Reject-Grund passt `weights`-Tabelle an bzw. markiert Mythos als abgedeckt (`lib/ranking/adaptive.ts`)
- [x] Status-Flow (Neu→Angenommen→Erledigt) + "Bereits behandelt"-Badge – live mit echten Daten getestet (siehe CHANGELOG)
- [x] Liste von Chris' ~20 bekanntesten Mythen-Videos recherchieren und in `myths.covered_by_chris` pflegen – 1 echter Fund durch die Pipeline selbst (Datteln-Mythos, Chris' eigener Kanal), gepflegt inkl. `chris_video_url`. Die vollständige ~20er-Liste bleibt offen (siehe Bewertung MASTERPLAN §8).

## Abschluss (Phase 4–5)
- [x] Demo-Fundstücke kuratieren – 13 statt der geplanten 15–20 (10 in "Neu", 1 "Angenommen", 2 "Erledigt"); nach striktem Zitat-Check kleiner als geplant, siehe CHANGELOG für Details/Begründung.
- [x] Export-Funktion (CSV + Markdown, `app/api/export/route.ts`)
- [x] Design-Polish (Leer-/Lade-/Fehlerzustände, Animationen, Mobile) – `app/loading.tsx`, `app/videos/[id]/loading.tsx`, `app/error.tsx`, `app/videos/[id]/not-found.tsx` neu; Karten-Fade-in-Animation; Mobile (375px) und Ladezeit (<400ms) live geprüft, siehe CHANGELOG für den dabei gefundenen/gefixten Doppel-`<main>`-Bug.
- [x] Code-Review über die gesamte Projekthistorie (8 Review-Winkel, Commit 2cf8ed6 bis heute) – 6 echte Bugs/Regeln-Verstöße gefunden und gefixt, 2 Kandidaten nach Prüfung verworfen, 2 bewusst zurückgestellt (Details/Begründung in CHANGELOG).
- [x] ⚠ **Reaktions-Baukasten-Fehler auf Vercel** – Root Cause via `vercel logs` gefunden:
  `ANTHROPIC_API_KEY` fehlte in Vercel Production/Preview-ENV (nur lokal gesetzt). Hinzugefügt
  + redeployed + live auf `cw-app-eosin.vercel.app` mit echtem Basic-Auth-Login verifiziert
  (Skript generiert sich jetzt fehlerfrei). Details in CHANGELOG.
- [x] Design-Redesign (weg vom "KI-generiert"-Look): neues Token-System (Off-White/Fast-Schwarz,
  Deep-Teal-Akzent, echte Ampel-Logik, scharfe Radien, Inter+Space-Grotesk-Typografie) auf allen
  3 Views angewendet. Dabei einen latenten Bug gefunden+gefixt (`font-display` war nie eine echte
  Tailwind-Utility). Details in CHANGELOG.
- [x] ⚠ **Untersucht: Detailseite blieb im Testbrowser im Lade-Skeleton hängen** – gezielt gegen
  die echte Vercel-URL getestet (Hard-Reload, echter Chrome-Browser: 2/3 hängen geblieben).
  Nach Gegentest in frischem, erweiterungsfreiem Chromium (Playwright, 18/18 Versuche sauber)
  bestätigt: Testbrowser-Antiviren-Erweiterung (Bitdefender), kein App-/Server-Bug.
  `app/videos/[id]/loading.tsx` wiederhergestellt (nur ans neue Hairline-Design angepasst).
  Details in CHANGELOG.
- [x] Eigene Login-Seite statt Browser-Basic-Auth: `/login` im Design-System, HMAC-signierter
  HttpOnly-Session-Cookie (`lib/auth/session.ts`), `AUTH_PASSWORD` bleibt einzige Quelle der
  Wahrheit (kein neues Secret). `AUTH_USERNAME` aus `.env.example` entfernt (ungenutzt). Details
  in CHANGELOG.
- [x] Filter-Labels + Anzeige-Bug (Base UI `items`-Prop), 7 Kontrast-Bugs (`text-accent-foreground` →
  `text-accent`), URL-Import-Feld/Button-Höhe, Auto-Search-Button (Discovery-Pipeline mit Live-Fortschritt,
  Streaming statt Polling, stoppt bei 5 Treffern/20 Kandidaten/8 Suchen), Leerzustand jetzt mit echter
  Handlung statt nur Text. Auto-Search live mit echten API-Aufrufen getestet (5 Treffer gefunden, u. a.
  Honig-Mythos, Confidence 100). Details in CHANGELOG.
- [x] `/impeccable init`: `PRODUCT.md` + `DESIGN.md`/`.impeccable/design.json` angelegt (North Star
  "Der klare Befund"), Live-Mode vorkonfiguriert.
- [x] `/impeccable critique` auf die Inbox: 24/40, kein AI-Slop, 3 P1s gefunden und direkt behoben
  (Annehmen/Ablehnen/Erledigt ohne Feedback, 2× WCAG-Kontrast-Fehler bei `--success`/`--warning`) –
  live verifiziert, Details in CHANGELOG.
- [x] Kritik-P2: Listenansicht an die "Klarer Befund"-Identität der Detailseite angleichen –
  Card-Chrome entfernt, Hairline-Trennung, nackte Score-Zahl wie Detailseite. Live + Mobile geprüft.
- [x] Kritik-P2: Keyboard-Shortcuts für Annehmen/Ablehnen/Erledigt (`a`/`1`-`4`/`d`, Zeile hovern) –
  echtes Bulk-Multi-Select bewusst zurückgestellt (siehe CHANGELOG-Begründung). Live geprüft.
- [x] `/impeccable polish`: Lade-Skeleton-Drift, Skipped-Heading-Level, fehlender Fokus-Ring,
  Touch-Targets, rohe Fehlermeldungen, stale Auth-Kommentar, globales `prefers-reduced-motion` –
  Details in CHANGELOG. Build/Lint/Tests grün.
- [x] `/impeccable audit` (ganze App, 5 Dimensionen): 16/20 ("Good"). 3 neue A11y-Funde behoben
  (Kontrast `--destructive`, Screenreader-Label auf Score-Zahl, Labels auf 2 Inputs) – Details in
  CHANGELOG. Build/Lint/Tests grün.
- [x] Titel-Redesign: kleine Caption + Fließtext-Satz ersetzt durch linksbündigen, großen Titel
  "Factcheck Inbox" (Deep-Teal, Space Grotesk), Login-Titel auf "Factcheck" angepasst, Export neben
  die Keyboard-Shortcut-Zeile statt eigener Kopfzeile verschoben. Live + Mobile (375px) geprüft.
  Details in CHANGELOG.
- [x] ⚠ **Auto-Search/URL-Import finden auf Vercel keine neuen Videos** – Root Cause bestätigt,
  Retry getestet (hilft nicht, 18/18 gescheitert vs. 18/18 lokal erfolgreich über beide Wege),
  URL-Import ist **kein** sicherer Fallback (identischer Bug). Entscheidung: als bekannte
  Einschränkung dokumentiert (README.md), kein Proxy-Dienst vor der Einreichung (keine
  laufenden Kosten rechtfertigbar). Ehrliche In-App-Fehlermeldungen statt "Keine neuen Treffer"/
  "Kein Transkript verfügbar" ergänzt. Details in CHANGELOG.
  **Update 2026-07-10: Nutzer hat Proxy-Zugangsdaten bereitgestellt, gelöst – siehe Eintrag unten.**
- [x] **Produktions-Inbox bereinigt**: Audit fand 104 Videos statt der erwarteten ~13-16
  (Feature-Test-Artefakte aus mehreren Sessions). Ein Confidence-Regelverstoß (50% in
  "Erledigt") und 5 heutige Test-Klick-Artefakte korrigiert. Sichtbar jetzt 18 Videos (10 Neu +
  6 Angenommen + 2 Erledigt), durchgängig 100% Confidence mit echtem Zitat+Timestamp+Quelle.
  Details in CHANGELOG.
- [x] Button-Redesign (`rounded-full` global, auf Nutzerwunsch mit Referenz-Screenshot) +
  FilterBar komplett neu (Button-Reihe + inline Checkbox-Panel statt Selects, dabei auf
  Multi-Select umgestellt) + Header aufgeräumt (Hotkey-Zeile entfernt, Export neben Titel).
  Live + Mobile (375px) geprüft, Build/Lint grün. DESIGN.md-Bruch bewusst dokumentiert statt
  stillschweigend übergangen. Details in CHANGELOG.
- [x] Login-Seite: generativer Flow-Field-Hintergrund (Canvas 2D, seeded, kein Asset/Package),
  auf Nutzerwunsch nach Referenzbeispiel gebaut. Mehrere Nachschliff-Runden direkt anhand von
  Nutzer-Screenshots (Glass-Card → Box komplett entfernt → Passwortfeld/Button im Glass-Stil →
  Animation läuft endlos statt einmalig zu "setzen" → Live-Zeichenrate gedrosselt, damit Striche
  nicht nach ~10s zu dick werden). Alle Tuning-Entscheidungen im Browser verifiziert statt nur
  angenommen (u. a. Fade-Raten und Prewarm/Live-Alpha-Split per Screenshot-Vergleich). Details
  in CHANGELOG.
- [x] Glass-Design + Flow-Field-Hintergrund auf die Inbox übertragen (URL-Import, Filter-Trigger,
  Auto-Search-Button im Login-Glass-Stil; Canvas jetzt auch auf `/`, aber zeitbegrenzt via neue
  `durationSeconds`-Prop statt endlos). Bewusst nicht auf Video-Zeilen/Annehmen-Ablehnen
  angewendet (Lesbarkeit/Ampel-Logik, siehe CHANGELOG-Begründung). Engine nach
  `components/flow-field-background.tsx` verschoben (jetzt von Login + Inbox genutzt). Dabei
  Auto-Search-Button-Höhe (`items-end`-Fix) und Filter-Label-Umbenennung ("Score-Bereich" →
  "Score") mit erledigt. Live verifiziert (Panel-Funktion, 10s-Stopp per Canvas-Checksumme,
  Mobile), Build/Lint grün. Details in CHANGELOG.
- [x] Video-Karten + Annehmen/Ablehnen/Als-erledigt-Buttons ins Glass-Design übertragen (explizite
  Aufhebung der vorherigen Scope-Grenze auf Nutzerwunsch). Karten jetzt eigenständig,
  abgerundet, mit Abstand statt full-bleed Hairline-Zeilen; Annehmen bleibt grün, Ablehnen
  bekommt rote Schrift statt roter Box (inkl. Fix für den bekannten `aria-expanded`-Cascade-Bug),
  Als-erledigt-markieren im dunklen Glas-Stil. Live verifiziert (Kontrast, alle drei
  Button-Zustände, 320px/375px), Build/Lint grün. Details in CHANGELOG.
- [x] Flow-Field: 3 vom Nutzer live auf dem Handy gefundene Bugs behoben – kein Fade-in beim Laden
  (synchroner Prewarm → sichtbares Aufbau-Phasen-Modell), ungewollter Reload beim mobilen Scrollen
  (resize-Handler ignoriert jetzt Adressleisten-Höhen-Jitter, reagiert nur auf echte Breiten-/
  große Höhenänderung), iOS-Zoom beim Fokussieren von Passwort-/URL-Feld (`text-sm` → `text-base`,
  16px-Schwelle). Alle drei live/per Logiktest verifiziert statt nur angenommen, Build/Lint grün.
  Details in CHANGELOG.
- [x] Zoom app-weit gesperrt (`viewport`-Export, Login/Inbox/Detailseite), Filter-Zeile auf
  iPhone-Breite auf eine Zeile gebracht, Auto-Search robust rechtsbündig (`ml-auto`), Copy-Button
  im Reaktions-Baukasten auf Icon-only verkleinert (inkl. `aria-label`). Build/Lint grün,
  Viewport-Meta + Style-Berechnungen im DOM bestätigt; voller Screenshot-Check diese Runde durch
  einen Preview-Tool-Fokus-Zustand (Tab nicht im Vordergrund) blockiert, nicht durch einen
  Code-Fehler (Details in CHANGELOG) – sollte nach Tool-Neustart nachgeholt werden.
- [x] Ablehnen-Grund-Dropdown auf dasselbe Panel-Design wie die Filter umgestellt
  (`rounded-[12px] p-4`, identische Werte wie `filter-bar.tsx`). Build/Lint grün; visuelle
  Bestätigung durch denselben Preview-Tool-Fokus-Zustand blockiert wie im Eintrag darüber.
- [x] **YouTube-Transkript-IP-Blocking gelöst** – Requests laufen jetzt optional über einen
  rotierenden Webshare-Residential-Proxy (`PROXY_*`-Env-Vars, `createProxyFetch()` in
  `lib/pipeline/transcript.ts`), Fallback auf direkten `fetch` falls nicht konfiguriert.
  Mehrstufig live verifiziert: IP-Rotation gemessen, Vercel-Preview-Test zunächst 2/4 (neuer
  Fehler `YoutubeTranscriptVideoUnavailableError` bei vereinzelten Proxy-IPs), nach Erhöhung von
  `TRANSCRIPT_FETCH_ATTEMPTS` 3→5 dann 4/4 (vom Nutzer selbst im Browser gegen die Preview
  bestätigt). Nebenbei entdeckt+behoben: `AUTH_PASSWORD` war für die Preview-Umgebung leer
  (Production unverändert, echtes Passwort). Details in CHANGELOG.
- [x] **Auto-Search fand trotz Proxy-Fix 0 neue Videos** – `discovery_log` blockierte 70 alte
  `no_transcript`-Skips (von vor dem Proxy-Fix) dauerhaft von erneuter Prüfung.
  `filterUnseenVideoIds()` schließt `no_transcript`-Skips jetzt von der "schon gesehen"-Liste aus
  (`off_topic`/`no_claims` bleiben ausgeschlossen, sind stabile inhaltliche Urteile). Live
  verifiziert: `--discover`-Lauf fand danach 2 statt 0 neue IDs, eine erfolgreich importiert
  (100 % Confidence, Score 70). Details in CHANGELOG.
- [ ] ⚠ **Reaktions-Baukasten verschwindet lautlos ohne Mythos-Match** – entdeckt beim Nachtesten
  mit einem manuell importierten Video. Sichtbarkeitsbedingung in `app/videos/[id]/page.tsx:186`:
  `(video.status === "accepted" || video.status === "done") && claim.myth`. Ohne gematchten
  Mythos (`claim.myth === null`, weil `normalizeAndMatch()` in `lib/pipeline/claude.ts` keinen
  Treffer in der fest kuratierten `myths`-Tabelle fand) wird der ganze Abschnitt gar nicht erst
  gerendert – kein Hinweis, keine Erklärung. Betrifft potenziell jedes manuell importierte Video,
  dessen Behauptung keinem der vorab kuratierten Mythen entspricht (bei den 18 Demo-Videos war
  das kein Problem, weil die gezielt zu vorhandenen Mythen passen). Ursache liegt tiefer:
  `generateAndSaveReactionScript()` (`lib/reaction/generate.ts:18`) wirft bewusst einen Fehler
  ohne `myth_id`, weil das Reaktions-Skript ein verifiziertes `verdict` aus der Mythen-DB braucht
  und nichts frei erfinden soll. Fix-Vorschlag (noch nicht umgesetzt, mit Nutzer abstimmen):
  bei fehlendem Mythos-Match eine ehrliche Inline-Meldung zeigen ("Kein Reaktions-Baukasten
  möglich – keinem bekannten Mythos zugeordnet") statt den Bereich stillschweigend wegzulassen –
  passt zum bestehenden Prinzip "ehrliche Fehlermeldungen statt stiller Fails" im Projekt.
- [ ] ⚠ **"Noch kein Video von Chris" ist nicht gegen seinen echten Kanal verifiziert** – aktuell
  **nicht behebbar** ohne Chris/Kanal-Zugriff, nur dokumentiert. `covered_by_chris` ist bei allen
  32 kuratierten Mythen (`0003_myths_seed.sql`) auf `false`, `chris_video_url` nie befüllt – nie
  einzeln gegen seinen echten Kanal geprüft, nur Default beim Kuratieren. Die Novelty-Aussage
  bedeutet dadurch faktisch nur "noch nicht innerhalb dieser App erledigt", nicht "Chris hat das
  nie behandelt" (`lib/pipeline/novelty.ts`). Details + Fix-Idee (manueller Abgleich aller 32
  Mythen gegen Chris' Kanal, falls/wenn möglich) in README.md.
- [ ] ⚠ **Migration `0006_own_channel_skip_reason.sql` muss noch im Supabase SQL Editor
  ausgeführt werden** (wie 0001–0005) – erweitert das `discovery_skip_reason`-Enum um
  `own_channel`. Der Filter selbst funktioniert schon ohne die Migration (Chris' eigene Videos
  werden korrekt nicht importiert), nur das Skip-Logging dafür schlägt bis dahin fehl.
- [x] **Chris' eigene Videos (@christianwolf) werden nie mehr als Vorschlag importiert** –
  Channel-ID via YouTube API aufgelöst (`UC_NsZgQdK4lTleq_siGOdJw`), `processVideo()` prüft das
  vor Transkript-/Claude-Aufwand, gilt für Auto-Search und manuellen Import gleichermaßen. Live
  mit einem echten aktuellen Video seines Kanals verifiziert. Details in CHANGELOG.
- [x] E-Book-Seite (`/ebook`) mit echter Blätterfunktion – Button neben Export in der
  Inbox-Kopfzeile, gleicher Flow-Field-Hintergrund/Header-Stil wie die Inbox. PDF-Seiten vorab mit
  `pypdfium2` zu JPEGs gerendert (`scripts/render-ebook-pages.py`, Ergebnis eingecheckt unter
  `public/ebook/`) statt Live-Rendering im Browser – robuster ohne pdf.js-Worker-Setup, schneller
  beim Blättern bei nur 30 Seiten fester Größe. Realistischer 3D-Seitenumschlag über
  `react-pageflip`, inkl. Cover-Einzelseite, automatischem Wechsel Einzel-/Doppelseite auf Mobile
  und Download-Link auf die Original-PDF. `next/image` dabei mit `unoptimized`, weil Next.js'
  Bildoptimierung intern über `/_next/image` erneut gegen den eigenen Server fetcht – dieser
  interne Request trägt keinen Auth-Cookie und wurde vom `proxy.ts`-Passwortschutz auf `/login`
  umgeleitet, was Next.js als "kein gültiges Bild" quittierte. Live im Dev-Server getestet
  (Desktop-Doppelseite, Mobile-Einzelseite, Tastatur-Pfeile, Download-Link).
- [x] **Auto-Search-Button blieb bei "0/5 gefunden" hängen** – Live-Diagnose (Rohdaten der
  Streaming-Response direkt im Browser mitgeloggt) zeigte: lokal im Dev-Server liefert die
  Streaming-Response tatsächlich inkrementell aus, auf Vercels Node-Serverless-Funktionen wird sie
  aber vermutlich bis zum Ende der Funktion gepuffert (bekannte Plattform-Einschränkung ohne Edge
  Runtime) – der Client sah dadurch alle Fortschritts-Events erst auf einmal am Ende. Fix: neuer
  Endpunkt `GET /api/pipeline/auto-search/status?since=` pollt alle 1,5 s den tatsächlichen
  DB-Stand (Claims mit Confidence ≥ 70 % seit Suchstart, `lib/pipeline/confidence.ts`) statt sich
  auf die Streaming-Response zu verlassen – aktualisiert Zähler UND ruft `router.refresh()` auf,
  sodass neu gefundene Videos während der Suche live in der Inbox erscheinen (keine neue
  Job-State-Tabelle, nutzt `claims.created_at`). Streaming-Code bleibt als Bonus erhalten (falls
  die Plattform doch inkrementell ausliefert). Live mit zwei echten Auto-Search-Läufen getestet:
  Polling feuert zuverlässig alle 1,5 s, stoppt sauber bei Suchende, keine Konsolenfehler; der
  Status-Endpunkt lieferte für das Zeitfenster des ersten Laufs korrekt 7 gefundene Videos (mit
  den tatsächlich in der Inbox gelandeten Funden abgeglichen).
- [x] **Auto-Search brach nach dem Polling-Fix teils trotzdem mitten im Lauf ab** – Nutzer
  meldete "mal 1/5, dann kein Treffer, dann hört es auf". Ursache: ein voller Lauf kann real
  80-150+s dauern (mehrere Claude-Aufrufe + Transkript-Proxy-Retries pro Kandidat, live
  gemessen), `maxDuration = 300` auf der Route verlässt sich aber darauf, dass Vercels
  Node-Serverless-Funktionen so lange durchlaufen dürfen - je nach Plan/Konfiguration werden
  lang laufende Requests dort ohne saubere Antwort gekappt. Fix: `runDiscovery()`
  (`lib/pipeline/discovery.ts`) bekommt einen `deadline`-Parameter und bricht selbst sauber nach
  40s ab (`summary.timedOut`), statt die Plattform-Grenze zu riskieren. Der Client
  (`auto-search-button.tsx`) hängt bei `timedOut = true` automatisch einen Folge-Request an (max.
  5 insgesamt), bis 5 Treffer erreicht sind oder nichts Neues mehr zu finden ist
  (`videoIdsNew === 0`) - die anderen Stop-Gründe (Ziel erreicht, MAX_CANDIDATES/MAX_SEARCHES)
  lösen bewusst KEINE Verkettung aus, sonst würde das die bestehende Kostenbremse aushebeln.
  Nebenbei einen zweiten Bug im selben Code gefixt: die finale Erfolgsmeldung nutzte nur die
  Stream-Daten des letzten Versuchs statt der über Polling+Streaming gemeinsam ermittelten besten
  bekannten Zahl - dadurch konnte der Zähler "1/5" zeigen und die Toast-Meldung trotzdem "Keine
  neuen Treffer" sagen. Alle 45 bestehenden Unit-Tests weiterhin grün, `npm run build`/
  `npm run lint` sauber. Live getestet: ein Lauf schloss nach 33,5s (unter der 40s-Grenze) sauber
  mit "done" ab, ohne unnötige Verkettung.
- [x] **Auto-Search-Verkettung: echten Test statt nur Code-Review verlangt** – Nutzer wollte den
  Timeout/Verkettungs-Pfad wirklich live beobachtet sehen, nicht nur gegengelesen ("dieser Pfad
  ist zu fehleranfällig, um ihn ungetestet zu lassen"). Beim Versuch, das mit einer künstlich
  verkürzten Deadline zu erzwingen, direkt die echte YouTube-Tagesquota (10.000 Units, 100
  Suchen à 100 Units) durch die vorherigen Testläufe aufgebraucht vorgefunden – keine weiteren
  echten Suchen mehr möglich. Nutzer hat sich für die dritte Option entschieden (dauerhafter
  automatisierter Test statt Mock-Stub oder Warten auf Quota-Reset):
  - Dabei durch genaues Nachdenken einen echten Bug in der eigenen Fix-Logik gefunden, bevor er
    in Produktion hätte auffallen können: `timeUp()` wurde in `targetReached()` zuerst geprüft
    und hat bei einem zeitgleichen Erreichen von `maxCandidatesProcessed` fälschlich `timedOut =
    true` durchgereicht → hätte eine unnötige Verkettung ausgelöst, obwohl das
    Sicherheitsnetz eigentlich sauber gegriffen hatte. `discovery.ts` umstrukturiert: die
    "Ziel erreicht/Sicherheitsnetz/alle Kandidaten durchgelaufen"-Prüfung
    (`otherStopReached`/`allCandidatesChecked`, aus einem expliziten `brokeEarly`-Flag statt aus
    `checkedCount`/`newIds.length` abgeleitet, da `getVideoDetails` pro Batch weniger Details
    liefern kann als angefragt) läuft jetzt immer VOLLSTÄNDIG und wird erst am Ende einmalig mit
    der Zeit-Prüfung kombiniert (`computeTimedOut`), statt sich gegenseitig per Kurzschluss-Logik
    zu verdecken.
  - `computeTimedOut` (discovery.ts) und `shouldChainNextAttempt`/`runChainedSearch`
    (neu: `lib/pipeline/autoSearchChain.ts`) als reine, netzwerkfreie Funktionen extrahiert und
    mit 18 neuen Tests abgesichert (`discovery.test.ts`, `autoSearchChain.test.ts`) – u. a. wird
    per echter (nicht simulierter) Nebenläufigkeitsmessung bewiesen, dass Folge-Requests niemals
    überlappend laufen, dass genau ein Folge-Request bei Timeout ausgelöst wird, dass
    MAX_ATTEMPTS eine Dauerschleife deckelt, und dass ein serverseitiger Fehler (z. B.
    Quota-Überschreitung) nie retried wird. `auto-search-button.tsx` ruft jetzt `runChainedSearch`
    auf statt einer eigenen inline while-Schleife – Produktionscode und Test decken denselben Pfad
    ab.
  - Live verifiziert (ohne weitere Quota zu verbrauchen): ein echter Klick gegen die
    quota-erschöpfte YouTube-API löste den neuen `serverError`-Pfad aus – genau ein
    `POST /api/pipeline/auto-search` in den Server-Logs (kein Retry), Button korrekt zurück auf
    "Auto-Search" (Idle). 63 Unit-Tests grün, `npm run build`/`npm run lint` sauber.
- [x] **Auto-Search: "x/5"-Zähler entfernt, Quota-Fehler klar benannt** – Nutzer meldete zum
  dritten Mal "funktioniert noch immer nicht" und wollte nur noch "Auto-Search" am Button.
  Ursache diesmal war KEIN Code-Bug, sondern die aufgebrauchte YouTube-Tagesquota (durch die
  vielen echten Testläufe der Vorsessions) → jeder Klick bekam sofort `429 RESOURCE_EXHAUSTED`.
  Per Einzel-Probe (1 search.list = 1 % Budget) am 2026-07-13 bestätigt, dass die Quota wieder da
  ist (HTTP 200). Umgesetzt: Live-Zähler raus (Button nur noch "Auto-Search" + Spinner, kein
  `foundCount`-State mehr; Live-Inbox-Refresh via Polling bleibt), und Quota-/429-Fehler werden
  jetzt als eigener Fall (`isQuotaError`) mit verständlicher Meldung angezeigt statt als rohes
  "Suche fehlgeschlagen: … 429 {…}". Verhalten (bis 5 Treffer oder Timeout) war schon vorher
  korrekt und unverändert. Build/Lint/63 Tests grün. Lokaler Browser-Test des kompletten
  End-to-End-Laufs bewusst NICHT gemacht: Dev-Login ist passwortgeschützt (Passwörter tippe ich
  nicht) und ein voller Lauf würde erneut Quota kosten – stattdessen Code-Inspektion + Quota-Probe.
- [ ] Loom-Skript schreiben (Narrativ: Pipeline ist das Produkt)
- [ ] `CRON_SECRET` vor der finalen Einreichung rotieren (aktueller Wert war zum manuellen Testen per Browser-URL sichtbar)
- [x] `AUTH_PASSWORD` ist in Vercel Production bereits ein echtes Passwort (nicht mehr `test-local-only`) – beim Nachtesten entdeckt, nur der Haken hatte noch gefehlt
- [ ] Einreichung via Tally

## E-Book (parallel laufend)
- [ ] ~9 Higgsfield-Bilder generieren + manuell hochladen (Batch)
- [ ] Bilder in PDF v0.5 einbetten, Platzhalter ersetzen
- [ ] Finale Durchsicht: Typos, Seitenumbrüche, Bildqualität
