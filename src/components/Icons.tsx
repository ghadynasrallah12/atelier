/** Small inline icon set (stroke icons, 16px). Keeps the shell free of icon-font dependencies. */
const P = (d: string) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
export const I = {
  house: () => P("M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"),
  library: () => P("M4 4h5v16H4zM10 4h5v16h-5zM16 5l4 1-3 14-4-1z"),
  models: () => P("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"),
  shoot: () => P("M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"),
  gallery: () => P("M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4"),
  hooks: () => P("M12 3v10m0 0a4 4 0 1 1-4 4M12 13a4 4 0 1 0 4 4"),
  reels: () => P("M4 5h16v14H4zM4 9h16M8 5l2 4M13 5l2 4M18 5l2 4M10 12l5 3-5 3z"),
  reach: () => P("M4 19V9m5 10V5m5 14v-7m5 7V3"),
  settings: () => P("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"),
  admin: () => P("M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8z"),
  plus: () => P("M12 5v14M5 12h14"),
  key: () => P("M14 10a4 4 0 1 0-4 4l1 1h2v2h2v2h3v-3l-5-5z"),
  lock: () => P("M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4"),
  brands: () => P("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
};
export type IconName = keyof typeof I;

/** Wordmark: a cut square with the letter. */
export function Logo({ size = 22 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2 font-bold tracking-[.3em] text-[14px]"><svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="M3 3h18v12l-6 6H3z" fill="var(--accent)" /><path d="M8 17l4-10 4 10M9.6 13.5h4.8" stroke="var(--accent-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>ATELIER</span>;
}
