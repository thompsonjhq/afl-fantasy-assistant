import { supabase } from '@/lib/supabase'
import { getSquiggleFixtures } from '@/lib/afl'
import { normaliseTeamName } from '@/lib/matchups'
import { normaliseVenueName } from '@/lib/venues'
import type { PlayerGameLogRow, SquiggleGame } from '@/types'

function sameTeam(a: string, b: string): boolean {
  return normaliseTeamName(a) === normaliseTeamName(b)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

const fixtureCache = new Map<string, Promise<SquiggleGame[]>>()

function getFixturesCached(season: number, round: number): Promise<SquiggleGame[]> {
  const key = `${season}_${round}`

  if (!fixtureCache.has(key)) {
    fixtureCache.set(key, getSquiggleFixtures(round, season))
  }

  return fixtureCache.get(key)!
}

/** Cross-references each row's round against Squiggle fixtures to fill in venue/home-away, since footywire's game log table doesn't include venue. */
export async function enrichWithVenue(rows: PlayerGameLogRow[]): Promise<PlayerGameLogRow[]> {
  const enriched: PlayerGameLogRow[] = []

  for (const row of rows) {
    if (!row.team) {
      enriched.push(row)
      continue
    }

    const fixtures = await getFixturesCached(row.season, row.round)
    const fixture = fixtures.find((game) => sameTeam(game.hteam, row.team!) || sameTeam(game.ateam, row.team!))

    if (!fixture) {
      enriched.push(row)
      continue
    }

    enriched.push({
      ...row,
      venue: fixture.venue ? normaliseVenueName(fixture.venue) : row.venue,
      isHome: sameTeam(fixture.hteam, row.team!),
    })
  }

  return enriched
}

function rowFromDb(row: Record<string, unknown>): PlayerGameLogRow {
  return {
    playerName: String(row.player_name),
    team: row.team ? String(row.team) : undefined,
    season: Number(row.season),
    round: Number(row.round),
    matchId: row.match_id != null ? Number(row.match_id) : undefined,
    date: row.date ? String(row.date) : undefined,
    opponent: row.opponent ? String(row.opponent) : undefined,
    venue: row.venue ? String(row.venue) : undefined,
    isHome: typeof row.is_home === 'boolean' ? row.is_home : undefined,
    win: typeof row.win === 'boolean' ? row.win : undefined,
    fantasyPoints: Number(row.fantasy_points) || 0,
    disposals: row.disposals != null ? Number(row.disposals) : undefined,
    goals: row.goals != null ? Number(row.goals) : undefined,
  }
}

export async function upsertGameLogRows(rows: PlayerGameLogRow[]): Promise<{ upserted: number }> {
  if (rows.length === 0) return { upserted: 0 }

  const enriched = await enrichWithVenue(rows)

  const { error } = await supabase
    .from('player_game_logs')
    .upsert(
      enriched.map((row) => ({
        player_name: row.playerName,
        team: row.team,
        season: row.season,
        round: row.round,
        match_id: row.matchId,
        date: row.date,
        opponent: row.opponent,
        venue: row.venue,
        is_home: row.isHome,
        win: row.win,
        fantasy_points: row.fantasyPoints,
        disposals: row.disposals,
        goals: row.goals,
        scraped_at: new Date().toISOString(),
      })),
      { onConflict: 'player_name,season,match_id' }
    )

  if (error) throw error
  return { upserted: enriched.length }
}

export async function getPlayerGameLog(playerName: string): Promise<PlayerGameLogRow[]> {
  const { data, error } = await supabase
    .from('player_game_logs')
    .select('*')
    .eq('player_name', playerName)
    .order('season', { ascending: true })
    .order('round', { ascending: true })

  if (error || !data) return []

  return data.map(rowFromDb)
}

export async function getAllGameLogRows(): Promise<PlayerGameLogRow[]> {
  const { data, error } = await supabase
    .from('player_game_logs')
    .select('*')
    .order('season', { ascending: true })
    .order('round', { ascending: true })

  if (error || !data) return []

  return data.map(rowFromDb)
}

export async function getPlayersWithGameLogs(playerNames: string[]): Promise<Record<string, PlayerGameLogRow[]>> {
  if (playerNames.length === 0) return {}

  const { data, error } = await supabase
    .from('player_game_logs')
    .select('*')
    .in('player_name', playerNames)
    .order('season', { ascending: true })
    .order('round', { ascending: true })

  if (error || !data) return {}

  const grouped: Record<string, PlayerGameLogRow[]> = {}

  for (const dbRow of data) {
    const row = rowFromDb(dbRow)
    grouped[row.playerName] = [...(grouped[row.playerName] || []), row]
  }

  return grouped
}

export interface HistorySummary {
  games: number
  average: number
}

export async function getPlayerVenueHistory(playerName: string, venue: string): Promise<HistorySummary | null> {
  const rows = await getPlayerGameLog(playerName)
  const normalisedVenue = normaliseVenueName(venue)
  const matches = rows.filter((row) => row.venue && normaliseVenueName(row.venue) === normalisedVenue)

  if (matches.length === 0) return null

  return { games: matches.length, average: round1(mean(matches.map((row) => row.fantasyPoints))) }
}

/** Rows come back ordered ascending by season/round, so slicing the tail of the filtered
 * matches (rather than the tail of all rows) gives the most recent games against this
 * specific opponent, which may span multiple seasons for teams that rarely meet. */
export async function getPlayerOpponentHistory(playerName: string, opponent: string, limit?: number): Promise<HistorySummary | null> {
  const rows = await getPlayerGameLog(playerName)
  const normalisedOpponent = normaliseTeamName(opponent)
  const allMatches = rows.filter((row) => row.opponent && normaliseTeamName(row.opponent) === normalisedOpponent)
  const matches = limit ? allMatches.slice(-limit) : allMatches

  if (matches.length === 0) return null

  return { games: matches.length, average: round1(mean(matches.map((row) => row.fantasyPoints))) }
}
