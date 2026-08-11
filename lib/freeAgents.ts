import { findWeakestComparablePlayer } from '@/lib/projections'
import { LINEUP_STRUCTURE, Player } from '@/types'

export interface FreeAgentComparison {
  player: Player
  replacementPlayer?: Player
  netGain?: number
  vorp?: number
  reason: string
}

/** Standard starting slots per position (DEF 3, MID 4, RUC 1, FWD 3), derived from the real
 * lineup structure rather than a hardcoded duplicate - flex/bench slots aren't position-specific
 * so they don't count toward a position's replacement level. */
const STARTING_SLOTS_BY_POSITION: Record<string, number> = LINEUP_STRUCTURE
  .filter((slot) => !slot.flex)
  .reduce((counts, slot) => {
    counts[slot.position] = (counts[slot.position] || 0) + 1
    return counts
  }, {} as Record<string, number>)

/** Replacement level per position = the projected score of the best available free agent who
 * would still be on the bench if drafted purely by position need (i.e. ranked just past the
 * number of real starting slots for that position). VORP measures value above that bar, which
 * is a better "should I pick this player up" signal than raw projection alone - a 70-point
 * defender is a great pickup if replacement-level DEF is 55, unremarkable if it's 68. */
function buildReplacementLevels(projectedFreeAgents: Player[]): Record<string, number> {
  const byPosition = new Map<string, number[]>()

  for (const player of projectedFreeAgents) {
    const scores = byPosition.get(player.position) || []
    scores.push(player.projectedScore || player.avgScore || 0)
    byPosition.set(player.position, scores)
  }

  const levels: Record<string, number> = {}

  for (const [position, scores] of byPosition.entries()) {
    const sorted = [...scores].sort((a, b) => b - a)
    const replacementIndex = Math.min(STARTING_SLOTS_BY_POSITION[position] ?? 1, sorted.length - 1)
    levels[position] = sorted[replacementIndex] ?? sorted[sorted.length - 1] ?? 0
  }

  return levels
}

/** For each projected free agent, finds the weakest comparable player in the squad they could
 * replace and computes the net projected-score gain, plus VORP against the position's
 * replacement level. Shared between /api/projections (Free Agents page) and /api/analysis
 * (AI Insights "freeagents" tab) so both surfaces agree on the same numbers. */
export function buildFreeAgentComparisons(
  projectedFreeAgents: Player[],
  projectedSquad: Player[],
  limit = 60
): FreeAgentComparison[] {
  const replacementLevels = buildReplacementLevels(projectedFreeAgents)

  return projectedFreeAgents
    .slice(0, limit)
    .map((freeAgent) => {
      const replacementPlayer = findWeakestComparablePlayer(freeAgent, projectedSquad)
      const replacementScore = replacementPlayer
        ? replacementPlayer.projectedScore || replacementPlayer.avgScore || 0
        : 0

      const netGain = replacementPlayer
        ? Math.round((freeAgent.projectedScore || 0) - replacementScore)
        : undefined

      const replacementLevel = replacementLevels[freeAgent.position]
      const vorp = replacementLevel !== undefined
        ? Math.round((freeAgent.projectedScore || 0) - replacementLevel)
        : undefined

      return {
        player: freeAgent,
        replacementPlayer,
        netGain,
        vorp,
        reason: replacementPlayer
          ? `${freeAgent.name} projects ${netGain && netGain >= 0 ? '+' : ''}${netGain ?? 0} versus ${replacementPlayer.name}.`
          : `${freeAgent.name} is projected strongly, but no comparable squad player was found.`,
      }
    })
    .sort((a, b) => (b.netGain ?? -999) - (a.netGain ?? -999))
}
