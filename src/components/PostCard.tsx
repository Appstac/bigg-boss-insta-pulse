/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { PostWithStats } from "@/lib/analytics";
import { compact, percent, shortDate } from "@/lib/format";
import { istDate } from "@/lib/analytics";
import { Icon } from "./Icon";

const TYPE_LABEL: Record<string, string> = { REEL: "Reel", VIDEO: "Video", CAROUSEL_ALBUM: "Carousel", IMAGE: "Photo" };

export function PostCard({ post, rank }: { post: PostWithStats; rank: number }) {
  const [broken, setBroken] = useState(false);
  const showImg = post.image && !broken;
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
        {showImg ? (
          <img src={post.image} alt={post.caption.slice(0, 80) || "Instagram post"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="brand-bg grid h-full w-full place-items-center opacity-80">
            <span className="text-white/90">
              <Icon name={post.type === "REEL" || post.type === "VIDEO" ? "play" : "image"} size={32} />
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">#{rank}</span>
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur">{TYPE_LABEL[post.type] ?? post.type}</span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8 text-white">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex items-center gap-1"><Icon name="heart" size={13} /> {post.likes == null ? "hidden" : compact(post.likes)}</span>
            <span>💬 {compact(post.comments)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="text-muted">{shortDate(istDate(post.timestamp))}</span>
        <span className="tnum font-semibold">{percent(post.er, 2)} eng.</span>
      </div>
    </>
  );
  return post.permalink ? (
    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl border border-line bg-surface">
      {body}
    </a>
  ) : (
    <div className="group overflow-hidden rounded-2xl border border-line bg-surface">{body}</div>
  );
}
