-- Feature: Chris' eigene Videos (@christianwolf, Channel-ID via YouTube Data API aufgeloest)
-- sollen nie als Faktencheck-Vorschlag in der Inbox landen - weder ueber Auto-Search noch
-- manuellen URL-Import. processVideo() (lib/pipeline/process.ts) prueft das jetzt vor dem
-- Transkript-/Claude-Aufwand und loggt den Skip mit diesem neuen Grund.
-- Wie 0001-0005: im Supabase SQL Editor ausfuehren.
-- Hinweis: ALTER TYPE ... ADD VALUE darf nicht in derselben Transaktion wie ein Zugriff auf den
-- neuen Wert stehen - diese Migration steht deshalb bewusst allein in ihrer eigenen Datei.

alter type discovery_skip_reason add value if not exists 'own_channel';
