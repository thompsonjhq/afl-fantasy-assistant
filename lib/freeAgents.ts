import { findWeakestComparablePlayer } from '@/lib/projections'
import { Player } from '@/types'

export interface FreeAgentComparison {
  player: Player
  replacementPlayer?: Player
  netGain?: number
  reason: string
}

/** For each projected free agent, finds the weakest comparable player in the squad they could
 * replace and computes the net projected-score gain. Shared between /api/projections (Free
 * Agents page) and /api/analysis (AI Insights "freeagents" tab) so both surfaces agree on the
 * same numbers. */
export function buildFreeAgentComparisons(
  projectedFreeAgents: Player[],
  projectedSquad: Player[],
  limit = 60
): FreeAgentComparison[] {
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

      return {
        player: freeAgent,
        replacementPlayer,
        netGain,
        reason: replacementPlayer
          ? `${freeAgent.name} projects ${netGain && netGain >= 0 ? '+' : ''}${netGain ?? 0} versus ${replacementPlayer.name}.`
          : `${freeAgent.name} is projected strongly, but no comparable squad player was found.`,
      }
    })
    .sort((a, b) => (b.netGain ?? -999) - (a.netGain ?? -999))
}
