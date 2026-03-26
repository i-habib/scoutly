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

export const RANK_COLORS: Record<string, string> = {
  rank_scout: 'from-yellow-500 to-amber-600',
  rank_tenderfoot: 'from-green-500 to-emerald-600',
  rank_second_class: 'from-blue-500 to-cyan-600',
  rank_first_class: 'from-red-500 to-rose-600',
  rank_star: 'from-purple-500 to-violet-600',
  rank_life: 'from-pink-500 to-fuchsia-600',
  rank_eagle: 'from-amber-500 to-yellow-600',
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
