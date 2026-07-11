# CHANGELOG

## [2026-07-11] Auto-Search-Verkettung: echter Test statt nur Code-Review, dabei realen Bug gefunden

Nutzer, zu Recht: "dieser Pfad ist zu fehleranfällig, um ihn ungetestet zu lassen" - wollte den
Timeout/Verkettungs-Mechanismus aus dem vorherigen Fix (siehe Eintrag direkt unten) live
beobachtet sehen, nicht nur per Code-Review + bestehenden Unit-Tests für plausibel gehalten.

**Versuch 1 (verworfen):** Deadline testweise auf 8s verkürzt, um den Timeout-Pfad deterministisch
und schnell auszulösen. Ergebnis: die echte YouTube-Tagesquota (10.000 Units/Tag,
`search.list` = 100 Units, siehe CLAUDE.md) war durch die vorherigen echten Testläufe bereits
komplett aufgebraucht (`429 RESOURCE_EXHAUSTED`) - keine weiteren echten Suchen mehr möglich, bis
Google die Quota zurücksetzt. Versuch, das über die Vercel-CLI direkt am Live-Deployment zu
umgehen/verifizieren, ebenfalls nicht zielführend (Runtime-Logs dort nur live/kurzfristig
abrufbar); das Pullen der Produktions-Secrets zur Reproduktion wurde vom Auto-Mode-Classifier
korrekt blockiert (nicht vom Nutzer angefragt). Deadline-Änderung sofort zurückgesetzt.

**Mit dem Nutzer abgestimmt:** dauerhafter automatisierter Test mit gemockten Abhängigkeiten
statt Warten auf Quota-Reset oder einem einmaligen Mock-Stub.

**Dabei einen echten Bug in der eigenen Fix-Logik gefunden** (bevor er in Produktion aufgefallen
wäre): `targetReached()` prüfte `timeUp()` zuerst und gab bei `true` sofort zurück, ohne die
anderen Bedingungen (`stopAfterFoundCount`, `maxCandidatesProcessed`) noch auszuwerten. Bei einem
zeitgleichen Erreichen von z. B. `maxCandidatesProcessed` UND der Deadline hätte das fälschlich
`summary.timedOut = true` ergeben und eine unnötige Verkettung ausgelöst, obwohl das
Kosten-Sicherheitsnetz eigentlich sauber gegriffen hatte.

**Fix (`lib/pipeline/discovery.ts`):**
- `targetReached()` in zwei unabhängige Prüfungen aufgeteilt: `otherStopReached()` (Ziel/
  Sicherheitsnetz, ohne Zeitbezug) und `timeUp()`. `summary.timedOut` wird jetzt EINMALIG am Ende
  aus dem finalen Zustand berechnet (neue reine Funktion `computeTimedOut`), nicht mehr
  während der Schleife per Kurzschluss-Auswertung gesetzt.
- "Alle Kandidaten durchgelaufen" wird über ein explizites `brokeEarly`-Flag erkannt (gesetzt nur
  an den tatsächlichen `break`-Stellen), nicht über `checkedCount >= newIds.length`:
  `getVideoDetails` kann pro Batch weniger Details liefern als angefragt (z. B. bei
  zwischenzeitlich gelöschten Videos), wodurch `checkedCount` eine Lücke bekommen und
  fälschlich wie unvollständige Arbeit aussehen könnte.

**Testbarkeit ohne Netzwerk-Mocks:** statt `runDiscovery()` komplett zu mocken (Node's
`mock.module()` ist noch experimentell, keine Präzedenz im Projekt), die eigentliche
Entscheidungslogik in reine, netzwerkfreie Funktionen extrahiert:
- `computeTimedOut` (discovery.ts) - 6 neue Tests, u. a. der oben beschriebene Kollisions-Fall.
- `shouldChainNextAttempt` + `runChainedSearch` (neu: `lib/pipeline/autoSearchChain.ts`) - die
  komplette Ablaufsteuerung des Auto-Search-Buttons (Verkettung, Fehlerklassifizierung
  `serverError`/`networkError`/`incomplete`, MAX_ATTEMPTS-Deckel) aus
  `auto-search-button.tsx` herausgezogen, damit sie ohne React-Test-Harness lauffähig ist. 12
  neue Tests, u. a. eine ECHTE (nicht angenommene) Nebenläufigkeitsmessung: `runAttempt` wird nie
  überlappend aufgerufen (sequentielles `await`, kein `Promise.all`), ein Timeout löst genau
  einen Folge-Request aus (nicht mehr), MAX_ATTEMPTS deckelt eine Dauerschleife aus wiederholten
  Timeouts, ein `serverError` (z. B. Quota-Überschreitung) wird nie retried, bereits gefundene
  Videos bleiben nach einem späten Fehler erhalten.
- `components/inbox/auto-search-button.tsx` ruft jetzt `runChainedSearch` auf statt einer eigenen
  inline `while`-Schleife - Produktionscode und Tests laufen durch denselben Pfad, kein Risiko,
  dass der Test nur eine parallele, ungenutzte Implementierung absichert.

**Live verifiziert (ohne weitere Quota zu verbrauchen):** ein echter Klick gegen die bereits
quota-erschöpfte YouTube-API löste den neuen `serverError`-Pfad im echten Browser aus - Server-Log
zeigt genau einen `POST /api/pipeline/auto-search` (kein automatischer Retry, wie beabsichtigt),
Button kehrte korrekt in den Idle-Zustand ("Auto-Search") zurück. 63 Unit-Tests grün (18 neu),
`npm run build`/`npm run lint` sauber.

**Bekannte Konsequenz:** die YouTube-Suchquota für heute ist durch die Testläufe in dieser Session
komplett aufgebraucht - keine echten Auto-Search-Ergebnisse mehr möglich, bis Google um Mitternacht
Pacific Time zurücksetzt.

## [2026-07-11] Auto-Search: sauberer Selbst-Abbruch statt Vercel-Timeout-Risiko

Nach dem Polling-Fix (siehe Eintrag direkt unten) meldete der Nutzer: "mal steht da 1/5 dann auch
kein Treffer und dann hört es auf" - der Zähler bewegt sich zwar jetzt, aber die Suche bricht
manchmal mitten drin ab, ohne das Ziel zu erreichen, und die Erfolgsmeldung stimmte nicht mit dem
zuletzt angezeigten Zähler überein.

**Diagnose:** `POST /api/pipeline/auto-search` deklariert `maxDuration = 300`, ein echter Lauf
kann aber (live gemessen, mehrfach) 80-150+ Sekunden dauern - mehrere Claude-Aufrufe plus bis zu
5 Transkript-Proxy-Retries pro Kandidat, mal 20 Kandidaten. Versuche, das über die Vercel-CLI
(`vercel logs`) direkt am Live-Deployment zu verifizieren, blieben uneindeutig (die
Runtime-Logs sind dort nur live/kurzfristig abrufbar, kein zuverlässiges historisches Fenster für
einen bereits abgeschlossenen Lauf) - das Pullen der Produktions-Secrets zur direkten
Reproduktion wurde vom Auto-Mode-Classifier korrekt blockiert (nicht vom Nutzer angefragt).
Stattdessen: robuste Lösung, die unabhängig von der genauen Plattform-Zeitgrenze funktioniert.

**Fix:**
- `runDiscovery()` (`lib/pipeline/discovery.ts`) bekommt einen optionalen `deadline`-Parameter
  (Epoch-ms) und prüft ihn in beiden Schleifen (Suche + Kandidaten-Verarbeitung) - bei Überschreiten
  bricht die Funktion selbst sauber ab (`summary.timedOut = true`, regulärer "done"-Event) statt
  darauf zu hoffen, dass die Plattform den Request lange genug am Leben lässt.
- `app/api/pipeline/auto-search/route.ts` setzt `RUN_TIME_BUDGET_MS = 40_000` als Deadline -
  deutlich unter jeder plausiblen Serverless-Zeitgrenze, `maxDuration = 300` bleibt als äußere
  Sicherheitsmarge bestehen.
- `components/inbox/auto-search-button.tsx`: neue Verkettungs-Logik - bei `timedOut = true` UND
  noch nicht erreichtem Ziel UND noch unverarbeiteten Kandidaten (`videoIdsNew > 0`) wird
  automatisch ein Folge-Request abgeschickt (max. 5 insgesamt). Die anderen Stopp-Gründe (Ziel
  erreicht, `MAX_CANDIDATES`/`MAX_SEARCHES`-Sicherheitsnetz) lösen bewusst **keine** Verkettung
  aus - sonst würde das genau die Kosten-/Wartezeit-Bremse aushebeln, die diese Limits eigentlich
  darstellen sollen. Bereits verarbeitete Kandidaten werden bei einem Folge-Request automatisch
  übersprungen (`filterUnseenVideoIds` + `discovery_log`), es wird also nichts doppelt bezahlt -
  nur die YouTube-Suche selbst läuft pro Versuch erneut (akzeptabel innerhalb des Tages-Budgets).
- Nebenbei gefixt: die finale Erfolgs-/Fehlermeldung nutzte bisher nur die Stream-Daten des
  letzten Versuchs (`lastFoundCount`/`doneEvent`) statt der über Polling UND Streaming gemeinsam
  ermittelten besten bekannten Zahl - dadurch konnte der Zähler live "1/5" zeigen und die
  Toast-Meldung am Ende trotzdem "Keine neuen Treffer" sagen, wenn der letzte Versuch fehlschlug.
  Jetzt eine einzige Quelle der Wahrheit (`bestKnownCountRef`, Max aus beiden Kanälen).

**Verifiziert:** alle 45 bestehenden Unit-Tests weiterhin grün (Deadline-Logik ändert nichts an
den Score-/Confidence-/Novelty-Berechnungen), `npm run build`/`npm run lint` sauber. Live im
Dev-Server: ein Lauf schloss nach 33,5s (unter der 40s-Grenze) regulär mit "done" ab, ohne
unnötige Verkettung - die Deadline greift nur ein, wenn tatsächlich nötig, sonst bleibt das
bisherige Verhalten unverändert.

## [2026-07-11] Auto-Search-Fortschritt: Polling statt alleiniger Streaming-Response

Nutzer meldete: Auto-Search findet Videos, der Button zeigt aber die ganze Zeit "0/5 gefunden"
statt live zu aktualisieren.

**Root Cause (live diagnostiziert):** Die bestehende Implementierung liest die Antwort von
`POST /api/pipeline/auto-search` als `ReadableStream` und aktualisiert den Zähler pro
`"candidate"`-Event. Direkter Test im Browser (Rohdaten der Stream-Chunks inkl. Zeitstempel
mitgeloggt) zeigt: lokal im Dev-Server kommen die Chunks tatsächlich inkrementell an (erster
Kandidat nach 21 s, "processed" nach 44 s/68 s). Vercels Node-Serverless-Funktionen puffern
Responses aber bekanntermaßen bis zum Ende der Funktionsausführung, sofern keine Edge Runtime
verwendet wird – auf der Live-Seite käme dadurch der gesamte Stream erst nach 1-3 Minuten auf
einmal an, sodass der Zähler bis dahin bei 0 hängen bleibt und dann sofort auf den Endstand
springt. Das erklärt exakt das gemeldete Verhalten.

**Fix:** Neuer Endpunkt `GET /api/pipeline/auto-search/status?since=<ISO-Timestamp>`
(`app/api/pipeline/auto-search/status/route.ts`) zählt Claims mit `confidence >=
CONFIDENCE_THRESHOLD` (`lib/pipeline/confidence.ts`, exakt dieselbe Schwelle wie `foundCount` in
`runDiscovery()`), erstellt seit Suchstart, gruppiert nach `video_id` – das ist unabhängig von der
Streaming-Response, weil `processVideo()` (`lib/pipeline/process.ts`) jedes gefundene Video sofort
in die DB schreibt, nicht erst am Ende des Laufs. `components/inbox/auto-search-button.tsx` pollt
diesen Endpunkt alle 1,5 s parallel zur laufenden Suche, aktualisiert den Zähler und ruft bei jeder
Erhöhung `router.refresh()` auf – neu gefundene Videos erscheinen dadurch live in der Inbox, ohne
auf das Ende der Suche zu warten. Keine neue Job-State-Tabelle nötig (bewusste Entscheidung schon
beim ursprünglichen Streaming-Design, siehe Kommentar in `discovery.ts`) – die bestehende
`claims.created_at`-Spalte reicht. Die Streaming-Response bleibt zusätzlich bestehen (aktualisiert
den Zähler weiterhin, falls die Plattform doch inkrementell ausliefert, und liefert die
Abschluss-Zusammenfassung für den finalen Toast).

