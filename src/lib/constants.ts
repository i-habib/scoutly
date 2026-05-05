// Shared constants used across the app
// Canonical source for rank ordering — import this instead of redefining RANK_ORDER

export const RANK_ORDER = [
  'rank_scout',
  'rank_tenderfoot',
  'rank_second_class',
  'rank_first_class',
  'rank_star',
  'rank_life',
  'rank_eagle',
] as const;

export type RankOrderId = (typeof RANK_ORDER)[number];

export const RANK_DISPLAY_NAMES: Record<string, string> = {
  rank_scout: 'Scout',
  rank_tenderfoot: 'Tenderfoot',
  rank_second_class: 'Second Class',
  rank_first_class: 'First Class',
  rank_star: 'Star',
  rank_life: 'Life',
  rank_eagle: 'Eagle',
};

// ── Unified Rank Color System ──────────────────────────────────────────
// Progression: yellow → green → blue → reddish/pink → purple → pink → gold
// All pages MUST import from here — never redefine rank colors locally.

/** Solid badge/bullet background per rank */
export const RANK_COLORS: Record<string, string> = {
  rank_scout: 'bg-amber-500',
  rank_tenderfoot: 'bg-emerald-600',
  rank_second_class: 'bg-sky-600',
  rank_first_class: 'bg-rose-600',
  rank_star: 'bg-violet-600',
  rank_life: 'bg-pink-500',
  rank_eagle: 'bg-amber-600',
};

/** Text + border + bg accent per rank (pill/badge/card styles) */
export const RANK_ACCENT_COLORS: Record<string, string> = {
  rank_scout: 'border-amber-200 bg-amber-50 text-amber-800',
  rank_tenderfoot: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rank_second_class: 'border-sky-200 bg-sky-50 text-sky-800',
  rank_first_class: 'border-rose-200 bg-rose-50 text-rose-800',
  rank_star: 'border-violet-200 bg-violet-50 text-violet-800',
  rank_life: 'border-pink-200 bg-pink-50 text-pink-800',
  rank_eagle: 'border-amber-300 bg-amber-50 text-amber-800',
};

/** Ring/focus color per rank */
export const RANK_RING_COLORS: Record<string, string> = {
  rank_scout: 'ring-amber-500',
  rank_tenderfoot: 'ring-emerald-600',
  rank_second_class: 'ring-sky-600',
  rank_first_class: 'ring-rose-600',
  rank_star: 'ring-violet-600',
  rank_life: 'ring-pink-500',
  rank_eagle: 'ring-amber-600',
};

/** Text-only color per rank */
export const RANK_TEXT_COLORS: Record<string, string> = {
  rank_scout: 'text-amber-700',
  rank_tenderfoot: 'text-emerald-700',
  rank_second_class: 'text-sky-700',
  rank_first_class: 'text-rose-700',
  rank_star: 'text-violet-700',
  rank_life: 'text-pink-700',
  rank_eagle: 'text-amber-700',
};

/**
 * Normalize a rank ID to the canonical `rank_*` format.
 * Handles both `rank_scout` and `scout` inputs.
 */
export function normalizeRankId(rankId: string): string {
  return rankId.startsWith('rank_') ? rankId : `rank_${rankId}`;
}

/**
 * Get the display label for a rank ID (handles both `rank_*` and bare formats).
 */
export function getRankDisplayName(rankId: string): string {
  const normalized = normalizeRankId(rankId);
  return RANK_DISPLAY_NAMES[normalized] || capitalizeWords(normalized.replace('rank_', '').replace(/_/g, ' '));
}

/**
 * Capitalize the first letter of each word.
 */
export function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Compute the user's browser timezone for date formatting.
 * Falls back to 'America/Los_Angeles' if Intl API is unavailable.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Los_Angeles';
  }
}
