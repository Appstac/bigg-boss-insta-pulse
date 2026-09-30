"use client";

/**
 * Light/dark switch. Dark is the default; a light choice is remembered in localStorage and applied
 * before first paint by the inline script in layout.tsx. Icons swap via CSS on [data-theme], so
 * there is nothing to hydrate.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage blocked (private mode): the choice lasts for this page only
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label="Switch between light and dark mode"
      title="Light / dark mode"
    >
      {/* Sun: shown in dark mode (click for light) */}
      <svg className="theme-when-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Moon: shown in light mode (click for dark) */}
      <svg className="theme-when-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
