/**
 * JS-side mirror of the named colors in tailwind.config.js (P4-01).
 * Tailwind's arbitrary-hex classes (`text-[#EF4444]`) cover CSS-authored
 * color, but Chart.js options and SVG `stroke`/`fill` attributes take plain
 * strings, not class names — this is the one place those values live so
 * components consuming them still have zero hex literals of their own.
 */
export const COLORS = {
  coral: "#FF385C",
  cobalt: "#2563EB",
  surface: "#0b0f19",
  surfaceRaised: "#0c1118",
  base: "#050811",
  muted: "#7d7d87",
  positive: "#10B981",
  negative: "#EF4444",
};

/**
 * Motion durations/easing (P4-13) — GSAP timelines take numeric seconds and
 * easing name strings, which CSS's tailwind.config.js transitionDuration
 * tokens can't express. Shared here so components don't hardcode their own.
 */
export const MOTION = {
  durationFast: 0.15,
  durationBase: 0.3,
  durationSlow: 0.6,
  staggerTight: 0.015,
  staggerLoose: 0.08,
  ease: "power1.out",
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
