import { supabase } from '@/lib/supabase'
import { getPlayerGameLog } from '@/lib/gameLogStore'
import type { PlayerGameLogRow } from '@/types'

export interface AflTablesSeasonRow {
  playerName: string
  team?: string
  games?: number
  kicks?: number
  marks?: number
  handballs?: number
  disposals?: number
  goals?: number
  tackles?: number
  fantasyAverage?: number
  raw: Record<string, string | number>
}

export interface CachedPlayerHistoricalStats {
  fantasyAverageFromAflTables?: number
  venueAverage?: number
  opponentAverage?: number
  gamesInSample?: number
  dataQuality: 'none' | 'partial' | 'good'
  source: string
}

export interface PlayerGameStat {
  round?: number
  opponent?: string
  venue?: string
  fantasyPoints: number
}

export interface AverageStatProfile {
  fantasyPoints: number
}

export interface PlayerStatProfile {
  playerName: string
  games: PlayerGameStat[]
  seasonAvg: number
  last3Avg: number
  last5Avg: number
  overallAvg: AverageStatProfile
  venueAverages: Array<{ venue: string; fantasyPoints: number; games: number }>
  opponentAverages: Array<{ opponent: string; fantasyPoints: number; games: number }>
  scrapedAt: string
}

const AFL_TABLES_BASE = 'https://afltables.com/afl/stats'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 6

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
}

function parseNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (!value) return undefined

  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function calculateFantasyAverage(row: Record<string, string>): number | undefined {
  const games = parseNumber(row.GM || row.G || row.Games) || 0
  if (games <= 0) return undefined

  const kicks = parseNumber(row.KI || row.Kicks) || 0
  const marks = parseNumber(row.MK || row.Marks) || 0
  const handballs = parseNumber(row.HB || row.Handballs) || 0
  const tackles = parseNumber(row.TK || row.Tackles) || 0
  const goals = parseNumber(row.GL || row.Goals) || 0
  const behinds = parseNumber(row.BH || row.Behinds) || 0
  const hitouts = parseNumber(row.HO || row['Hit Outs']) || 0
  const freesFor = parseNumber(row.FF || row['Frees For']) || 0
  const freesAgainst = parseNumber(row.FA || row['Frees Against']) || 0

  const totalFantasy =
    kicks * 3 +
    marks * 3 +
    handballs * 2 +
    tackles * 4 +
    goals * 6 +
    behinds +
    hitouts +
    freesFor -
    freesAgainst * 3

  return Math.round((totalFantasy / games) * 10) / 10
}

function parsePlainTextStats(text: string): AflTablesSeasonRow[] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const headerIndex = lines.findIndex((line) =>
    /Player/i.test(line) && /(GM|Games|KI|Kicks)/i.test(line)
  )

  if (headerIndex < 0) return []

  const headers = lines[headerIndex].split(/\s{2,}|\t/).map((header) => header.trim()).filter(Boolean)
  const playerIndex = headers.findIndex((header) => /Player/i.test(header))

  return lines
    .slice(headerIndex + 1)
    .map((line) => {
      const parts = line.split(/\s{2,}|\t/).map((part) => part.trim()).filter(Boolean)
      const raw: Record<string, string> = {}

      headers.forEach((header, index) => {
        raw[header] = parts[index] || ''
      })

      const playerName = raw[headers[playerIndex]] || parts[0] || ''
      const fantasyAverage = calculateFantasyAverage(raw)

      return {
        playerName,
        team: raw.Team || raw.Tm,
        games: parseNumber(raw.GM || raw.G || raw.Games),
        kicks: parseNumber(raw.KI || raw.Kicks),
        marks: parseNumber(raw.MK || raw.Marks),
        handballs: parseNumber(raw.HB || raw.Handballs),
        disposals: parseNumber(raw.DI || raw.Disposals),
        goals: parseNumber(raw.GL || raw.Goals),
        tackles: parseNumber(raw.TK || raw.Tackles),
        fantasyAverage,
        raw,
      } satisfies AflTablesSeasonRow
    })
    .filter((row) => row.playerName)
}

async function getCached<T>(playerName: string, statType: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('player_stats_cache')
    .select('data, fetched_at')
    .eq('player_name', playerName)
    .eq('stat_type', statType)
    .maybeSingle()

  if (error || !data) return null

  const fetchedAt = new Date(data.fetched_at).getTime()

  if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_TTL_MS) {
    return data.data as T
  }

  return null
}

async function setCached<T>(playerName: string, statType: string, data: T) {
  await supabase
    .from('player_stats_cache')
    .upsert(
      {
        player_name: playerName,
        stat_type: statType,
        data,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'player_name,stat_type' }
    )
}