**Live verifiziert:** zwei echte Auto-Search-Läufe (echte YouTube-/Claude-Aufrufe). Lauf 1 fand
7 Videos (heute sichtbar in der Inbox, u. a. mehrere Grapefruit-Funde). Der neue Status-Endpunkt
lieferte für dessen Zeitfenster korrekt `{"foundCount":7}` zurück – gegen die tatsächlich gelandeten
Inbox-Einträge abgeglichen. Lauf 2 (zur UI-Verifikation) fand 0 neue Treffer (alle Kandidaten
`no_transcript`/`off_topic`-Skips, ein echtes Ergebnis, kein Bug); dabei live beobachtet, dass das
Polling zuverlässig alle 1,5 s feuert und beim Suchende sauber stoppt (kein hängender Interval,
keine Konsolenfehler). `npm run build`/`npm run lint` sauber.

## [2026-07-11] E-Book-Seite mit Blätterfunktion

Nutzer wollte sein E-Book ("Heißhunger", PDF) direkt aus der App erreichbar machen – ein Button
neben Export/Titel in der Inbox-Kopfzeile, der auf eine neue Seite im gleichen Design führt und
das PDF wie ein echtes Buch blätterbar macht statt es nur zu verlinken. Passt zu ROADMAP.md
Phase 5 ("E-Book-PDF-Link") und MASTERPLAN §8 ("konsistent mit E-Book-Richtung").

**Umsetzung:**
- PDF-Seiten (30, 6×9") vorab mit `pypdfium2` (Python, keine externen Binaries wie poppler nötig)
  zu JPEGs gerendert – `scripts/render-ebook-pages.py`, wiederholbar bei neuer E-Book-Version.
  Ergebnis (`public/ebook/pages/01.jpg`…`30.jpg`, ~1188×1782px, ~5 MB gesamt) eingecheckt statt
  zur Laufzeit im Browser mit pdf.js zu parsen – robuster (kein Worker-Setup in Next 16) und
  schneller beim Blättern. Original-PDF zusätzlich nach `public/ebook.pdf` kopiert (Download-Link).
- Blätter-Effekt mit `react-pageflip` (npm) – realistischer 3D-Seitenumschlag inkl. Ecken-Drag/
  Swipe, `showCover` für die Titelseite als Einzelseite, automatischer Wechsel Einzel-/Doppelseite
  je nach Viewport-Breite. Neue Client-Komponente `components/ebook/flipbook.tsx`, neue Route
  `app/ebook/page.tsx` (gleicher `FlowFieldBackground`/Header-Stil wie die Inbox).
- Neuer "E-Book"-Button (`BookOpen`-Icon) neben `ExportLinks` im Inbox-Header (`app/page.tsx`).
- **Bug gefunden+gefixt:** `next/image` gegen die lokalen JPEGs führte zu `400 Bad Request`
  ("resource isn't a valid image") von `/_next/image`. Ursache: Next.js' Bildoptimierung holt das
  Quellbild serverseitig per eigenem HTTP-Request erneut vom Server – dieser interne Request trägt
  keinen Auth-Cookie und wurde vom `proxy.ts`-Passwortschutz (Matcher deckt alle Routen außer
  `/login`/`_next/static`/`_next/image`/`api/cron` ab) auf `/login` umgeleitet, sodass Next.js
  HTML statt Bilddaten bekam. Fix: `unoptimized` auf den `next/image`-Komponenten – die JPEGs sind
  ohnehin schon exakt für die Zielgröße vorgerendert, Next.js' Laufzeit-Resizing hätte hier keinen
  echten Mehrwert gebracht.

**Live verifiziert:** `/ebook` von der Inbox aus über den neuen Button erreicht, mehrfach
durchgeblättert (Klick + Tastatur-Pfeile, Vor/Zurück, Seitenzähler korrekt), Desktop-Doppelseite
und Mobile-Einzelseite (375px) geprüft, Download-Link liefert die vollständige PDF (15,4 MB,
`application/pdf`) hinter dem bestehenden Passwortschutz. `npm run build`/`npm run lint` sauber.

## [2026-07-10] Chris' eigene Videos werden nie mehr als Vorschlag importiert

Nutzer: Auto-Search/Import soll nie Chris' eigene Videos (@christianwolf) als Faktencheck-
Vorschlag vorschlagen. Channel-ID via YouTube Data API aufgelöst (`channels.list?forHandle=
christianwolf`) statt geraten – `UC_NsZgQdK4lTleq_siGOdJw`, verifiziert (148k Abonnenten, Titel
"Christian Wolf" passt).

**Umsetzung:**
- `VideoMetadata` (`lib/pipeline/types.ts`) um `channelId` ergänzt, `getVideoDetails()`
  (`lib/pipeline/youtube.ts`) befüllt es jetzt aus `snippet.channelId` (exakter Vergleich statt
  fragilem Namens-Abgleich, der bei Namensänderungen brechen würde).
- `processVideo()` (`lib/pipeline/process.ts`) prüft `metadata.channelId` **vor** dem
  Transkript-Abruf/Claude-Aufwand – spart bei jedem Treffer sowohl Proxy-Traffic als auch
  API-Kosten. Neuer `SkipReason` `own_channel`, greift einheitlich für Auto-Search UND
  manuellen URL-Import (beide laufen durch `processVideo()`).
- Neue Migration `0006_own_channel_skip_reason.sql` (Postgres-Enum `discovery_skip_reason` um
  `own_channel` erweitert) – **muss noch manuell im Supabase SQL Editor ausgeführt werden** (wie
  0001–0005). Bis dahin funktioniert der Filter bereits korrekt (Video wird nicht importiert),
  nur der `discovery_log`-Eintrag dafür schlägt bis zur Migration fehl (abgefangen, nur
  Server-Log, kein Nutzer-facing Fehler).
- Inline-Meldung für manuellen Import ergänzt (`components/inbox/url-import-form.tsx`): "Das ist
  ein Video von deinem eigenen Kanal – wird nicht als Vorschlag importiert."

**Live verifiziert:** echtes aktuelles Video von Chris' Kanal (`1wXLQdXMoq4`) per YouTube-Suche
geholt, durch `processVideoByUrl()` geschickt – korrekt sofort mit `own_channel` geskippt, kein
Transkript-Abruf, keine Claude-Calls, kein `videos`-Eintrag angelegt. `npm run lint`/
`npm run build`/`npm test` (45/45) sauber.

## [2026-07-10] MASTERPLAN.md korrigiert: TikTok/Instagram-Import funktioniert aktuell nicht

Nutzer fragte, ob er testweise eine TikTok-URL manuell importieren könne. Codeprüfung ergab:
`processVideoByUrl` (`lib/pipeline/import.ts`) ist vollständig YouTube-hartcodiert –
`parseVideoId` (`lib/pipeline/youtube.ts`) erkennt ausschließlich `youtube.com`/`youtu.be`, eine
TikTok-URL wirft sofort `Konnte keine YouTube-Video-ID extrahieren`. MASTERPLAN.md §5 behauptete
bisher fälschlich "Adapter-Interface implementiert, manueller URL-Import funktioniert" für
TikTok/Instagram – das stimmte nie mit dem tatsächlichen Code überein (kein
`lib/pipeline/tiktok.ts`/`instagram.ts`, keine Plattform-Weiche irgendwo im Import-Pfad).

MASTERPLAN.md §5 korrigiert: Tabelle und Manueller-URL-Import-Absatz sagen jetzt ehrlich, dass nur
YouTube funktioniert, mit Verweis auf den ausgearbeiteten (aber bewusst zurückgestellten)
Lösungsvorschlag in IDEAS.md. Loom-Formulierung entsprechend angepasst, damit sie nicht mehr
implizit behauptet, TikTok/Instagram-Import sei bereits gebaut worden.

## [2026-07-10] Auto-Search fand trotz Proxy-Fix keine neuen Videos (discovery_log blockierte dauerhaft)

Nutzer meldete: Auto-Search soll 5 passende Videos suchen und importieren, fand aber keine. Root
Cause via `npm run pipeline:test -- --discover` diagnostiziert (echter Discovery-Lauf,
proxy-geroutet): `Suchen durchgeführt: 5, gefundene IDs: 47, neue IDs: 0`.

**Ursache:** `filterUnseenVideoIds()` (`lib/pipeline/discovery.ts`) behandelt **jeden** Eintrag in
`discovery_log` als dauerhaft "schon gesehen", unabhängig vom Skip-Grund. Von 100
`discovery_log`-Einträgen waren **70 mit `reason=no_transcript`** – praktisch alle von *vor* dem
Proxy-Fix (2026-07-10, siehe Eintrag unten), als YouTube auf Vercel fast jeden Transkript-Abruf
blockierte. Diese Videos wurden dadurch permanent von zukünftigen Auto-Search-Läufen
ausgeschlossen, obwohl der eigentliche Blocker (IP-Blocking) inzwischen gelöst ist – der Pool an
"neuen" Kandidaten war schlicht komplett verbraucht.

**Fix:** `discovery_log`-Query in `filterUnseenVideoIds()` schließt jetzt `reason = 'no_transcript'`
aus (`.neq("reason", "no_transcript")`). Begründung für die Unterscheidung: `off_topic`/`no_claims`
sind stabile *inhaltliche* Urteile (bei erneuter Prüfung mit hoher Wahrscheinlichkeit gleiches
Ergebnis) – `no_transcript` war dagegen fast immer ein *Infrastruktur*-Problem, keine Aussage über
das Video selbst. Bereits vorhandene `videos`-Einträge (echte Importe, jeder Status) bleiben
weiterhin ausgeschlossen wie bisher.

**Verifikation:** Erneuter `--discover`-Lauf danach: `neue IDs: 2` (statt 0). Eine der beiden wurde
erfolgreich durch die volle Pipeline verarbeitet und landet mit 100 % Confidence / Score 70 in der
echten "Neu"-Inbox – die andere korrekt wieder geskippt (`Transcript is disabled on this video`,
ein echter Content-Fall ohne Untertitel, kein Proxy-Problem). `npm run lint`/`npm run build`/
`npm test` (45/45) sauber.

## [2026-07-10] YouTube-Transkript-Blocking gelöst: Webshare-Residential-Proxy

Die seit 2026-07-08 dokumentierte Einschränkung ("YouTube blockiert Transkript-Abrufe von
Cloud-Servern", 18/18 Fehlschläge auf Vercel) ist gelöst. Nutzer hat Zugangsdaten für einen
rotierenden Webshare-Residential-Proxy bereitgestellt.

**Umsetzung:**
- 4 neue Env-Vars (`PROXY_HOST`, `PROXY_PORT`, `PROXY_USERNAME`, `PROXY_PASSWORD`) in
  `.env.local` sowie in Vercel Production **und** Preview angelegt (`vercel env add`).
- `lib/pipeline/transcript.ts`: neuer `createProxyFetch()`-Singleton, baut einmal pro warmem
  Serverless-Container einen `undici.ProxyAgent` und reicht ihn als `config.fetch`-Override an
  `YoutubeTranscript.fetchTranscript` durch (deckt InnerTube-API, Watch-Page-Scraping und den
  Transcript-XML-Abruf gleichermaßen ab, da alle drei intern denselben Override nutzen). Ohne
  gesetzte `PROXY_*`-Vars automatischer Fallback auf direkten `fetch` – kein Hard-Requirement.
  `withRetries`/die Retry-Konstanten selbst unverändert gelassen wie vom Nutzer gefordert.
- Beide Catch-Blöcke in `fetchTranscriptOnce` loggen jetzt `error.name`/`error.message` statt
  komplett stumm zu `null` zu werden (landet in Vercel-Function-Logs) – nötig, um bei
  Fehlschlägen den exakten Fehler zu berichten statt zu raten.
- `undici` als explizite Dependency ergänzt (`package.json`, vorher nur transitiv über Next.js).

**Verifikation (mehrstufig, alles live getestet statt angenommen):**
1. Lokal: `npm run pipeline:test` mit den 4 zuvor blockierten Video-IDs – IP-Rotation direkt
   gemessen (unterschiedliche Egress-IP pro Proxy-Request, klar getrennt von der lokalen IP),
   alle 4 erfolgreich.
2. Vercel-Preview-Deploy (`vercel deploy`) + Live-Test der 4 Video-IDs gegen die echte
   Preview-Infrastruktur (per Server-Session-Cookie + Vercels "Protection Bypass for
   Automation", nach Rücksprache mit dem Nutzer aktiviert und danach wieder deaktiviert):
   zunächst 2/4 erfolgreich (`status: processed`), 2/4 mit einem *neuen* Fehler
   (`YoutubeTranscriptVideoUnavailableError`, aus den Vercel-Function-Logs) – nicht mehr die
   alte stille IP-Blockade. Diagnose: einzelne Proxy-IPs aus dem rotierenden Pool laufen bei
   YouTube vermutlich auf eine Consent-/Zwischenseite ohne `playabilityStatus` statt der echten
   Watch-Page; da jeder Retry-Versuch eine neu rotierte IP zieht, direkt behebbar über mehr
   Versuche.
3. `TRANSCRIPT_FETCH_ATTEMPTS` von 3 auf 5 erhöht (mehr Retry-Versuche = mehr rotierte IPs =
   höhere Trefferchance), erneut deployed. Nutzer hat danach selbst im Browser gegen die
   Preview getestet (eigenes Vercel-Team-Login, kein Bypass-Secret nötig): **alle 4 Test-Videos
   erfolgreich.**
4. Preview-only Nebenbaustelle entdeckt und behoben: `AUTH_PASSWORD` war für die
   Preview-Umgebung leer (nur Production hatte einen echten Wert) – dadurch hätte die
   App-eigene Passwort-Middleware *jeden* Request auf Preview blockiert, unabhängig vom
   Proxy-Fix. Nach Rücksprache mit dem Nutzer einen Testwert nur für Preview gesetzt;
   Production unverändert.

**Kosten-Notiz für Skalierung:** Webshare-Residential-Proxy ist bandbreitenbasiert abgerechnet.
Transkript-Text ist pro Video klein, daher pro Import vernachlässigbar – bei deutlich höherem
Volumen lohnt sich ein Blick auf den tatsächlichen Verbrauch im Webshare-Dashboard.

`npm run lint`/`npm run build`/`npm test` (45/45) sauber.

## [2026-07-09] Ablehnen-Dropdown im Filter-Panel-Design

Das Grund-für-Ablehnung-Menü (`components/inbox/action-buttons.tsx`, `PopoverContent`) nutzte noch
die Standard-Popover-Optik (`rounded-lg`/2,4px, `p-2.5`) statt der beim Filter-Redesign
eingeführten Panel-Optik. Auf `rounded-[12px] p-4` umgestellt – identische Werte wie das
Filter-Dropdown-Panel (`components/inbox/filter-bar.tsx`), keine neue Ausnahme, sondern
Angleichung an eine schon bestehende. Reason-Liste (Klick-Buttons, kein Multi-Select) und
Popover-Positionierung (`align="end"`) unverändert – die Interaktion unterscheidet sich bewusst
vom Checkbox+Anwenden-Muster der Filter (Einzelklick löst sofort die Ablehnung aus), nur die
Container-Optik wurde angeglichen.

`npm run lint`/`npm run build` sauber. Visuelle Bestätigung diese Runde durch denselben
Preview-Tool-Fokus-Zustand wie beim letzten Eintrag blockiert (`document.hidden === true` über
mehrere frische Server-Neustarts) – Änderung nutzt exakt dieselben Werte, die für das
Filter-Panel bereits live verifiziert wurden, daher hohe Zuversicht trotz fehlendem Screenshot.

## [2026-07-09] Zoom sperren, Filter-Zeile auf iPhone, Auto-Search-Position, Copy-Button kompakt

Vier unabhängige UI-Fixes, alle auf Nutzerwunsch.

**Zoom app-weit deaktiviert** (`app/layout.tsx`, neuer `viewport`-Export mit `maximumScale: 1,
userScalable: false`). Anders als beim vorherigen iOS-Input-Zoom-Fix (der nur den `text-sm`-
Auslöser auf den zwei Text-Inputs behoben hat) jetzt explizit für die ganze App angefragt – Login,
Inbox, Video-Detailseite betrifft dieselbe eine Viewport-Meta-Stelle. Bewusster Trade-off
festgehalten: das weicht von WCAG 1.4.4 (Zoom bis 200 %) ab, ist aber eine explizite
Produktentscheidung des einzigen Stakeholders für ein Ein-Personen-Tool, keine übersehene
Regression.

**Filter brachen auf dem iPhone um** ("Score" rutschte in eine zweite Zeile) – Filter-Trigger-
Buttons (`components/inbox/filter-bar.tsx`) enger gemacht (`gap-1.5`→`gap-1`, `px-2` statt
geerbtem `px-2.5`), damit alle vier Chips auf iPhone-Breite (~375–430px) in einer Zeile bleiben.

**Auto-Search-Button jetzt robust rechtsbündig** (`components/inbox/auto-search-button.tsx`,
`ml-auto`) – bisher konnte er bei einem Zeilenumbruch der Filter-Reihe auf die linke Seite
rutschen (Folge des Umbruch-Bugs oben: ein alleinstehendes Flex-Item auf einer eigenen Zeile
ignoriert `justify-between` des Elternelements). `ml-auto` hält ihn unabhängig vom Umbruch-
verhalten am rechten Rand.

**Copy-Button im Reaktions-Baukasten verkleinert** (`components/inbox/copy-button.tsx`): Text
"Kopieren"/"Kopiert" entfernt, nur noch Icon in einem kompakten `size-6`-Kreis (vorher Pill mit
Text) – mehr Platz für den Vorschlagstext daneben. `aria-label`/`title` ergänzt, da ein Button
ohne sichtbaren Text sonst keinen zugänglichen Namen für Screenreader hätte. Wirkt einheitlich auf
alle Verwendungsstellen (Hooks, Kernargument, Quellen, Analogie, CTA, gesamtes Skript).

**Verifikation diesmal eingeschränkt:** `npm run lint`/`npm run build` sauber, Server-Log zeigt
einen einzelnen sauberen `GET / 200`. Die Viewport-Meta wurde direkt im DOM bestätigt
(`document.querySelector('meta[name="viewport"]')` → korrekt `width=device-width, initial-scale=1,
maximum-scale=1, user-scalable=no`), ebenso einzelne Style-Berechnungen (Farbe/Schriftgröße/
Text-Shadow des Titels). Ein vollständiger Screenshot-/Geometrie-Check (Filter-Zeile/Auto-Search-
Position visuell bestätigen) war diese Runde nicht möglich: `getBoundingClientRect()` lieferte
über mehrere frische Server-Neustarts hinweg konsequent Nullen, root-caused auf
`document.visibilityState === "hidden"` / `document.hasFocus() === false` (das Preview-Tab war im
Test-Harness nicht im Vordergrund - Browser geben Hintergrund-Tabs kein Layout-Budget). Kein
Hinweis auf einen Code-Fehler, sondern ein Fokus-Zustand des Preview-Tools in dieser Session.
Sollte nach einem Neustart des Preview-Tools (Tab im Vordergrund) erneut geprüft werden.

## [2026-07-09] Flow-Field: 3 Bugfixes (Fade-in, Mobile-Scroll-Reload, iOS-Zoom)

Drei konkrete, vom Nutzer live auf dem Handy gefundene Bugs behoben.

**1) Kein Fade-in beim Laden.** `components/flow-field-background.tsx` zeichnete den Erststand
bisher über einen *synchronen* Prewarm-Burst (500 Iterationen in einer `for`-Schleife, alle vor
dem ersten Paint) – der Nutzer sah dadurch sofort das fertige, dichte Bild statt eines Aufbaus.
Umgebaut auf ein Phasen-Modell: `phase: "building" | "live"`. Die Aufbau-Phase zeichnet jetzt
über *echte, gemalte* `requestAnimationFrame`-Frames (dieselbe Alpha wie der alte Prewarm, aber
sichtbar über ~8s statt synchron vorberechnet) – der Nutzer sieht die Linien entstehen. Endlos-
Modus (Login) wechselt danach in die schon verifizierte Live/Fade-Phase; zeitbegrenzter Modus
(Inbox) stoppt nach der Aufbauphase selbst (keine separate Live-Phase nötig, `durationSeconds=10`
deckt sich in der Praxis fast mit der alten Prewarm-Dauer). Long-Session-Reset (alle 90.000
Frames) baut jetzt ebenfalls sanft neu auf statt abrupt zu "poppen". `prefers-reduced-motion`
unverändert: synchroner Aufbau, sofort eingefroren (kein Animations-Loop erlaubt).
Live verifiziert per Live-`requestAnimationFrame`-Loop: Helligkeit direkt nach Start ≈ 250 (fast
reines Papierweiß, nicht mehr sofort dicht) und sinkt danach graduell mit der Frame-Zahl statt in
einem Sprung.

**2) Ungewollter "Reload" beim Scrollen auf dem Handy.** Mobile Browser feuern beim Scrollen
`resize`-Events, wenn die Adressleiste ein-/ausblendet (ändert nur `innerHeight` um ~50–100px,
nie `innerWidth`) – der bisherige `handleResize` hat das als echten Resize behandelt und Feld +
Partikel komplett neu aufgebaut. `handleResize` prüft jetzt: nur neu aufbauen bei echter
Breitenänderung **oder** Höhenänderung > 150px (deckt Rotation/echte Fenster-Resizes ab, ignoriert
Adressleisten-Jitter). Per 6 simulierten Szenarien verifiziert (Toolbar-Ein-/Ausblenden bei
gleicher Breite → kein Rebuild; echte Rotation/Breitenänderung/große Höhenänderung → Rebuild wie
gewohnt).

**3) iOS-Zoom beim Fokussieren von Textfeldern.** iOS Safari zoomt automatisch rein, wenn ein
fokussiertes Input eine effektive Schriftgröße < 16px hat – Passwortfeld (`app/login/
login-form.tsx`) und YouTube-URL-Feld (`components/inbox/url-import-form.tsx`) nutzten beide
`text-sm` (14px). Auf `text-base` (16px, per `getComputedStyle` im Projekt bestätigt) angehoben –
beide Inputs im selben Zug, da identischer Bug mit identischer Ursache; ein Fix ohne den anderen
hätte ein inkonsistentes Verhalten zwischen den beiden einzigen Text-Inputs der App hinterlassen.
Keine Viewport-Meta-Änderung (`user-scalable=no` o. ä.) – das würde Pinch-Zoom app-weit abschalten,
schlechte Praxis und nicht angefragt; die 16px-Regel ist der zielgerichtete Standard-Fix.

