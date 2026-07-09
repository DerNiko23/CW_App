# IDEAS – Bewusst zurückgestellt (nicht vergessen, nicht jetzt)

> Alles hier hat die Frage "Würde Chris das morgen früh tatsächlich benutzen?" nicht klar genug mit Ja beantwortet – oder kostet mehr, als es für die Bewerbung bringt. Einiges davon ist gutes Material fürs Loom ("Das wäre der nächste Schritt").

## Discovery & Analyse
- **Stance-Erkennung** (verbreitet das Video den Mythos, oder entkräftet es ihn bereits?):
  bei der Phase-4-Kuration fiel auf, dass Claim-Extraction + Mythen-Matching zuverlässig das
  *Thema* trifft, aber nicht unterscheidet, ob das Video die Falschaussage *vertritt* oder
  *korrigiert* - Suchqueries nach Mythen-Namen finden beide Sorten gleichermaßen. Aktuell
  manuell in der Kuration geprüft (Zitat/Volltranskript). Ein zusätzlicher Claude-Check
  ("vertritt dieses Zitat den Mythos oder widerlegt es ihn?") wäre der nächste Schritt, kostet
  aber einen weiteren API-Call pro Claim - erst sinnvoll, wenn die Discovery-Menge deutlich
  wächst und manuelle Kuration nicht mehr trägt.
- **Kommentar-Inhaltsanalyse** ("Community diskutiert stark"): eigenes NLP-Problem + Quota-Kosten. Aktuell nur Kommentar-Anzahl/Views als Engagement-Signal.
- **Whisper-Fallback** für Videos ohne Transkript (Kosten/Nutzen erst prüfen, Skip-Log auswerten)
- **Vollständige Duplicate Detection** gegen Chris' kompletten Kanal-Katalog (eigener Ingestion-Job + Embedding-Vergleich). Jetzt: manuelle Liste + "Erledigt"-Status.
- **Ironie-/Kontext-Erkennung**: bewusst NICHT versprochen. Ehrlichkeit > Feature-Liste.
- **Trend-Radar**: Welche Mythen tauchen diese Woche gehäuft auf? (Aggregation über Claims)

## Plattformen
- **TikTok/Instagram Auto-Search + Import (Lösungsvorschlag ausgearbeitet, bewusst nicht
  umgesetzt, 2026-07-10):** Recherche bestätigt, MASTERPLAN §5 stimmt weiterhin – TikTok Research
  API ist explizit nur für akademische/Non-Profit-Forschung ("commercial users, creators, and
  advertisers are explicitly ineligible"), Instagram Graph API hat keine offene Such-Endpoint für
  fremde Inhalte (Hashtag-Suche nur für eigenen Business-Account, 30 Hashtags/7 Tage gedeckelt).
  Kein kostenloser offizieller Weg, weder für uns noch für irgendwen sonst in unserer Situation.
  **Möglicher Weg (falls je gewünscht):** dieselbe Grundidee wie beim YouTube-Proxy-Fix – eine
  kleine, kostenbegrenzte Drittanbieter-Infrastruktur statt Verzicht. Etablierter Markt an
  Social-Media-Scraping-APIs (Apify-Actors, [ScrapeCreators](https://scrapecreators.com/),
  HikerAPI) bietet Hashtag-/Keyword-Suche + Metadaten + teils Transkripte, sehr günstig
  (~$0,0003–$0,005/Ergebnis). ScrapeCreators sticht heraus: eine einheitliche API für TikTok UND
  Instagram (und YouTube), Prepaid-Credits statt Abo (harte Kostenobergrenze von Natur aus), 1000
  Gratis-Credits zum Testen. Architektur bräuchte kaum Umbau: `videos.platform` existiert bereits
  seit `0001_init.sql`, Topic Detection/Claim Extraction/Scoring/Inbox sind schon
  plattform-agnostisch – nur ein `PlatformCollector`-Interface (`searchIds`/`getDetails`/
  `fetchTranscript`) fehlt, YouTube (`lib/pipeline/youtube.ts`, `transcript.ts`) wäre die erste
  Implementierung davon, TikTok/Instagram neue Implementierungen desselben Interfaces.
  **Zwei echte Unbekannte vor einer Umsetzung:** (1) Transkript-Qualität auf TikTok/Instagram
  vermutlich schlechter als YouTube (oft Voiceover ohne verlässliche native Untertitel, manche
  Anbieter lösen das über eigene KI-Transkription – höhere Kosten/Fehlerquote), (2)
  View-Zahlen-Vergleichbarkeit für den Opportunity Score müsste mit echten Daten kalibriert
  werden. **Falls je verfolgt:** Spike ohne Code zuerst (Gratis-Trial gegen 5–10 bekannte
  Chris-relevante Accounts testen, Transkript-Abdeckung real prüfen), dann ein Collector zuerst
  (TikTok vor Instagram), Auto-Search-Plattform-Umschalter statt stillem Kosten-Verdreifachen bei
  jedem Klick, eigene `scraper_quota_usage`-Tabelle analog `youtube_quota_usage`, und die
  Snapshot-Cron-Erweiterung auf neue Plattformen explizit als eigener Rücksprache-Schritt (nicht
  automatisch mitgezogen). Grund für "nicht jetzt": Nutzer wollte den Weg dokumentiert, aber nicht
  umgesetzt haben.
- Podcast-Quellen (Spotify/RSS + Transkription)

## Workflow
- **Rückgängig für Ablehnen**: reiner Status-Rollback (zurück auf "new") würde die bereits
  angewendete Adaptive-Ranking-Gewichtsanpassung (`applyAdaptiveRanking`) nicht zurücknehmen –
  ein Undo, das nur den Status zurücksetzt, aber die Gewichte verändert lässt, wäre irreführender
  als gar kein Undo. Erst sinnvoll, wenn `applyAdaptiveRanking` eine echte Umkehrfunktion bekommt.
- Slack/E-Mail-Digest: "Deine Top 3 heute Morgen"
- Kalender-Integration: Angenommenes Video → Drehtermin
- Team-Fähigkeit (Mehrbenutzer, Rollen) – aktuell bewusst Ein-Personen-Tool
- Erweiterte Statusstufen (In Bearbeitung, Archiviert) – nur falls Chris es wirklich will

## Content
- Thumbnail-Vorschläge (Higgsfield) direkt im Reaktions-Baukasten
- Shorts-Skript-Variante (60 Sek.) zusätzlich zum Langform-Skript
- Automatischer Quellen-Screenshot für Video-Einblendungen
