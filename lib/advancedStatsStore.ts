import { supabase } from '@/lib/supabase'
import type { PlayerAdvancedStatRow } from '@/types'

function rowFromDb(row: Record<string, unknown>): PlayerAdvancedStatRow {
  return {
    playerName: String(row.player_name),
    team: String(row.team || ''),
    opponent: String(row.opponent || ''),
    season: Number(row.season),
    matchId: Number(row.match_id),
    togPct: row.tog_pct != null ? Number(row.tog_pct) : undefined,
    contestedPossessions: row.contested_possessions != null ? Number(row.contested_possessions) : undefined,
    uncontestedPossessions: row.uncontested_possessions != null ? Number(row.uncontested_possessions) : undefined,
    effectiveDisposals: row.effective_disposals != null ? Number(row.effective_disposals) : undefined,
    disposalEfficiencyPct: row.disposal_efficiency_pct != null ? Number(row.disposal_efficiency_pct) : undefined,
    contestedMarks: row.contested_marks != null ? Number(row.contested_marks) : undefined,
    goalAssists: row.goal_assists != null ? Number(row.goal_assists) : undefined,
    marksInside50: row.marks_inside_50 != null ? Number(row.marks_inside_50) : undefined,
    onePercenters: row.one_percenters != null ? Number(row.one_percenters) : undefined,
    bounces: row.bounces != null ? Number(row.bounces) : undefined,
    centreClearances: row.centre_clearances != null ? Number(row.centre_clearances) : undefined,
    stoppageClearances: row.stoppage_clearances != null ? Number(row.stoppage_clearances) : undefined,
    scoreInvolvements: row.score_involvements != null ? Number(row.score_involvements) : undefined,
    metresGained: row.metres_gained != null ? Number(row.metres_gained) : undefined,
    turnovers: row.turnovers != null ? Number(row.turnovers) : undefined,
    intercepts: row.intercepts != null ? Number(row.intercepts) : undefined,
    tacklesInside50: row.tackles_inside_50 != null ? Number(row.tackles_inside_50) : undefined,
  }
}

export async function upsertAdvancedStatsRows(rows: PlayerAdvancedStatRow[]): Promise<{ upserted: number }> {
  if (rows.length === 0) return { upserted: 0 }

  const { error } = await supabase
    .from('player_advanced_stats')
    .upsert(
      rows.map((row) => ({
        player_name: row.playerName,
        team: row.team,
        opponent: row.opponent,
        season: row.season,
        match_id: row.matchId,
        tog_pct: row.togPct,
        contested_possessions: row.contestedPossessions,
        uncontested_possessions: row.uncontestedPossessions,
        effective_disposals: row.effectiveDisposals,
        disposal_efficiency_pct: row.disposalEfficiencyPct,
        contested_marks: row.contestedMarks,
        goal_assists: row.goalAssists,
        marks_inside_50: row.marksInside50,
        one_percenters: row.onePercenters,
        bounces: row.bounces,
        centre_clearances: row.centreClearances,
        stoppage_clearances: row.stoppageClearances,
        score_involvements: row.scoreInvolvements,
        metres_gained: row.metresGained,
        turnovers: row.turnovers,
        intercepts: row.intercepts,
        tackles_inside_50: row.tacklesInside50,
        scraped_at: new Date().toISOString(),
      })),
      { onConflict: 'player_name,season,match_id' }
    )

  if (error) throw error
  return { upserted: rows.length }
}

export async function getPlayerAdvancedStats(playerName: string, season?: number): Promise<PlayerAdvancedStatRow[]> {
  let query = supabase.from('player_advanced_stats').select('*').eq('player_name', playerName)
  if (season) query = query.eq('season', season)

  const { data, error } = await query.order('match_id', { ascending: true })
  if (error || !data) return []

  return data.map(rowFromDb)
}

export interface RoleProfileSummary {
  games: number
  avgContestedPossessions: number
  avgUncontestedPossessions: number
  contestedSharePct: number
  avgMarksInside50: number
  avgTacklesInside50: number
  avgIntercepts: number
  avgTogPct: number
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Season-average "role profile" from advanced stats - the genuinely-supported version of a
 * contested/uncontested split (unlike the estimated stoppage/transition framing in
 * lib/scoreBreakdown.ts, CP vs UP is a real footywire column, not a derived guess). */
export async function getRoleProfileSummary(playerName: string, season: number): Promise<RoleProfileSummary | null> {
  const rows = await getPlayerAdvancedStats(playerName, season)
  if (rows.length === 0) return null

  const contested = rows.map((row) => row.contestedPossessions).filter((value): value is number => typeof value === 'number')
  const uncontested = rows.map((row) => row.uncontestedPossessions).filter((value): value is number => typeof value === 'number')
  const marksI50 = rows.map((row) => row.marksInside50).filter((value): value is number => typeof value === 'number')
  const tacklesI50 = rows.map((row) => row.tacklesInside50).filter((value): value is number => typeof value === 'number')
  const intercepts = rows.map((row) => row.intercepts).filter((value): value is number => typeof value === 'number')
  const tog = rows.map((row) => row.togPct).filter((value): value is number => typeof value === 'number')

  const avgContested = mean(contested)
  const avgUncontested = mean(uncontested)
  const totalDisposals = avgContested + avgUncontested

  return {
    games: rows.length,
    avgContestedPossessions: round1(avgContested),
    avgUncontestedPossessions: round1(avgUncontested),
    contestedSharePct: totalDisposals > 0 ? round1((avgContested / totalDisposals) * 100) : 0,
    avgMarksInside50: round1(mean(marksI50)),
    avgTacklesInside50: round1(mean(tacklesI50)),
    avgIntercepts: round1(mean(intercepts)),
    avgTogPct: round1(mean(tog)),
  }
}

export async function getAdvancedStatsForPlayers(playerNames: string[], season: number): Promise<Record<string, PlayerAdvancedStatRow[]>> {
  if (playerNames.length === 0) return {}

  const { data, error } = await supabase
    .from('player_advanced_stats')
    .select('*')
    .eq('season', season)
    .in('player_name', playerNames)
    .order('match_id', { ascending: true })

  if (error || !data) return {}

  const grouped: Record<string, PlayerAdvancedStatRow[]> = {}

  for (const dbRow of data) {
    const row = rowFromDb(dbRow)
    grouped[row.playerName] = [...(grouped[row.playerName] || []), row]
  }

  return grouped
}
