export type Status = "active" | "evicted";

export interface Contestant {
  id: string;
  name: string;
  teluguName: string;
  profession: string;
  status: Status;
  /** Instagram username without @. Empty until verified. */
  instagram: string;
  /** YYYY-MM-DD, used to mark the eviction on charts. */
  evictedOn: string | null;
  /** Slug on the roster source page (biggbosspulse.com), used by scripts/sync-roster.ts. */
  sourceSlug?: string;
  entryType?: "original" | "wildcard";
  /** YYYY-MM-DD the contestant was added to tracking. */
  addedOn?: string;
  /** Set when status was changed by hand on /admin; the roster sync then leaves status alone. */
  manual?: boolean;
}

export interface Season {
  show: string;
  season: number;
  premiereDate: string;
  timezone: string;
  sourceUrl: string;
}

/** One row per contestant per day (IST). */
export interface Snapshot {
  date: string;
  id: string;
  followers: number;
  following: number;
  posts: number;
}

/** One row per contestant per collector run (every ~30 min); only the last 48 hours are kept. */
export interface IntradayPoint {
  /** ISO timestamp of the run */
  t: string;
  id: string;
  followers: number;
}

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";

export interface Post {
  postId: string;
  id: string;
  /** ISO timestamp */
  timestamp: string;
  type: MediaType;
  likes: number | null;
  comments: number;
  permalink: string;
  caption: string;
  /** Image or video-thumbnail URL from Instagram (CDN links expire; refreshed daily). */
  image?: string;
}

/** Public profile details written by the collector (data/profiles.json). */
export interface Profile {
  fullName: string;
  biography: string;
  website: string;
}

export interface Meta {
  source: "demo" | "instagram";
  lastUpdated: string | null;
  /** id -> ISO time the profile photo was last downloaded. */
  photos?: Record<string, string>;
}

export interface Dataset {
  season: Season;
  contestants: Contestant[];
  profiles: Record<string, Profile>;
  /** id -> public image path, if a photo exists. */
  photos: Record<string, string>;
  snapshots: Snapshot[];
  intraday: IntradayPoint[];
  posts: Post[];
  meta: Meta;
}
