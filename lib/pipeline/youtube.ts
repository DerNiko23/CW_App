import type { VideoMetadata } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";
export const VIDEOS_LIST_BATCH_SIZE = 50;

type YouTubeSearchResponse = {
  items?: Array<{ id?: { videoId?: string } }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
};

export function parseVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) return shortsMatch[1];
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

// YouTube kennt keinen echten "nur Shorts"-Filter, nur eine grobe Längen-Einteilung:
// short = < 4 Min, medium = 4-20 Min, long = > 20 Min. "short" erwischt Shorts + kurze Videos,
// schließt aber auch längere Erklärvideos aus (z. B. das 5:28-Galileo-Video). Ändert die
// Quota-Kosten NICHT (search.list bleibt 100 Units), ist rein inhaltlich.
export type VideoDuration = "short" | "medium" | "long";

// search.list – 100 Units pro Aufruf. Liefert nur Video-IDs; Details/Statistiken
// kommen separat über getVideoDetails (billiger, batchbar).
export async function searchVideoIds(
  query: string,
  apiKey: string,
  maxResults = 10,
  videoDuration?: VideoDuration,
): Promise<string[]> {
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("regionCode", "DE");
  url.searchParams.set("relevanceLanguage", "de");
  if (videoDuration) url.searchParams.set("videoDuration", videoDuration);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube search.list fehlgeschlagen: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as YouTubeSearchResponse;
  return (json.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));
}

// videos.list – 1 Unit pro Aufruf, bis zu 50 IDs gleichzeitig.
export async function getVideoDetails(
  videoIds: string[],
  apiKey: string,
): Promise<VideoMetadata[]> {
  if (videoIds.length === 0) return [];
  if (videoIds.length > VIDEOS_LIST_BATCH_SIZE) {
    throw new Error(`getVideoDetails: max ${VIDEOS_LIST_BATCH_SIZE} IDs pro Aufruf`);
  }

  const url = new URL(`${API_BASE}/videos`);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube videos.list fehlgeschlagen: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as YouTubeVideosResponse;

  return (json.items ?? []).map((item) => ({
    externalId: item.id,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    title: item.snippet?.title ?? "",
    channel: item.snippet?.channelTitle ?? "",
    channelId: item.snippet?.channelId ?? "",
    publishedAt: item.snippet?.publishedAt ?? null,
    thumbnail:
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.medium?.url ??
      null,
    views: Number(item.statistics?.viewCount ?? 0),
    likes: Number(item.statistics?.likeCount ?? 0),
    comments: Number(item.statistics?.commentCount ?? 0),
  }));
}
