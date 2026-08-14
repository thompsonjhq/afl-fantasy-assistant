import type { Player } from '@/types'

export type ExtraColumnKey = 'l5' | 'max' | 'total' | 'own' | 'games' | 'var'

export const EXTRA_COLUMNS: Array<{ key: ExtraColumnKey; label: string; align: 'left' | 'right' }> = [
  { key: 'l5', label: 'L5', align: 'right' },
  { key: 'max', label: 'Max', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'own', label: 'Own%', align: 'right' },
  { key: 'games', label: 'Games', align: 'right' },
  { key: 'var', label: 'Var', align: 'right' },
]

export const DEFAULT_VISIBLE_COLUMNS: ExtraColumnKey[] = ['l5', 'own']

/** Standard-deviation of a player's real scores, rounded - same shape as Smart Draft Board's
 * VAR column. Computed client-side from data already on the Player object, no backend needed. */
export function computeVariance(scores: number[] | undefined): number | null {
  const clean = (scores || []).filter((score) => typeof score === 'number' && Number.isFinite(score) && score > 0)
  if (clean.length < 2) return null

  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length

  return Math.round(Math.sqrt(variance))
}

export function extraColumnValue(player: Player, key: ExtraColumnKey): string | number {
  switch (key) {
    case 'l5':
      return player.last5Avg ?? '-'
    case 'max':
      return player.highScore ?? '-'
    case 'total':
      return player.totalPoints ?? '-'
    case 'own':
      return player.ownershipPct != null ? `${player.ownershipPct}%` : '-'
    case 'games':
      return player.gamesPlayed ?? '-'
    case 'var':
      return computeVariance(player.scores) ?? '-'
  }
}
