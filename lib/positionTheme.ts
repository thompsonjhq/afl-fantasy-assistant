/** Colour theme by position, shared across the roster table and field view. */
export const POSITION_AVATAR: Record<string, string> = {
  DEF: 'bg-rose-500',
  MID: 'bg-amber-500',
  RUC: 'bg-violet-500',
  FWD: 'bg-emerald-600',
  FLX: 'bg-sky-500',
  BENCH: 'bg-slate-400',
}

export function avatarColorFor(player: { position: string; lineupPosition?: string }): string {
  return POSITION_AVATAR[player.lineupPosition === 'BENCH' ? 'BENCH' : player.position] || 'bg-slate-400'
}
