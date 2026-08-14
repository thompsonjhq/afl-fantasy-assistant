import type { Player } from '@/types'
import { getConsistencyScore } from '@/lib/projections'

export interface PlayerFlag {
  label: string
  tone: 'positive' | 'negative' | 'warning'
}

const EASY_HARD_RUN_THRESHOLD = 3
const CONSISTENT_THRESHOLD = 80
const VOLATILE_THRESHOLD = 25

/** Plain-language tags derived entirely from data already computed elsewhere (the matchup
 * projection factor, the consistency score, the injury note) - the same "Flags" idea Smart
 * Draft Board shows, not a raw dump of every factor. No new scraping or computation. */
export function getPlayerFlags(player: Player): PlayerFlag[] {
  const flags: PlayerFlag[] = []

  if (player.injured) {
    flags.push({ label: `Injury: ${player.injuryNote || 'Injured'}`, tone: 'negative' })
  }

  const matchupFactor = player.projectionFactors?.find((factor) => factor.kind === 'matchup')
  if (matchupFactor?.available && typeof matchupFactor.impact === 'number') {
    if (matchupFactor.impact >= EASY_HARD_RUN_THRESHOLD) {
      flags.push({ label: 'Easy Run', tone: 'positive' })
    } else if (matchupFactor.impact <= -EASY_HARD_RUN_THRESHOLD) {
      flags.push({ label: 'Hard Run', tone: 'negative' })
    }
  }

  const consistency = getConsistencyScore(player.projectionFactors)
  if (consistency !== null) {
    if (consistency >= CONSISTENT_THRESHOLD) {
      flags.push({ label: 'Consistent', tone: 'positive' })
    } else if (consistency <= VOLATILE_THRESHOLD) {
      flags.push({ label: 'Volatile', tone: 'warning' })
    }
  }

  return flags
}