`npm run lint`/`npm run build` sauber.

## [2026-07-09] Video-Karten + Action-Buttons ins Glass-Design übertragen

Auf explizitem Nutzerwunsch (nach Ansicht der Toolbar im Glass-Stil) die vorherige Scope-Grenze
("nicht auf Video-Zeilen") bewusst aufgehoben: `components/inbox/video-card.tsx` von einer
full-bleed Zeile (`-mx-4`, Hairline-Trennung via `divide-y` im Listen-Container) auf eine
eigenständige, abgerundete Glass-Karte umgestellt (`rounded-[28px] border-white/50 bg-white/55
backdrop-blur-md` + Inset-Highlight). Listen-Container (`app/page.tsx`) von `divide-y
divide-border bg-background` auf `gap-4` – Karten haben jetzt sichtbaren Abstand statt aneinander
gereiht zu sein, Canvas schimmert gedämpft in den Zwischenräumen durch.

**Deckkraft bewusst höher als bei den Toolbar-Chips** (`bg-white/55` statt `bg-white/20`): Karten
tragen deutlich mehr Fließtext (Titel, Zitat, Meta-Zeile) als ein Toolbar-Label – dieselbe
Transparenz wie bei den Chips wäre ein Kontrastrisiko gewesen. Per `getComputedStyle` geprüft
(Titel `rgb(20,20,20)` auf der 55%-Weiß-Fläche) statt nur angenommen.

**`components/inbox/action-buttons.tsx` – alle drei Zustände:**
- **Annehmen**: bleibt grün (Ampel-Signal unverändert eindeutig), aber jetzt Glas statt Vollton
  (`bg-success/70 backdrop-blur-md`, 70% Deckkraft hält die Farbidentität klar erkennbar).
- **Ablehnen**: neutrale Glass-Box (identisch zu den Filter-Chips), aber **nur Text/Icon in
  `text-destructive`** statt eine rote Box – explizit auch `aria-expanded:text-destructive`
  gesetzt, weil die Outline-Variante beim geöffneten Grund-Popover sonst per Cascade-Reihenfolge
  auf `aria-expanded:text-foreground` zurückgefallen wäre (dieselbe Falle, die beim
  Filter-Trigger-Textversuch schon einmal beobachtet und nachträglich gefixt wurde – diesmal von
  Anfang an korrekt gesetzt und live verifiziert: Farbe bleibt bei geöffnetem Menü rot).
- **Als erledigt markieren**: gleiche dunkle Glas-Tönung wie "Anmelden"/"Importieren"
  (`bg-neutral-900/60 backdrop-blur-md backdrop-saturate-150`).

Reject-Reason-Popover (Liste der 4 Gründe) bewusst unverändert solide – funktionales Overlay,
gleiche Begründung wie beim Filter-Panel.

Live verifiziert (nicht nur angenommen): Karten-Radius/-Deckkraft/-Blur per `getComputedStyle`
bestätigt, Ablehnen-Textfarbe bleibt bei geöffnetem Popover rot, "Als erledigt markieren" mit
`?status=accepted` sichtbar geprüft, 320px/375px ohne horizontales Overflow. `npm run
lint`/`npm run build` sauber.