export async function fetchAflTablesSeasonStats(year: number): Promise<AflTablesSeasonRow[]> {
  try {
    const res = await fetch(`${AFL_TABLES_BASE}/${year}_stats.txt`, {
      headers: { 'user-agent': 'afl-fantasy-assistant/1.0' },
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!res.ok) throw new Error(`AFL Tables returned ${res.status}`)

    const text = await res.text()
    return parsePlainTextStats(text)
  } catch (error) {
    console.error('Failed to fetch AFL Tables season stats:', error)
    return []
  }
}

function profileFromSeasonRow(row: AflTablesSeasonRow | undefined, playerName: string): PlayerStatProfile {
  const fantasyPoints = row?.fantasyAverage || 0
  const gamesCount = row?.games || 0

  const games: PlayerGameStat[] = Array.from({ length: gamesCount }).map(() => ({
    fantasyPoints,
  }))

  return {
    playerName,
    games,
    seasonAvg: fantasyPoints,
    last3Avg: fantasyPoints,
    last5Avg: fantasyPoints,
    overallAvg: {
      fantasyPoints,
    },
    venueAverages: [],
    opponentAverages: [],
    scrapedAt: new Date().toISOString(),
  }
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Builds a real per-game profile from footywire game-log rows: real games, real venue/opponent splits (across all seasons on file), not an approximation. */
function buildRealStatProfile(
  playerName: string,
  allRows: PlayerGameLogRow[],
  seasonRows: PlayerGameLogRow[]
): PlayerStatProfile {
  const sorted = [...seasonRows].sort((a, b) => a.round - b.round)

  const games: PlayerGameStat[] = sorted.map((row) => ({
    round: row.round,
    opponent: row.opponent,
    venue: row.venue,
    fantasyPoints: row.fantasyPoints,
  }))

  const groupBy = (keyFn: (row: PlayerGameLogRow) => string | undefined) => {
    const groups = new Map<string, number[]>()

    for (const row of allRows) {
      const key = keyFn(row)
      if (!key) continue
      groups.set(key, [...(groups.get(key) || []), row.fantasyPoints])
    }

    return groups
  }

  const venueAverages = Array.from(groupBy((row) => row.venue).entries()).map(([venue, points]) => ({
    venue,
    fantasyPoints: round1(mean(points)),
    games: points.length,
  }))

  const opponentAverages = Array.from(groupBy((row) => row.opponent).entries()).map(([opponent, points]) => ({
    opponent,
    fantasyPoints: round1(mean(points)),
    games: points.length,
  }))

  return {
    playerName,
    games,
    seasonAvg: round1(mean(sorted.map((row) => row.fantasyPoints))),
    last3Avg: round1(mean(sorted.slice(-3).map((row) => row.fantasyPoints))),
    last5Avg: round1(mean(sorted.slice(-5).map((row) => row.fantasyPoints))),
    overallAvg: { fantasyPoints: round1(mean(allRows.map((row) => row.fantasyPoints))) },
    venueAverages,
    opponentAverages,
    scrapedAt: new Date().toISOString(),
  }
}

export async function getPlayerStatProfile(
  playerName: string,
  year = new Date().getFullYear()
): Promise<PlayerStatProfile> {
  const gameLogRows = await getPlayerGameLog(playerName)
  const seasonRows = gameLogRows.filter((row) => row.season === year)

  if (seasonRows.length > 0) {
    return buildRealStatProfile(playerName, gameLogRows, seasonRows)
  }

  // Cold start: no footywire game-log rows backfilled for this player yet.
  // Fall back to the AFL Tables season-average approximation until /api/backfill-game-logs has run.
  const statType = `stat_profile_${year}`
  const cached = await getCached<PlayerStatProfile>(playerName, statType)

  if (cached) return cached

  const rows = await fetchAflTablesSeasonStats(year)
  const row = rows.find((candidate) => normaliseName(candidate.playerName) === normaliseName(playerName))
  const profile = profileFromSeasonRow(row, playerName)

  await setCached(playerName, statType, profile)
  return profile
}

export async function getSquadStatProfiles(
  playerNames: string[],
  year = new Date().getFullYear()
): Promise<Record<string, PlayerStatProfile>> {
  const entries = await Promise.all(
    playerNames.map(async (playerName) => {
      const profile = await getPlayerStatProfile(playerName, year)
      return [playerName, profile] as const
    })
  )

  return Object.fromEntries(entries)
}

export async function getPlayerHistoricalStats(
  playerName: string,
  year: number,
  opponent?: string,
  venue?: string
): Promise<CachedPlayerHistoricalStats> {
  const profile = await getPlayerStatProfile(playerName, year)
  const hasRealData = profile.games.some((game) => Boolean(game.opponent || game.venue))

  const venueAverage = venue
    ? profile.venueAverages.find((entry) => entry.venue.toLowerCase() === venue.toLowerCase())?.fantasyPoints
    : undefined

  const opponentAverage = opponent
    ? profile.opponentAverages.find((entry) => entry.opponent.toLowerCase() === opponent.toLowerCase())?.fantasyPoints
    : undefined

  return {
    fantasyAverageFromAflTables: profile.overallAvg.fantasyPoints || undefined,
    venueAverage,
    opponentAverage,
    gamesInSample: profile.games.length,
    dataQuality: hasRealData ? 'good' : profile.overallAvg.fantasyPoints ? 'partial' : 'none',
    source: hasRealData ? 'Footywire real per-game history' : `AFL Tables ${year} season stats cache`,
  }
}

export async function getHistoricalStatsForPlayers(
  players: Array<{ id: string; name: string }>,
  year: number,
  fixturesByPlayerId: Record<string, { opponent?: string; venue?: string } | undefined>
) {
  const entries = await Promise.all(
    players.map(async (player) => {
      const fixture = fixturesByPlayerId[player.id]
      const stats = await getPlayerHistoricalStats(player.name, year, fixture?.opponent, fixture?.venue)
      return [player.id, stats] as const
    })
  )

  return Object.fromEntries(entries)
}