-- Reaktions-Baukasten (MASTERPLAN.md §3.3): Hook/Kernargument/Analogie/CTA werden von
-- Claude generiert und hier persistiert, damit sie nicht bei jedem Seitenaufruf neu (und
-- auf Kosten der Claude-Quota) erzeugt werden muessen. Quellen kommen bewusst NICHT aus
-- diesem Feld, sondern werden direkt aus dem bereits verifizierten myths.sources_json
-- gelesen (keine Halluzinationsgefahr durch von Claude erfundene Quellen).
-- Wie 0001-0003: im Supabase SQL Editor ausfuehren.

alter table videos add column if not exists reaction_script jsonb;