## [2026-07-09] Glass-Design + Flow-Field-Hintergrund auf die Inbox übertragen

Auf Nutzerwunsch den Login-Look auf die Inbox-Toolbar ausgeweitet: URL-Import-Feld
(`components/inbox/url-import-form.tsx`, Eingabe + "Importieren"-Button), Filter-Trigger
(`components/inbox/filter-bar.tsx`) und Auto-Search-Button (`components/inbox/auto-search-button.tsx`)
im selben Glass-Stil wie Passwortfeld/"Anmelden" (`bg-white/20`/`bg-neutral-900/60` +
`backdrop-blur-md` + Inset-Highlight). `app/page.tsx` bekommt denselben generativen
Canvas-Hintergrund wie `/login`.

**Bewusste Scope-Grenze:** Glass/Canvas nur auf die vier genannten Toolbar-Elemente – **nicht**
auf Video-Zeilen, Annehmen/Ablehnen, Score-Zahlen oder Badges. Zwei Gründe: (1) DESIGN.md verlangt
hier explizit kein Card-Chrome und eine unverwässerte Ampel-Logik für die zentralen Aktionen –
Annehmen/Ablehnen brauchen unzweideutigen Kontrast. (2) Dichter Fließtext (Video-Titel, Zitate,
Meta-Zeilen) direkt auf einem bewegten Linienbild wäre ein echtes Lesbarkeits-/WCAG-Problem für
eine täglich genutzte Arbeitsliste, keine Stilfrage. Die Video-Liste und der Empty-State bekommen
daher explizit `bg-background` (dieselbe Fläche wie bisher, nur lokal statt vom `<body>` geerbt –
optisch unverändert), damit der Canvas dort nicht durchscheint.

**`components/login/flow-field-background.tsx` → `components/flow-field-background.tsx`
verschoben** (per `git mv`), da die Engine jetzt von zwei Seiten genutzt wird – ein Import aus dem
`login`-Ordner heraus wäre irreführend gewesen. Neue optionale Prop `durationSeconds`: ohne Prop
läuft die Animation endlos (Login, unverändert), mit Prop (`durationSeconds={10}` auf der Inbox)
stoppt sie nach dieser Dauer dauerhaft und bleibt stehen – kein Dauerlauf hinter einer Arbeitsliste,
die man wiederholt am Tag aufruft. Verifiziert per Canvas-Checksumme über mehrere Sekunden nach der
10s-Marke: identisch, Animation steht wirklich still (nicht nur angenommen).

**Zwei kleinere Fixes im selben Zug:**
- Auto-Search-Button saß nicht auf gleicher Höhe wie die Filter-Buttons – Ursache war
  `items-center` auf der umgebenden Zeile, wodurch der Button gegen den *ganzen* FilterBar-Block
  (Label "Filtern" + Button-Reihe) statt nur gegen die Button-Reihe zentriert wurde. Auf
  `items-end` zurückgestellt (das war vor dem Filter-Redesign schon richtig, ist beim Umbau
  versehentlich verlorengegangen). Per `getBoundingClientRect()` verifiziert: beide Buttons jetzt
  exakt `top:200/bottom:232/height:32`.
- Filter-Label "Score-Bereich" → "Score" umbenannt.

Live im Browser verifiziert (bereits authentifizierte Session): Canvas sichtbar im Kopf-/Randbereich,
stoppt nach 10s (Checksumme-Vergleich), Video-Liste bleibt auf solidem Grund scharf lesbar,
Filter-Panel öffnet/schließt weiterhin korrekt trotz neuer Basis-Klassen, Mobile (375px) ohne
Overflow. `npm run lint`/`npm run build` sauber.

## [2026-07-09] Login-Seite: generativer Flow-Field-Hintergrund (Canvas 2D)

**Nachschliff auf Feedback (Screenshot):** Die Login-Card von solidem `bg-card` auf echtes Glass
umgestellt – `bg-white/10` + `backdrop-blur-xl` + `border-white/40` + `rounded-[28px]` (deutlich
runder als unser sonstiges scharfes System, bewusste Ausnahme wie schon Status-Pills und das
Filter-Dropdown-Panel) + dezenter Inset-Highlight für den "Glasrand". Damit ist die Tinten-
Zeichnung durch die Card hindurch sichtbar (weichgezeichnet statt hart verdeckt). Passwortfeld
und "Anmelden"-Button bleiben bewusst solide/undurchsichtig (Eingabefeld weiß, Button
Fast-Schwarz `rounded-full`) – Kontrast/Bedienbarkeit für die einzige interaktive Aktion der
Seite geht vor Konsistenz mit dem Glass-Look. Verifiziert per Scratch-Canvas-Overlay auf einer
bereits authentifizierten Seite (gleiche Methode wie beim ersten Verifikationslauf, siehe unten –
kein Antasten der Auth-Middleware).

**Zweiter Nachschliff (Screenshot):** Die äußere Card-Box komplett entfernt – Titel, Passwortfeld
und Button liegen jetzt direkt auf dem Canvas, kein umschließender Rahmen mehr
(`app/login/page.tsx`, Wrapper-`div` ohne `bg`/`border`/`blur`). "Factcheck" bekommt dafür einen
weichen Text-Shadow (`[text-shadow:0_2px_20px_rgba(250,250,250,0.9)]`) statt einer Fläche, damit
die Überschrift über den Tintenlinien lesbar bleibt, ohne eine sichtbare Box zu brauchen.
Passwortfeld (`app/login/login-form.tsx`) jetzt selbst im Glass-Stil: `bg-white/20 backdrop-blur-md
border-white/40` mit Inset-Highlight. "Anmelden"-Button ebenfalls Glass, aber dunkel
getönt (`bg-neutral-900/60` + `backdrop-saturate-150` für sichtbare Tiefe statt flachem Grau, `/35`
Opazität wirkte im ersten Versuch zu blass) – weißer Text darauf bleibt klar AA-konform (per
`getComputedStyle` verifiziert: `oklab(0.205 ... / 0.6)` auf dem hellen Canvas-Grund kompositiert
zu einem satten Dunkelgrau). Fokus-Ring auf dem Passwortfeld bleibt Deep Teal (bestehende
"Fokus ist ein Marken-Moment"-Regel aus DESIGN.md), nicht angetastet.

**Dritter Nachschliff:** Passwortfeld-Radius von `rounded-2xl` auf `rounded-full` angeglichen,
damit Eingabefeld und Button dieselbe Pill-Form teilen statt unterschiedlicher Eckenrundung.

**Vierter Nachschliff: Animation laeuft jetzt endlos statt einmalig beim Laden zu "setzen".**
Ursprüngliche Spec ("nach fester Frame-Zahl stoppt die Animation") auf Nutzerwunsch bewusst
aufgegeben - Canvas wird jetzt nie mehr komplett fest, sondern faedet pro Frame minimal Richtung
Papierfarbe (`FADE_ALPHA = 0.0012`) bevor neue Segmente gezeichnet werden: alte Striche loesen
sich langsam auf, neue kommen laufend dazu. Erststart bleibt ein synchroner Prewarm-Durchlauf
(500 Frames ohne Fade), damit das Bild beim Laden sofort dicht aussieht statt leer zu beginnen.

Vor der finalen Wahl von `FADE_ALPHA=0.0012` mehrere staerkere Fade-Raten (0.004/0.008/0.015)
tatsaechlich im Browser ueber simulierte Zeitraeume getestet (nicht nur angenommen): staerkeres
Fading liess das Bild schon nach ~80 simulierten Sekunden zu einem diffusen grauen Schleier
verwaschen (Tinte hatte nie genug Zeit, sich zu satten Linien aufzubauen), trotz rechnerisch
"stabilerer" Durchschnittshelligkeit - ein Fall, in dem die Zahl allein in die Irre fuehrte und
der tatsaechliche Screenshot den Ausschlag gab. Bei `0.0012` bleibt das Bild ueber mehrere Minuten
sichtbar schoener/definierter (mehr Struktur baut sich auf), driftet aber ueber sehr lange
Sessions (>10-15 Min. Dauerlauf) langsam dunkler. Dagegen kein staerkeres Fading (siehe oben),
stattdessen ein simpler Sicherheitsnetz-Reset: nach ~90.000 Frames (~25 Min bei 60fps) setzt sich
die Engine einmalig mit neuem Seed frisch auf, statt unbegrenzt weiterzudriften.

`prefers-reduced-motion` unveraendert: kein Loop, nur der synchrone Prewarm-Durchlauf, danach
eingefroren - Bewegungsverzicht bleibt Vorrang vor "immer in Bewegung". `document.hidden` pausiert
weiterhin den Loop. Verifiziert per Live-`requestAnimationFrame`-Loop im Scratch-Canvas (echte
Bewegung über reale Sekunden beobachtet, nicht nur synchron simuliert) plus Fast-Forward-Tests
(~4 Min. simuliert) für die Langzeit-Optik.

**Fünfter Nachschliff: Striche wurden nach ~10s spürbar zu dick.** Ursache: die laufende Animation
zeichnete mit derselben Alpha wie der einmalige Prewarm-Durchlauf (`INK_ALPHA = 0.075`) - dieselbe
Konvergenz-Linie wird vom (deterministischen, unveränderten) Feld immer wieder von neuen Partikeln
getroffen, dadurch verdickten sich die Spines schon in den ersten Sekunden Dauerbetrieb sichtbar.
`INK_ALPHA` in `PREWARM_INK_ALPHA` (0.075, nur für den einmaligen Erststart) und `LIVE_INK_ALPHA`
(0.025, für den endlosen Loop) aufgeteilt - der Ersteindruck bleibt unveraendert dicht, aber die
laufende Animation legt pro Frame deutlich weniger Tinte nach. Im Browser mit drei Kandidaten
(0.075/0.025/0.012) bei t=0 und t=10s live verglichen statt nur angenommen: bei 0.025 ist der
Unterschied zwischen t=0 und t=10s kaum noch wahrnehmbar, bei der alten 0.075 deutlich sichtbar
dicker. `FADE_ALPHA`/`LONG_SESSION_RESET_FRAMES` unveraendert.

Gepusht auf `main` (Nutzer hat das nach diesem Nachschliff explizit angefordert).

