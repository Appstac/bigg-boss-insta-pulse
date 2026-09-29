"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/contestants", label: "Contestants" },
  { href: "/compare", label: "Compare" },
  // Shorter label on phones so all four tabs fit without scrolling.
  { href: "/leaderboards", label: "Leaderboards", short: "Rankings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto no-scrollbar">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3.5 sm:text-sm ${
              active ? "bg-ink text-page" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {"short" in l && l.short ? (
              <>
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </>
            ) : (
              l.label
            )}
          </Link>
        );
      })}
    </div>
  );
}
