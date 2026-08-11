import { getAdvancedStatsForPlayers } from '@/lib/advancedStatsStore'

export interface RoleSecurityInput {
  recentTogPct?: number
  seasonTogPct?: number
  recentCentreClearances?: number
  seasonCentreClearances?: number
  gamesInSample: number
}

const RECENT_GAMES = 3
const MIN_SEASON_GAMES = 4

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

/** Compares a player's last few games' TOG%/Centre Clearances against their own season average
 * from the same source, as a role-trust signal independent of raw scoring (e.g. a midfielder
 * whose TOG% and CBA-proxy clearances are climbing is being trusted with more of the game before
 * their scoring average necessarily reflects it). Rows come from player_advanced_stats, ordered
 * by match_id ascending (see lib/advancedStatsStore.ts), so the tail is the most recent games. */
export async function getRoleSecurityInputsForPlayers(
  playerNames: string[],
  season: number
): Promise<Record<string, RoleSecurityInput | undefined>> {
  const rowsByPlayer = await getAdvancedStatsForPlayers(playerNames, season)
  const result: Record<string, RoleSecurityInput | undefined> = {}

  for (const playerName of playerNames) {
    const rows = rowsByPlayer[playerName] || []

    if (rows.length < MIN_SEASON_GAMES) {
      result[playerName] = undefined
      continue
    }

    const recentRows = rows.slice(-RECENT_GAMES)

    const togValues = rows.map((row) => row.togPct).filter((value): value is number => typeof value === 'number')
    const cclValues = rows.map((row) => row.centreClearances).filter((value): value is number => typeof value === 'number')
    const recentTogValues = recentRows.map((row) => row.togPct).filter((value): value is number => typeof value === 'number')
    const recentCclValues = recentRows.map((row) => row.centreClearances).filter((value): value is number => typeof value === 'number')

    result[playerName] = {
      seasonTogPct: togValues.length > 0 ? mean(togValues) : undefined,
      recentTogPct: recentTogValues.length > 0 ? mean(recentTogValues) : undefined,
      seasonCentreClearances: cclValues.length > 0 ? mean(cclValues) : undefined,
      recentCentreClearances: recentCclValues.length > 0 ? mean(recentCclValues) : undefined,
      gamesInSample: rows.length,
    }
  }

  return result
}