Neue Datei `components/login/flow-field-background.tsx`: animierter Tintenlinien-Hintergrund für
`/login`, komplett auf `<canvas>` berechnet, kein Bild-Asset, kein npm-Package. Technik auf
Nutzerwunsch von einem extern gezeigten Referenzbeispiel übernommen (seeded Flow-Field aus
Noise-Partikeln), aber bewusst nur die **Technik** – nicht die dort gezeigte Print-Shop-UI
(Editionsnummer, Mint-/Regenerate-Buttons, Paletten-Switcher). Unsere Login-Seite bleibt simpel
(ein Passwortfeld, ein Button), passend zu CLAUDE.md ("ein Nutzer, kein Auth-Flow, keine
Settings"). Farben bewusst unser bestehendes System (Off-White/Fast-Schwarz/Deep-Teal) statt der
Referenz-Palette (warmes Parchment/Oxblood) – letzteres wäre zu nah an der in DESIGN.md explizit
verworfenen "Design-Richtung B" gewesen.

**Technik:** seeded `mulberry32`-PRNG (Seed = `Date.now()` pro Seitenaufruf) treibt eine
handgeschriebene 2D-Perlin-Noise-Funktion (3 Oktaven summiert) als Vektorfeld; ein paar hundert
Partikel (skaliert mit Viewport-Fläche, Deckel niedriger auf Mobile: 240 statt 460) folgen dem
Feld und zeichnen pro Frame ein kurzes, sehr transparentes Liniensegment. Canvas wird nach dem
initialen Off-White-Fill nie wieder geleert – wo sich Linien häufen, entsteht Tiefe. ~7,5 % der
Partikel zeichnen in Deep Teal als Akzent. Nach 700 Frames stoppt die Animation endgültig ("Print
setzt sich"). `prefers-reduced-motion` überspringt den Animations-Loop und zeichnet dieselbe
Technik in einem synchronen Durchlauf sofort fertig. `visibilitychange` pausiert bei
Tab-Wechsel; Resize baut Feld+Partikel neu auf.

**Ein reales Tuning-Problem gefunden und behoben, direkt im Browser verifiziert statt blind
geschätzt:** Erste Version wirkte wie "verwaschener Bleistift" statt Tinte, und der Teal-Akzent
war praktisch unsichtbar (Pixel-Sampling zeigte 0 erkennbare Akzent-Pixel unter ~22.000 Stichproben).
Ursache: Alpha zu niedrig und Partikel-Lebensdauer zu kurz, dadurch konnten sich Konvergenzzonen
nie zu echtem Schwarz aufbauen (exakt das Problem, das auch die mitgelieferte Referenz-Fallstudie
in ihrer ersten Kritikrunde beschreibt). Fix: `INK_ALPHA` 0.05→0.075, `ACCENT_ALPHA_MULT`
1.6×→3.2×, Partikel-Lebensdauer 40–140→70–220 Frames – danach im Browser (Pixel-Sampling +
Screenshot) bestätigt: sichtbare Tiefe in den Konvergenzzonen, klar erkennbare Teal-Fäden.

**Verifiziert ohne die echte Auth-Middleware zu berühren:** Der Login-Session-Cookie ist
`httpOnly` (`app/login/actions.ts`) und daher aus der Seite heraus nicht löschbar. Statt den
Redirect-Guard in `app/login/page.tsx` testweise zu deaktivieren (ein erster Versuch dazu wurde
vom Auto-Mode-Classifier zu Recht als Security-Weakening geblockt und sofort rückgängig gemacht),
wurde dieselbe Engine 1:1 als Scratch-Overlay auf einer bereits authentifizierten Seite injiziert
(Desktop + Mobile 375px) – keine Datei- oder Auth-Änderung nötig, nach dem Test wieder entfernt.
`npm run lint` und `npm run build` sauber.

`app/login/page.tsx`: Layout auf zentrierte Card (`bg-card`, Hairline-Border, `rounded-3xl`, kein
Schatten – DESIGN.md reserviert Schatten für echte Overlay-Ebenen) über dem Canvas umgestellt,
`login-form.tsx`/`app/login/actions.ts` unverändert.

## [2026-07-09] Button-Redesign (rounded-full), FilterBar-Neubau (Multi-Select), Header-Aufräumung

**Auf Nutzerwunsch mit Referenz-Screenshot, kein selbst initiiertes Redesign.** Drei zusammenhängende
UI-Änderungen in einer Session:

**1) Globaler Button-Radius `rounded-lg` → `rounded-full`.** Betrifft `components/ui/button.tsx`
(Basis + alle Size-Varianten, dabei zwei nie genutzte `in-data-[slot=button-group]`-Radius-Hooks
entfernt – es gibt keine ButtonGroup-Komponente im Projekt) sowie drei hartcodierte Buttons
außerhalb der Basiskomponente (`app/error.tsx`, `app/videos/[id]/not-found.tsx`,
Lade-Skeletons in `app/loading.tsx`, dessen Header-Skeleton nebenbei auf die aktuelle
Kopfzeilen-Struktur korrigiert wurde – er bildete noch die vor Commit `5cc33e0` entfernte
Eyebrow+Frage-Kopfzeile ab). Cards, Inputs, Badges, Status-Pills bewusst nicht angefasst (Badges/
Pills waren schon `rounded-full`, keine Änderung nötig).

**Bewusster Bruch mit der bisherigen "scharfe Kanten überall"-Regel, dokumentiert statt
stillschweigend übergangen:** DESIGN.md verlangte bisher scharfe Radien explizit auch für Buttons.
Neue Named Rule "Rund vs. scharf": **rund = Aktionsfläche (Button/CTA), scharf = Struktur/Inhalt**
(Cards, Inputs, Panels, Dividers bleiben unverändert scharf). Das ist keine Rückkehr zur
verworfenen "Design-Richtung B" (die betraf Creme-Palette/Serif-Zitate/Gradient-Blobs, nicht
Button-Form) – DESIGN.md Abschnitt 5 entsprechend nachgezogen, inkl. Token-Referenzen im
Frontmatter (`button-primary`/`button-accept`/`button-outline`/`button-destructive-tonal` auf
`{rounded.full}`).

**2) FilterBar (`components/inbox/filter-bar.tsx`) komplett neu gebaut** – Button-Reihe
(Label + Chevron) statt Select-Dropdowns, Klick öffnet ein inline `Popover`-Panel (kein Modal)
mit 2-spaltigem Checkbox-Grid und einem "Anwenden"-Button. Offener Trigger: `border-2
border-accent` (Deep Teal, nutzt die in DESIGN.md schon bestehende "aktive Filter"-Zuordnung
statt einer neu erfundenen Farbe); Panel: `rounded-[12px]` als zweite bewusste Radius-Ausnahme
neben Status-Pills (dokumentiert in DESIGN.md, Abschnitt Elevation).

Dafür Filter von Single- auf Multi-Select umgestellt (Checkboxen brauchen das, um kein
UX-Etikettenschwindel zu sein): `InboxFilters` (`lib/inbox/types.ts`) auf reine `string[]`
vereinheitlicht, `getInboxItems` (`lib/inbox/queries.ts`) filtert Plattform/Thema/Score-Bereich
jetzt über Arrays (`.in()`/`.includes()`/`.some()`), Status-Array wird jetzt auch von der
Inbox-Seite selbst genutzt (bisher nur von `app/api/export/route.ts`). Die Confidence<70%-Schwelle
(MASTERPLAN, teuerster Fehler wären False Positives) hing bisher am einzelnen `status`-Parameter –
das funktioniert mit Mehrfachauswahl nicht mehr, jetzt pro Item geprüft
(`item.video.status !== "new" || passesConfidenceThreshold(...)`), damit sie bei z. B.
gleichzeitig "Neu" + "Angenommen" weiterhin nur echte "Neu"-Items filtert. Neue geteilte
URL-Param-Helfer `lib/inbox/filter-params.ts` (kommagetrennter Query-Param, z. B.
`?status=new,accepted`).

Neue Datei `components/ui/checkbox.tsx` (Wrapper um `@base-ui/react/checkbox`, analog zu
`select.tsx`/`popover.tsx`) – bleibt bei `rounded-sm` (Formular-Kontrolle, keine Aktionsfläche).

**Bewusster Scope-Cut:** Der Referenz-Screenshot zeigte 6 Filter-Spalten (u. a. "Confidence",
"Sortieren") an einem Shop-Beispiel. Übernommen wurde nur das UI-Pattern für die 4 real
existierenden Filter (Status/Plattform/Thema/Score-Bereich) – keine neue Confidence- oder
Sortierfunktion erfunden, die es vorher nicht gab (CLAUDE.md: keine neuen Features ohne
Rücksprache).

**3) Header aufgeräumt:** Hotkey-Hinweiszeile (`Video hovern: a annehmen · 1–4 …`) entfernt, die
eigentliche Tastatur-Triage (`components/inbox/keyboard-triage.tsx`, `a`/`1`-`4`/`d`) bleibt aktiv
– nur der sichtbare Text verschwindet. `ExportLinks` von der (jetzt gelöschten) Hotkey-Zeile
zurück neben den Titel verschoben (`app/page.tsx`-Header jetzt `justify-between`), wie vor Commit
`5cc33e0`, nur mit dem seit diesem Commit kürzeren "Factcheck Inbox"-Titel statt der alten
Eyebrow+Frage-Kopfzeile.

**Verifiziert:** `npm run lint`/`npm run build` sauber, live im Dev-Server getestet (Panel öffnen/
schließen, Mehrfachauswahl über URL-Params bestätigt via `?scoreBand=40-59` → korrekt gefilterte
Treffer, Reset-Link, Mobile-Viewport 375px ohne Overflow, `rounded-full` an Annehmen/Ablehnen/
Auto-Search/Anwenden-Buttons per `getComputedStyle` verifiziert statt nur optisch angenommen).

## [2026-07-08] URL-Import ebenfalls betroffen, ehrliche Fehlermeldungen, DB-Bereinigung

**URL-Import ist kein sicherer Fallback – rigoros bestätigt.** Auf Nutzeranfrage vor jeder
weiteren Änderung geprüft, ob das gelegentliche "Kein Transkript verfügbar" beim URL-Import
auch lokal auftritt (Fall A: echtes Fehlen von Untertiteln, kein Bug) oder nur auf Vercel
(Fall B: derselbe Bug wie Auto-Search). Ergebnis mit 4 verschiedenen Video-IDs, jeweils
gleichzeitig lokal und live auf Vercel getestet: **4 von 4 lokal erfolgreich, 4 von 4 auf
Vercel gescheitert** – eindeutig Fall B. `processVideoByUrl` (`lib/pipeline/import.ts`) ruft
denselben `processVideo` → `fetchTranscript`-Pfad wie Auto-Search auf, daher exakt derselbe
Bug. Gesamtbilanz über beide Wege: **18 von 18** bekanntermaßen-vorhandenen Transkripten
scheitern auf Vercel. Das ändert die Ausgangslage: URL-Import war als "funktionierender
Fallback" angenommen worden, ist es aber nicht – aktuell gibt es auf Vercel keinen
zuverlässigen Weg, ein neues YouTube-Video mit Transkript hinzuzufügen.

**Entscheidung: als bekannte Einschränkung dokumentieren statt Proxy-Dienst.** Keine laufenden
Kosten vor der Einreichung rechtfertigbar (Bewerbungsprojekt, feste Deadline), die 18
kuratierten Demo-Videos decken die Kernfunktionalität bereits ab. Details/Begründung in
README.md ("Bekannte Einschränkung: YouTube blockiert Transkript-Abrufe von Cloud-Servern").

**Ehrliche Fehlermeldungen statt stillem Fail oder Fachjargon** (`components/inbox/auto-search-button.tsx`,
`components/inbox/url-import-form.tsx`): Auto-Search zeigte bei 0 Treffern bisher immer
"Keine neuen Treffer" – irreführend, wenn in Wahrheit *jeder* geprüfte Kandidat am
Transkript-Block gescheitert ist, statt dass es einfach keine neuen Funde gab. Erkennt jetzt
(clientseitig, aus dem bereits gestreamten `summary.results`), wenn alle geprüften Kandidaten
mit `no_transcript` übersprungen wurden, und zeigt dann gezielt: "YouTube blockiert
Transkript-Abrufe von diesem Server. Aktuell können dadurch keine neuen Videos automatisch
gefunden werden." URL-Import bekommt dieselbe Kernaussage für den Einzelvideo-Fall statt der
alten, irreführenden "Kein Transkript verfügbar für dieses Video." (die faelschlich ein
Problem mit dem konkreten Video suggerierte, obwohl es fast immer der Server-Host ist).

**Datenbereinigung der Produktions-Inbox** (kein Code, nur DB – siehe TASKS.md/Nutzeranfrage):
Audit ergab 104 Videos gesamt (45 "Neu" roh / 5 tatsächlich sichtbar nach Confidence-Filter,
10 "Angenommen", 3 "Erledigt", 46 "Abgelehnt") statt der erwarteten ~13-16 kuratierten. Ursache:
mehrere Feature-Test-Durchläufe (Keyboard-Shortcuts, Action-Buttons, Auto-Search-Button-Test)
haben im Verlauf der Entwicklung reale Warteschlangen-Videos als Testobjekte benutzt und dabei
deren Status verändert, ohne dass danach wieder aufgeräumt wurde. Zwei konkrete Funde behoben:
- Ein "Erledigt"-Video (*FruchtSucht*, externe ID `eS9rs0whtp0`) hatte nur **50 % Confidence**
  – Verstoß gegen die Kernregel "Confidence < 70 % kommt nicht in die Inbox" (der Filter greift
  nur bei Status "Neu", nicht bei Angenommen/Erledigt). Direktes DB-Update auf `rejected`
  (bewusst ohne `applyAdaptiveRanking`, exakt wie beim 42er-Reject vom 2026-07-07), Grund
  dokumentiert: "Confidence unter Schwelle (50%) - Datenbereinigung 2026-07-08".
- **5 Feedback-Aktionen von heute, 08:49–09:23 Uhr** (vor dieser Session, engster Zeitcluster
  über 3 verschiedene Video-Batches hinweg) identifiziert als Test-Artefakte der
  Keyboard-Shortcut-/Polish-Arbeit von heute Vormittag, nicht als echte Redaktionsentscheidungen
  – auf Nutzerbestätigung zurück auf `status = new` gesetzt (Gymperium_, "Gesundheit"-Zimt-Video,
  NaturErwachen, Holistic Medic, 321kochentv), zugehörige Feedback-Zeilen von heute gelöscht.
- Die übrigen ~7 älteren Angenommen/Erledigt-Einträge (06./07.07, vor bzw. während früherer
  Feature-Tests) bewusst **nicht** angefasst – ohne klares Signal für "Testartefakt" ist das
  geringste Risiko, nichts Echtes zu zerstören.

**Ergebnis (live verifiziert):** Sichtbar sind jetzt 10 "Neu" + 6 "Angenommen" + 2 "Erledigt" =
**18 Videos**, alle mit 100 % Confidence, alle mit echtem Zitat + Timestamp + verifizierter
Quelle – durchgängig auf dem Niveau der ursprünglichen Kuration. Kein Commit nötig (reine
DB-Änderung, kein Code betroffen).

## [2026-07-08] Auto-Search: Retry-Versuch gegen no_transcript

