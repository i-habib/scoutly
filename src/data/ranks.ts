// Scout ranks in order
export const RANKS = [
  { id: 'scout', name: 'Scout', order: 1 },
  { id: 'tenderfoot', name: 'Tenderfoot', order: 2 },
  { id: 'second_class', name: 'Second Class', order: 3 },
  { id: 'first_class', name: 'First Class', order: 4 },
  { id: 'star', name: 'Star', order: 5 },
  { id: 'life', name: 'Life', order: 6 },
  { id: 'eagle', name: 'Eagle', order: 7 },
] as const;

export type RankId = typeof RANKS[number]['id'];
