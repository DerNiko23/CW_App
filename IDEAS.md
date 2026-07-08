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
- TikTok/Instagram-Automatisierung, falls je API-Zugang (Adapter-Interfaces liegen bereit)
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