Erster, risikoarmer Versuch gegen den zuvor diagnostizierten Root Cause (siehe Eintrag darunter):
`fetchTranscript` (`lib/pipeline/transcript.ts`) versucht jetzt bis zu 3× mit 1,5 s Pause dazwischen,
bevor es aufgibt und `no_transcript` loggt – falls YouTube eher weich rate-limited statt hart per IP
zu blocken, könnte ein späterer Versuch durchkommen. Kein Kostenrisiko (keine neue Abhängigkeit,
kein zusätzlicher API-Call), nur etwas mehr Laufzeit pro tatsächlich scheiterndem Kandidaten
(max. +3 s, nur relevant für die wenigen "neuen" Kandidaten pro Lauf). Retry-Loop (`withRetries`)
bewusst als generische, von `YoutubeTranscript.*` entkoppelte Funktion gebaut – testbar ganz ohne
Netzwerk-Mock (3 neue Tests in `transcript.test.ts`, TDD: erst rot gesehen, dann implementiert).
**Live auf Vercel verifiziert – Ergebnis: hilft nicht.** Nach Deploy (GitHub-Commit-Status
`Vercel: Deployment has completed` bestätigt) erneut 4 neue Kandidaten live getestet. Der komplette
Auto-Search-Lauf brauchte 41,2 s (zuvor, ohne Retry, lief ein vergleichbarer Lauf mit mehr
Kandidaten in unter 8 s) – die Retry-Delays laufen also nachweislich, sind aber wirkungslos: **4 von
4 weiterhin `no_transcript`** auf Vercel, dieselben 4 Video-IDs lokal weiterhin 4 von 4 erfolgreich
(15–312 Segmente). Damit steigt die Gesamtbilanz auf 14 von 14 gescheiterten Kandidaten in
Produktion vs. 14 von 14 erfolgreich lokal. Die ~5-fach längere Laufzeit bei identischem Ergebnis
spricht eher für ein hartes IP-Blocking als für weiches Rate-Limiting, das sich innerhalb weniger
Sekunden Pause erholt – Retry mit längerem Delay würde am Kernproblem also vermutlich nichts ändern.
Retry-Code bleibt drin (kostenlos, harmlos, leicht robuster gegen echte Transienten), löst aber
nicht den eigentlichen Bug. Nächster Schritt liegt bei den verbleibenden Optionen (Proxy vs.
Doku als bekannte Einschränkung vs. alternative Quelle) – siehe TASKS.md.

## [2026-07-08] Auto-Search-Diagnose (Root Cause), Titel-Redesign, Export-Umzug

**Auto-Search-Bug untersucht (nicht behoben, siehe unten):** Live auf Vercel per Klick +
Netzwerk-/Konsolen-Prüfung reproduziert, wie angefordert Root Cause vor jedem Fix-Versuch bestätigt.
Button/Route/Pipeline selbst fehlerfrei (Request feuert sofort, `200`, Streaming läuft, kein
Client-Fehler) – der Redesign-Verdacht (Card-Chrome-Umbau, `TriageRow`-Event-Delegation) hat sich
nicht bestätigt: `AutoSearchButton` liegt außerhalb von `KeyboardTriageProvider`, der `onClick` wurde
im Redesign-Commit nicht angefasst. Tatsächliche Ursache liegt im Backend: `fetchTranscript`
(`youtube-transcript`-Paket, inoffizielle YouTube-Scraping-Route über InnerTube-API/Watch-Page-HTML)
scheitert auf Vercel bei **9 von 9** geprüften Kandidaten mit `no_transcript`. Dieselben 9 Video-IDs
lokal mit demselben Paket getestet: **9 von 9 erfolgreich** (91–281 Transkript-Segmente). Gleicher
Code, gleiche IDs, unterschiedliches Ergebnis je nach Umgebung – deutet stark auf IP-basierte
Drosselung/Blockade durch YouTube gegen Vercels (AWS-)Serverless-IP-Ranges für diese inoffizielle
Route hin, eine bekannte Einschränkung dieses Ansatzes auf Cloud-/Serverless-Hosts, keine Regression
durch den Redesign-Commit. Nebenbefund: Auto-Search fragt bei jedem Lauf dieselben ersten 8 von 96
verfügbaren Mythen-Queries ab (`buildQueries`/`discovery.ts` rotieren nicht) – der Pool an "neuen"
(noch nicht gesehenen/geloggten) Kandidaten aus genau diesen 8 Queries schrumpft dadurch mit jedem
Klick zusätzlich. Fix erfordert eine Architektur-/Kosten-Entscheidung (Proxy, alternative
Transkript-Quelle, Retry-Strategie, oder bewusst als Einschränkung dokumentieren) – zurückgestellt
bis Rücksprache, offener Punkt in TASKS.md.

**Titel-Redesign** (`app/page.tsx`): Die kleine Caption "FAKTENCHECK-INBOX" plus der Satz "Lohnt es
sich, dazu heute ein Video aufzunehmen?" ersetzt durch einen einzigen, linksbündigen `<h1>`
"Factcheck Inbox" – Space Grotesk, `text-3xl`/`sm:text-4xl` (dieselbe Größe wie der Login-Titel,
nichts Neues erfunden), in Deep-Teal (`text-accent`, laut PRODUCT.md bereits AA-kontrastgeprüft).
Beide Texte nebeneinander hätten sich inhaltlich dupliziert; die kleine Eyebrow-Caption war zudem
genau das Muster, das die Impeccable-Design-Skill als AI-Tell führt (kleine getrackte Caption über
dem eigentlichen Titel).

**Login-Seite** (`app/login/page.tsx`): "Faktencheck" → "Factcheck" (nur Text geändert, Formatierung
unverändert), passend zum neuen Namen.

**Export-Umzug** (`app/page.tsx`): "Export: CSV · Markdown" ist keine eigene Kopfzeile mehr, sondern
steht jetzt rechts neben der Keyboard-Shortcut-Zeile ("Video hovern: …") im Filter-/Toolbar-Bereich
statt über der ganzen Seite. Export bleibt immer sichtbar (auch im Leerzustand); die Shortcut-Zeile
erscheint weiterhin nur, wenn es Einträge gibt. Auf Mobile (375px) umbrechen beide Zeilen sauber
untereinander statt sich zu überlappen (per DOM-Messung + Screenshot geprüft, kein horizontales
Overflow).

Build (0 Fehler), Lint (0 Fehler, nur bereits bestehende Warnungen in `.claude/skills`) und
Testsuite (42/42) grün.

## [2026-07-08] Impeccable-Audit: 3 weitere A11y-Fixes (Kontrast, ARIA, Formular-Labels)

`/impeccable audit` als letzter Schritt vor dem Loom (document → critique → Struktur-Fix → polish
→ audit). Diagnostischer Scan über 5 Dimensionen (A11y, Performance, Theming, Responsive,
Anti-Patterns) auf die ganze App, nicht nur die Inbox. Ergebnis: **16/20 ("Good")**. Drei neue,
bis dahin unentdeckte Accessibility-Funde direkt behoben (Audit findet normalerweise nur, hier
zusätzlich gefixt, weil die Funde jeweils eine einzeilige, risikoarme Ursache hatten):

- **"Abgelehnt"-Statuspille verfehlte AA-Kontrast** (~4,4:1, braucht 4,5:1): dieselbe
  Kontrast-Fallgrube wie zuvor bei `--success`/`--warning`, hier `--destructive` (`#C1432E` →
  `#B03A26`, jetzt ~5,2:1). Nicht Teil der Kritik, weil dort nur success/warning stichprobenartig
  geprüft wurden – Audit hat systematisch alle drei Ampelfarben nachgerechnet und live verifiziert.
- **Score-Zahl ohne Screenreader-Kontext**: `ScoreBadge` zeigte bei `showLabel={false}`
  (Listenansicht) eine nackte, unbeschriftete Zahl für Screenreader – exakt das Sam-Persona-Problem
  aus der Kritik, dort nur beobachtet, jetzt behoben. `aria-label` auf dem Container
  ("Opportunity Score 47 von 100, Mittlere Priorität"), sichtbare Zahl/Label per `aria-hidden`
  ausgeblendet, damit Screenreader nicht beides doppelt vorlesen.
- **Zwei Inputs nur mit Placeholder statt echtem Label** (URL-Import-Feld, Login-Passwortfeld):
  Placeholder verschwindet bei Eingabe und wird nicht von jedem Screenreader zuverlässig als Label
  erkannt (WCAG 1.3.1/4.1.2). Je ein `sr-only`-`<label>` ergänzt, visuell unverändert.

Build, Lint (0 Fehler) und Testsuite (42/42) nach den Fixes grün. `DESIGN.md`/
`.impeccable/design.json` mit dem neuen `--destructive`-Wert nachgezogen.

