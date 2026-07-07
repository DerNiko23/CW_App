-- Bug-Fix: `covered_by_chris` wurde fuer zwei verschiedene Dinge wiederverwendet - die
-- manuell gepflegte Startliste ("Chris hat dazu wirklich schon ein Video gemacht") UND
-- die Adaptive-Ranking-Unterdrueckung nach 3x "Thema uninteressant"
-- (lib/ranking/adaptive.ts, suppressMythIfRepeatedlyUninteresting). Letzteres bedeutet nur
-- "Chris findet das Thema uninteressant", nicht "bereits behandelt" - die UI zeigte aber in
-- beiden Faellen denselben "bereits behandelt"-Text (lib/inbox/scoreBullets.ts). Getrennte
-- Spalte, damit die Score-Absenkung (Novelty-Faktor) fuer beide Faelle erhalten bleibt, die
-- Anzeige aber nur bei echtem `covered_by_chris` oder einem echten `done`-Video "bereits
-- behandelt" sagt.
-- Wie 0001-0004: im Supabase SQL Editor ausfuehren.

alter table myths add column if not exists topic_deprioritized boolean not null default false;