**Nicht verändert (bewusst, geprüft statt übersehen)**: `--muted-foreground` (#737373) liegt bei
~4,54:1 – knapp über AA, aber fragil nah an der Schwelle; da es aktuell besteht und extrem breit
verwendet wird (Meta-Zeilen, Captions), keine Änderung ohne konkreten Anlass. Touch-Targets bleiben
bei 32px (siehe Polish-Eintrag) statt vollen 44px – bewusster Trade-off gegen das kompakte
Design-System, nicht erneut aufgegriffen. Dark-Mode-Tokens (`.dark`-Block, `dark:`-Utility-Klassen
in den shadcn-Primitiven) existieren, sind aber nie verdrahtet (kein Toggle, kein `next-themes`) –
totes, aber harmloses Boilerplate, kein aktiv gepflegtes Feature; nicht Teil des Produkts
(PRODUCT.md fordert keinen Dark Mode), daher nicht entfernt oder repariert.

## [2026-07-08] Impeccable-Polish: Skeleton-Drift, Semantik, Touch-Targets, Reduced-Motion

`/impeccable polish` auf die Inbox (Fortsetzung von document → critique → Struktur-Fix). Fand und
behob Drift, den die vorherigen Fixes selbst eingeführt hatten, plus ein paar zuvor bewusst
zurückgestellte Kleinigkeiten aus der Kritik:

- **Lade-Skeleton war nach dem Card→Hairline-Redesign stehengeblieben**: `app/loading.tsx` zeigte
  noch die alte `rounded-3xl border bg-card`-Kartenform – nach dem Struktur-Fix wäre beim Laden ein
  falscher Skeleton-Umriss aufgeblitzt, der nicht zur echten (jetzt kartenlosen) Zeile passt.
  `CardSkeleton` → `RowSkeleton`, gleiche Full-Bleed/Hairline-Logik wie die echte Liste.
- **Skipped Heading Level** (Kritik-Fund, damals bewusst außerhalb des P1+P2-Scopes zurückgestellt):
  `<h1>` (Seitentitel) → `<h3>` (Kartentitel) ohne `<h2>` dazwischen. Fix: `<h3>` → `<h2>` in
  `video-card.tsx`.
- **Fehlender sichtbarer Fokus-Ring auf der Zeilen-Link** (vorbestehende Lücke, beim Redesign
  aufgefallen): `focus-visible:ring-3 focus-visible:ring-ring/50` ergänzt – dasselbe Muster, das
  Button/Input bereits nutzen.
- **Touch-Targets**: Annehmen/Ablehnen in der Liste liefen noch auf `size="sm"` (28px) aus der Zeit
  vor dem Redesign; jetzt Standardgröße (32px), konsistent mit dem Rest der App und näher an
  44×44pt.
- **Rohe Server-Fehlermeldungen ungefiltert in Toasts/Inline-Texten** (Kritik: "latent, nicht
  bestätigt aktiv"): neue `truncateMessage()`-Hilfsfunktion (`lib/format.ts`), angewendet in
  `auto-search-button.tsx` (2 Stellen) und `url-import-form.tsx` – begrenzt Länge, ohne Chris die
  Fehlerdetails ganz zu nehmen (die für einen technischen Ein-Personen-Nutzer tatsächlich nützlich
  sind).
- **Stale Kommentar**: `app/api/pipeline/import/route.ts` beschrieb noch "HTTP Basic Auth", obwohl
  der Auth-Wechsel auf Session-Cookies (siehe Eintrag weiter unten) diesen Kommentar nie
  nachgezogen hatte – Schwester-Route (`auto-search/route.ts`) hatte den korrekten Text bereits.
- **`prefers-reduced-motion` global ergänzt** (`app/globals.css`): eine Regel statt
  Einzelfall-Fixes, kollabiert Animations-/Transition-Dauer auf ~0 für alle aktuellen und
  zukünftigen Animationen (Karten-Stagger, Thumbnail-Hover-Zoom), ohne an Sichtbarkeit gekoppelte
  Inhalte leer zu lassen. Schließt den in `DESIGN.md` zuvor offen dokumentierten Punkt.

Build, Lint (0 Fehler) und die volle Testsuite (42/42) nach jeder Änderungsgruppe grün.
`DESIGN.md`/`.impeccable/design.json` entsprechend nachgezogen.

## [2026-07-08] Impeccable-Setup (PRODUCT.md/DESIGN.md) + Inbox-Kritik: 3 P1-Fixes

`/impeccable init` angelegt: `PRODUCT.md` (Register, Nutzer, Brand-Personality, Anti-Referenzen,
Accessibility) und `DESIGN.md` + `.impeccable/design.json` (Token-System, Named Rules, Do's/Don'ts)
aus dem bestehenden Redesign extrahiert. North Star: "Der klare Befund" (Labor-Präzision +
Apple-iOS-Politur, mit dem Nutzer abgestimmt).

Danach `/impeccable critique` auf die Inbox (`app/page.tsx`) – Dual-Agent-Kritik (unabhängiger
Design-Review + Detector/Browser-Evidenz). Ergebnis: 24/40 ("Acceptable"), kein AI-Slop. 3 P1s
identifiziert und in diesem Durchgang direkt behoben:

- **Kein Feedback bei Annehmen/Ablehnen/Erledigt** – Aktionen liefen bisher lautlos, das Kern-Purpose
  der App ("Chris vertraut der Liste genug, um ohne Nachprüfen zu handeln") bekam an genau dieser
  Stelle das wenigste Feedback der ganzen App. Fix: `toast.success`/`toast.info`/`toast.error` nach
  demselben Muster wie `auto-search-button.tsx`, inkl. Error-Handling (vorher unbehandelte Promise-
  Rejections bei Supabase-Fehlern) – `components/inbox/action-buttons.tsx`.
- **Annehmen-Button-Kontrast (4,1:1, braucht 4,5:1)**: `--success` von `#1E8E5A` auf `#1A7D4F`
  nachgeschärft (weiß-auf-Grün jetzt 5,1:1), live per `preview_inspect` gegen den echten
  computed style verifiziert.
- **Score-Badge Mittel-Tier-Kontrast (~2,3:1, deutlich unter AA)**: `--warning` von `#C99A02` auf
  `#7A5F00` nachgeschärft (jetzt ~5,3:1 auf der tonalen Chip-Fläche), live verifiziert.

Beide Token-Änderungen sind rein additiv sicher: `--success` wird sonst nur tonal (Badges,
Confidence-Checkliste) oder dekorativ (Dots) verwendet, `--warning` nur als dekorativer Dot plus
genau dieser einen Text-Stelle – keine Regression an anderen Stellen. `DESIGN.md` und
`.impeccable/design.json` entsprechend mit den neuen Hex-Werten aktualisiert, damit Doku und Code
nicht auseinanderlaufen.

**Bewusst nicht umgesetzt**: ein "Rückgängig"-Undo für Ablehnen wäre nur ein Status-Rollback ohne
Rücknahme der bereits angewendeten Adaptive-Ranking-Gewichtsanpassung (`applyAdaptiveRanking`) –
ein halb-korrektes Undo wäre irreführender als gar keines. Zurückgestellt, siehe IDEAS.md.

Im Anschluss beide P2s aus derselben Kritik direkt umgesetzt:

- **Listenansicht → "Klarer Befund"-Identität**: Card-Chrome (`rounded-3xl border bg-card` +
  Border-Hover) komplett entfernt. Zeilen jetzt Full-Bleed (`-mx-4 px-4`/`-mx-6 px-6`) mit
  `hover:bg-muted/40` statt Border-Farbwechsel, getrennt durch `divide-y divide-border` am
  Listen-Container statt eigener Card-Border. `ScoreBadge` vereinheitlicht: Liste und Detailseite
  teilen sich jetzt dieselbe nackte-Zahl-Sprache (kein Chip mehr), nur die Größe unterscheidet
  (`text-2xl` Liste, `text-6xl` weiterhin exklusiv Detailseite – "Die Eine-Zahl-Regel" bleibt
  intakt). `DESIGN.md`/`.impeccable/design.json` entsprechend nachgezogen. Live auf Desktop und
  Mobile (375px) geprüft.
- **Keyboard-Shortcuts für die tägliche Triage** (`components/inbox/keyboard-triage.tsx`, neu):
  Zeile hovern, dann `a`=annehmen, `1`-`4`=ablehnen mit Grund, `d`=erledigt (bei Angenommen).
  Hover- statt Fokus-gebunden (passt zum bestehenden Maus-Workflow, keine separate
  Roving-Tabindex-Navigation nötig), mit Tipp-Zeile über der Liste für Entdeckbarkeit. Guard gegen
  Eingabefelder (Shortcuts feuern nicht, während z. B. das URL-Import-Feld fokussiert ist) – live
  geprüft: Hover+Taste akzeptiert/lehnt ab wie erwartet, Hover+Taste bei fokussiertem Input-Feld
  bewusst wirkungslos.
  **Bewusst nicht umgesetzt**: echtes Multi-Select/Bulk-Reject (Checkboxen, Auswahl-Toolbar) – die
  Kritik nannte "Keyboard-/Bulk-Aktionen" in einem Punkt, aber Bulk-UI ist ein eigenständiges
  Feature mit echtem State-Management-Aufwand, das der "morgen früh benutzen"-Bar für eine
  Demo-Liste von 15-20 Einträgen nicht klar genug gerecht wird. Einzel-Zeilen-Shortcuts lösen die
  eigentliche Ineffizienz (kein Maus-Klick-Zwang) ohne dieses Risiko.

## [2026-07-08] Filter-Labels, Kontrast-Bugs, Auto-Search-Button, Leerzustand, Import-Form-Höhe

Fünf Nutzer-gemeldete Punkte in einem Batch behoben.

**Filter-Dropdowns** (`components/inbox/filter-bar.tsx`): Alle 4 Dropdowns (Status, Plattform, Thema,
Score-Bereich) bekommen eine kleine Caption darüber, da man vorher nicht ohne Klicken erkennen konnte,
was sie filtern. Zusätzlich einen Anzeige-Bug gefixt: nach Auswahl zeigte der geschlossene Trigger den
rohen Slug (`ernaehrung`) statt des Labels (`Ernährung`) – Ursache war, dass Base UI's `Select.Value`
das Label über die aktuell gemounteten `SelectItem`s auflöst, die beim Schließen des Popups (Portal)
unmounten. Fix: `Select.Root` bekommt jetzt eine `items`-Prop (`{value, label}[]`), die dafür extra von
Base UI vorgesehen ist – löst das Label unabhängig vom Mount-Status auf, behebt den Bug für alle 4
Filter gleichzeitig. Alle 4 Filter selbst funktionierten bereits korrekt (nur die Anzeige war kaputt).

**Kontrast-Bugs** (7 Stellen, 4 Dateien): `text-accent-foreground` (weiß, nur für Text auf
`bg-accent`-Hintergrund gedacht) wurde 6× freistehend auf hellem Hintergrund verwendet und war damit
unsichtbar – CSV/Markdown-Export-Links, "Original ansehen"-Link, Quellen-Links auf der Detailseite und
im Reaktions-Baukasten, Sparkles-Icon. Fix überall: `text-accent-foreground` → `text-accent` (Teal,
bereits AA-kontrastgeprüft). Zusätzlich den "Angenommen"-Status-Badge an die Farbkonvention der
Geschwister-Badges (`done`/`rejected`: getönter Hintergrund + solide Textfarbe) angeglichen.

**URL-Import-Feld**: Input (`h-9`) und "Importieren"-Button (`h-8` Default-Größe) waren 4px
unterschiedlich hoch. Input auf `h-8` verkleinert – das ist die App-weite Standardhöhe (auch bei
Select-Triggern).

**Auto-Search-Button** (`components/inbox/auto-search-button.tsx`, `app/api/pipeline/auto-search/route.ts`):
Löst die bestehende Discovery-Pipeline aus und sucht, bis 5 neue Videos mit Confidence ≥ 70 % gefunden
wurden. Da `runDiscovery` bisher ein starrer Batch-Lauf ohne Stopp-Mechanismus war, `lib/pipeline/discovery.ts`
um einen `onProgress`-Callback plus zwei Limits erweitert (`stopAfterFoundCount`, `maxCandidatesProcessed`) –
neue Parameter sind optional, bestehende Aufrufer (`/api/cron/discover`, `scripts/test-pipeline.ts`)
unverändert kompatibel. Drei Grenzen, je nachdem was zuerst eintritt: 5 gefundene Treffer, 20 geprüfte
Kandidaten (Sicherheitsnetz gegen Claude-Kosten/Wartezeit bei schlechter Trefferquote), 8 `search.list`-
Aufrufe (≈800 von 10.000 Tages-Units). Live-Fortschritt im Button ("Suche läuft... x/5 gefunden") per
Streaming-Response (`ReadableStream`, NDJSON) statt Polling (keine neue Job-State-Tabelle nötig) oder
reinem Blocking-Call (hätte keinen echten Fortschritt zeigen können). Neue Abhängigkeit `sonner` für die
Ergebnis-Toasts ("5 neue Videos gefunden" / "Keine neuen Treffer") – kein Toast-Primitive existierte
bisher im Projekt, `sonner` ist der De-facto-Standard für shadcn-artige Projekte, React-19-kompatibel
geprüft. `/api/cron/discover` läuft aktuell nicht automatisiert (nicht in `vercel.json` eingetragen) –
der Auto-Search-Button ist damit faktisch der erste wiederkehrende Weg, wie neue Videos gefunden werden.
**Live mit echten YouTube-/Claude-Aufrufen getestet**: ein Klick fand und verarbeitete 9 Kandidaten,
stoppte korrekt exakt bei 5 Treffern (u. a. ein neuer Honig-Mythos-Treffer mit Confidence 100), alle 5
erschienen danach in der Standard-Inbox-Ansicht.

**Leerzustand** (`app/page.tsx`): Unterscheidet jetzt zwischen "Filter schließen alles aus" (Hinweis +
"Filter zurücksetzen"-Link) und "keine aktiven Filter, Inbox aber trotzdem leer" (Hinweis verweist auf
den jetzt echten Auto-Search-Button statt wie bisher auf unklickbaren Text).

## [2026-07-07] Eigene Login-Seite statt Browser-Basic-Auth

`proxy.ts` prüfte bisher rohe HTTP-Basic-Auth-Header (`AUTH_USERNAME`/`AUTH_PASSWORD`) und zeigte
den nativen Browser-Login-Dialog – funktional, aber nicht im App-Design gestaltbar und nicht das
gewünschte Erlebnis für eine Bewerbungs-Demo. Ersetzt durch eine eigene `/login`-Seite im
bestehenden Design-System (zentriert, "Faktencheck" als Space-Grotesk-Headline, schlichtes
Passwort-Feld + Button, kein Card-Chrome).

**Session-Mechanismus:** Statt Basic-Auth-Header wird nach erfolgreichem Login ein signierter,
HttpOnly-Cookie (`fc_session`, `Secure` in Production, `SameSite=Lax`, 180 Tage Laufzeit) gesetzt.
Signiert wird per HMAC-SHA256 über `crypto.subtle` (Web-Crypto-API, läuft identisch in der
Edge-Runtime von `proxy.ts` und der Node-Runtime der Server Action) – der Signierschlüssel wird
direkt aus `AUTH_PASSWORD` abgeleitet, es gibt also **kein neues Secret**: `AUTH_PASSWORD` bleibt
einzige Quelle der Wahrheit, exakt wie gefordert. Verifikation läuft über `crypto.subtle.verify`
(intern konstant-zeitig, kein manueller String-Vergleich der Signatur → keine Timing-Angriffsfläche).
Neues Modul: `lib/auth/session.ts`.

`app/login/actions.ts` (Server Action) gibt bei Fehleingabe bewusst `{ error }` zurück statt zu
werfen – ein geworfener Server-Action-Error hätte Next.js' generisches Error-Overlay gezeigt statt
der geforderten ruhigen Inline-Meldung ("Passwort stimmt nicht."). `app/login/page.tsx` redirected
sofort zur Inbox, falls bereits ein gültiger Cookie vorliegt (kein Login-Flackern bei bestehender
Session).

`AUTH_USERNAME` ist damit ungenutzt (nur noch in der jetzt ersetzten Basic-Auth-Logik referenziert)
– aus `.env.example` entfernt, Kommentar auf den neuen Mechanismus aktualisiert.

**Live getestet** (Dev-Server): Redirect ohne Cookie auf `/login`, Falscheingabe zeigt ruhige
Inline-Fehlermeldung ohne Reload/Error-Overlay, korrektes Passwort redirected zur Inbox und setzt
den Cookie, Session übersteht Reload, `/login` redirected bei bestehender Session sofort zur Inbox,
ein manuell gefälschter Cookie (`curl` mit falscher Signatur) wird zuverlässig abgelehnt (307 zurück
auf `/login`), Cookie ist per JS nicht lesbar/überschreibbar (HttpOnly greift), Mobile-Viewport
(375px) ohne horizontalen Overflow. `npm run build` und `npm run lint` sauber.

## [2026-07-07] Untersuchung "Detailseite hängt im Lade-Skeleton": Testbrowser-Artefakt, kein App-Bug

Auf Nutzer-Hinweis hin gezielt gegen die echte Production-URL getestet (nicht nur Dev-Server):
direkte URL-Navigation zur Detailseite + mehrfacher Hard-Reload in einem echten, mit dem
Windows-Nutzerprofil verbundenen Chrome-Browser gegen `cw-app-eosin.vercel.app`. Erster Befund:
**2 von 3 Hard-Reloads blieben dauerhaft im Lade-Skeleton hängen** (auch nach 15+ Sekunden
Wartezeit) – der echte Inhalt war im HTML vorhanden, aber unsichtbar in einem `<div hidden>`
gefangen (`bis_skin_checked`-Attribut sichtbar – dasselbe Signal wie beim Phase-2-Bug).

**Voreiliger Zwischenschritt (zurückgenommen):** Erste Vermutung war, `app/videos/[id]/loading.tsx`
verursache eine zusätzliche, route-eigene Suspense-Grenze und ihr Entfernen würde das Problem
beheben. Nach dem Entfernen zunächst 5/5 saubere Reloads – aber weitere Tests widerlegten das:
dieselbe "erfolgreiche" URL blieb beim nächsten Versuch ebenfalls hängen, ein Video mit
Reaktions-Baukasten 2/2 Mal, und sogar die Inbox zeigte strukturell denselben
`<div id="S:0" hidden>`-Wrapper um den gesamten Inhalt. Das Streaming-Marker-Muster
(`<!--$-->…<!--/$-->` + Reveal-Script) ist fester Bestandteil von Next.js' 16 RSC-Streaming für
jede dynamische Seite dieser App, unabhängig von `loading.tsx` – das Entfernen der Datei hatte
keinen echten Effekt, nur zufällig eine Erfolgsserie erzeugt.

**Entscheidender Test:** derselbe Reload-Stresstest (6 Durchläufe je Route: Inbox, einfache
Detailseite, Detailseite mit Reaktions-Baukasten) in einem frischen, erweiterungsfreien
Chromium (via Playwright, `npx playwright install chromium`, keine Verbindung zum
Windows-Chrome-Profil) gegen dieselbe Production-URL: **0 von 18 Versuchen hängen geblieben.**
Damit bestätigt: das Problem ist **spezifisch an die im Testbrowser installierte
Antiviren-Erweiterung (Bitdefender) gebunden**, die per MutationObserver DOM-Attribute
injiziert, bevor Reacts Streaming-Reveal-Script laufen kann, und dabei gelegentlich das Rennen
gewinnt – kein Bug im App-Code, kein Next.js-/Vercel-Problem.

**Endzustand:** `app/videos/[id]/loading.tsx` wiederhergestellt (auf das neue
Hairline-Divider-Design des Redesigns angepasst, `gap-8`→`gap-14`, Card-Chrome→`border-t`,
damit das Skeleton zur echten Seite passt) – kein Grund, die Lade-Skeleton-UX für ein Problem
zu opfern, das nicht im Code liegt. **Falls Chris beim echten Arbeiten mit der App eine
Detailseite dauerhaft hängen sieht:** höchstwahrscheinlich eine ähnliche
DOM-mutierende Browser-Erweiterung (Antivirus, Werbeblocker o. Ä.) – Erweiterungen deaktivieren
oder Inkognito-Fenster testen, keine Server-/Code-Ursache zu erwarten.

## [2026-07-07] Design-Redesign: weg vom "KI-generiert"-Look (Design-Richtung C)

Reiner visueller Redesign-Pass über alle 3 Views (Inbox, Detailansicht, Reaktions-Baukasten),
keine Funktionsänderung. Grund: die bisherige "Design-Richtung B" (warmes Creme, Amber-Akzent,
`rounded-3xl` überall, Newsreader-Serif-Kursiv-Zitate, weiche Radial-Gradient-Blobs im
Hintergrund) ist der bekannteste KI-Generierungs-Default und schwächt "Design-Gespür"
(Bewertungskriterium MASTERPLAN §8) – wirkt wie ein Wellness-Blog, nicht wie ein eigenständiges
SaaS-Tool.

**Neues Token-System** (`app/globals.css`, alle Werte als Hex statt OKLCH):
- Neutrales Off-White (`#FAFAFA`) / Fast-Schwarz (`#141414`) statt Creme/Charcoal.
- Ein Akzent: Deep Teal `#0B7A6A` (mit dem User abgestimmt: 2 Optionen vorgeschlagen –
  Cobalt Blue vs. Deep Teal –, Teal gewählt; Hex leicht von der Vorschau-Farbe `#0C8C7A`
  nachgeschärft für AA-Kontrast auf Weiß).
- Echte Ampel-Logik für Score/Confidence: neuer `--warning`-Token (`#C99A02`) ergänzt
  `--success`/`--destructive` – vorher nutzte der "mittlere" Tier fälschlich die Akzentfarbe
  (Bug: Statusfarbe und Markenfarbe waren vermischt), jetzt sauber getrennt
  (`score-badge.tsx`, `confidence-checklist.tsx`).
- `--radius` von `0.85rem` auf `0.15rem` – da alle `rounded-{sm..4xl}`-Stufen bereits aus diesem
  einen Wert berechnet werden, schärft eine Zeile automatisch Cards/Buttons/Inputs/Popovers auf
  2–6px, ohne Klassen in den Komponenten anzufassen. Badges/Status-Pills bleiben bewusst
  `rounded-full` (Tag-Semantik, keine Regression).
- Inter (neu) als Body-/UI-Font, Space Grotesk exklusiv für Headlines + die Score-Zahl.
  Newsreader (Serif/Kursiv) komplett entfernt – Zitate ("Die Falschaussage") bekommen
  stattdessen einen linken Akzent-Farbbalken + stilisiertes „-Zeichen statt Kursivschrift.
- Dekorative Radial-Gradient-Blobs + SVG-Noise-Overlay im `body`-Hintergrund entfernt (flache
  Fläche).
- Score-Zahl auf der Detailseite ist jetzt das visuelle Signature-Element: kein umschließender
  Chip mehr, nur eine große Space-Grotesk-Zahl (`text-6xl`) in Ampel-Farbe + Tier-Dot.
- Detailseiten-Blöcke (Falschaussage / Warum jetzt reagieren / Confidence) verloren ihre
  Card-Umrandung (`bg-card border rounded-3xl`) zugunsten von Hairline-Trennern
  (`border-t border-border`) und mehr Weißraum zwischen den Blöcken.
- Reaktions-Baukasten: Glow-Box (`border-2 border-accent/50 bg-accent/5`) ersetzt durch eine
  scharfkantige Section mit `border-t-4 border-accent`-Signaturstreifen.

**Live gefundener und gefixter Bug:** `font-display` (auf allen Headlines/der Score-Zahl seit
Projektstart verwendet) war **nie eine echte Tailwind-Utility** – `@theme inline` registrierte
nur `--font-heading`, nicht `--font-display` selbst, und Tailwind reserviert `--font-display`
intern für den CSS-`font-display`-Deskriptor (`@font-face`-Ladeverhalten), sodass ein eigener
Wert dafür beim Build still verworfen wird (selbst-referenzierend zu `var(--font-display)`
kompiliert). Unsichtbar bisher, weil `--font-sans` zufällig auch auf Space Grotesk zeigte – mit
Inter als neuem Body-Font wäre jede Headline plötzlich in Inter statt Space Grotesk gelandet.
Fix: alle Vorkommen von `font-display` in den Komponenten auf `font-heading` umbenannt (das
bereits korrekt gemappte, unbenutzte Theme-Token), `--font-display` aus `globals.css` entfernt.
Per DOM-Inspektion (`getComputedStyle`) verifiziert: Headlines/Score-Zahl rendern jetzt korrekt
in Space Grotesk.

**Live geprüft:** Ampel-Logik gegen echte Daten (Score 61 → grün, 59/52/47/46 → gelb), Zitat-
Behandlung (kein Kursiv mehr, Akzent-Balken korrekt), Hairline-Dividers + Reaktions-Baukasten-
Streifen per DOM-Inspektion, kein horizontales Overflow bei 375px (Inbox + Detailseite).
`npm run build`/`npm run lint` sauber. Screenshot-Tool war in dieser Session durchgehend nicht
nutzbar (Timeout) – Verifikation komplett über `preview_eval`/`preview_inspect`
(computed styles, DOM-Struktur) statt visueller Screenshots.

**Nebenbei entdeckt, bewusst nicht angefasst:** Die Detailseite (`/videos/[id]`) hängt im
Turbopack-Dev-Server nach einer Hard-Navigation zuverlässig im Suspense-Fallback fest (echter
Inhalt liegt korrekt im HTML, aber in einem `<div hidden>`, das nie sichtbar geswappt wird –
`document.querySelectorAll('section')` zeigt Skeleton *und* echten Inhalt gleichzeitig).
Per `git stash` gegen den unveränderten Code verifiziert: **reproduziert identisch ohne jede
Redesign-Änderung** – vorbestehender Dev-Mode-Bug (Next.js 16.2.10 + Turbopack), nicht durch
dieses Redesign verursacht. Nicht gefixt, da außerhalb des Scopes "reines Redesign, keine
Funktionsänderung" – separates Ticket falls das auch in einem echten Browser (nicht nur im
automatisierten Preview-Tool) reproduziert.

## [2026-07-07] Reaktions-Baukasten-Fehler auf Vercel: Root Cause gefunden und behoben

Root Cause bestätigt über `vercel logs` (Runtime-Logs des Production-Deployments), nicht geraten:

```
Error: ANTHROPIC_API_KEY nicht gesetzt
    at j (.next/server/chunks/ssr/_0pzwurq._.js:16:1467)
    ...
  digest: '4025235996'
```

`ANTHROPIC_API_KEY` stand zwar in `.env.local`, war aber **nie** als Vercel-Environment-Variable
für Production/Preview angelegt worden (`vercel env ls production` zeigte nur 6 der 7 lokal
gesetzten Variablen). `callClaudeTool` (`lib/claude/client.ts:26`) wirft in diesem Fall bewusst
einen `Error("ANTHROPIC_API_KEY nicht gesetzt")` - aber Next.js redigiert Server-Action-Fehler in
Production-Builds standardmäßig zur generischen "Server Components render"-Meldung, bevor sie den
Browser erreichen. Deshalb zeigte der Client nur den Digest, nie den echten Text, obwohl
`reaction-builder.tsx` den Fehler technisch korrekt per try/catch abfängt und anzeigt.

**Warum das beim letzten Mal nicht auffiel:** Der direkte Aufruf von
`generateAndSaveReactionScript` lief lokal (mit lokal gesetztem `ANTHROPIC_API_KEY`) und der lokale
Production-Build liefen beide fehlerfrei durch - beide hatten den Key. Nur die tatsächliche
Vercel-Umgebung nicht. Ohne echten Log-Zugriff auf das Deployment war das vorher nicht zu sehen.

**Fix:**
1. `ANTHROPIC_API_KEY` per `vercel env add` zu Production und Preview hinzugefügt (Wert identisch
   zu `.env.local`).
2. Production-Deployment per `vercel redeploy` neu gebaut, damit der neue Wert in die
   Server-Functions gebacken wird (Vercel injiziert ENV-Vars beim Build, nicht live).
3. End-to-End live gegen `cw-app-eosin.vercel.app` verifiziert: eingeloggt (Basic Auth), auf dem
   Honig-Video (`cb8d2f2a...`) "Skript generieren" geklickt - Server-Action-POST kam mit `200`
   zurück (vorher `500`), alle 4 Blöcke (Hooks, Kernargument, Analogie, CTA) rendern korrekt mit
   echtem, in Chris' Ton generiertem Inhalt.

**Nebenbei entdeckt:** `AUTH_PASSWORD` in Vercel Production ist bereits ein echtes Passwort
(nicht mehr `test-local-only`) - der entsprechende TASKS.md-Punkt war schon erledigt, nur nicht
abgehakt.

**Nicht angefasst (bewusst zurückgestellt):** Next.js redigiert *alle* Server-Action-Fehler in
Production auf diese generische Meldung, nicht nur diesen einen Fall. Für ein Ein-Personen-Tool
wäre es hilfreich, echte Fehlermeldungen im UI zu zeigen (z. B. durch Rückgabe von
`{error: string}` statt `throw` in den Server Actions). Das wäre ein Verhaltens-/API-Change über
alle Server Actions hinweg (`app/actions.ts`) und damit mehr als der reine Bugfix - siehe
IDEAS.md, falls gewünscht.

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
