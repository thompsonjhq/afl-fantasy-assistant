import { supabase } from '@/lib/supabase'
import { fetchAllPlayers } from '@/lib/aflFantasy'
import { getSquiggleFixtures } from '@/lib/afl'

export interface TeamMatchupProfile {
  team: string
  position: string
  games: number
  avgScoreConceded: number
  avgExpectedScore: number
  pointsConcededVsExpected: number
}

interface MatchupSample {
  opponent: string
  position: string
  score: number
  expected: number
}

const POSITIONS = ['DEF', 'MID', 'RUC', 'FWD']

const SQUAD_ID_TO_TEAM: Record<number, string> = {
  10: 'Adelaide',
  20: 'Brisbane Lions',
  30: 'Carlton',
  40: 'Collingwood',
  50: 'Essendon',
  60: 'Fremantle',
  70: 'Geelong',
  80: 'Hawthorn',
  90: 'Melbourne',
  100: 'North Melbourne',
  110: 'Port Adelaide',
  120: 'Richmond',
  130: 'St Kilda',
  140: 'Western Bulldogs',
  150: 'West Coast',
  160: 'Sydney',
  1000: 'Gold Coast',
  1010: 'Greater Western Sydney',
}

const TEAM_ALIASES: Record<string, string[]> = {
  Adelaide: ['Adelaide', 'Adelaide Crows'],
  'Brisbane Lions': ['Brisbane Lions', 'Brisbane'],
  Carlton: ['Carlton'],
  Collingwood: ['Collingwood'],
  Essendon: ['Essendon'],
  Fremantle: ['Fremantle'],
  Geelong: ['Geelong', 'Geelong Cats'],
  'Gold Coast': ['Gold Coast', 'Gold Coast Suns'],
  'Greater Western Sydney': ['Greater Western Sydney', 'GWS', 'GWS Giants'],
  Hawthorn: ['Hawthorn'],
  Melbourne: ['Melbourne'],
  'North Melbourne': ['North Melbourne', 'North Melbourne Kangaroos'],
  'Port Adelaide': ['Port Adelaide', 'Port'],
  Richmond: ['Richmond'],
  'St Kilda': ['St Kilda', 'St Kilda Saints'],
  Sydney: ['Sydney', 'Sydney Swans'],
  'West Coast': ['West Coast', 'West Coast Eagles'],
  'Western Bulldogs': ['Western Bulldogs', 'Footscray'],
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function cleanTeamName(team: string): string {
  return team.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
}

export function normaliseTeamName(team: string): string {
  const clean = cleanTeamName(team)

  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    if (aliases.some((alias) => cleanTeamName(alias) === clean)) {
      return canonical
    }
  }

  return team
}

function sameTeam(a: string, b: string): boolean {
  return normaliseTeamName(a) === normaliseTeamName(b)
}

function canonicalPosition(position?: string): string {
  if (!position) return 'MID'
  if (POSITIONS.includes(position)) return position
  return 'MID'
}

function getTeamNameFromSquadId(squadId: number): string {
  return SQUAD_ID_TO_TEAM[squadId] || `Team ${squadId}`
}

async function getOpponentForRound(team: string, round: number, season: number): Promise<string | null> {
  const fixtures = await getSquiggleFixtures(round, season)
  const fixture = fixtures.find((game) => sameTeam(game.hteam, team) || sameTeam(game.ateam, team))

  if (!fixture) return null

  return sameTeam(fixture.hteam, team)
    ? normaliseTeamName(fixture.ateam)
    : normaliseTeamName(fixture.hteam)
}

export async function buildTeamMatchupProfiles(season: number, asOfRound: number) {
  const allPlayers = await fetchAllPlayers()
  const opponentCache = new Map<string, string | null>()
  const samples: MatchupSample[] = []

  for (const player of allPlayers) {
    const team = getTeamNameFromSquadId(player.squadId)
    const position = canonicalPosition(player.position?.[0])
    const expected = player.stats?.averagePoints || 0
    const scores = player.stats?.scores || {}

    if (!expected || expected <= 0) continue

    for (const [roundText, scoreValue] of Object.entries(scores)) {
      const round = Number(roundText)
      const score = Number(scoreValue)

      if (!Number.isFinite(round) || !Number.isFinite(score)) continue
      if (round <= 0 || round > asOfRound) continue
      if (score <= 0) continue

      const cacheKey = `${team}_${round}_${season}`

      if (!opponentCache.has(cacheKey)) {
        opponentCache.set(cacheKey, await getOpponentForRound(team, round, season))
      }

      const opponent = opponentCache.get(cacheKey)

      if (!opponent) continue

      samples.push({
        opponent,
        position,
        score,
        expected,
      })
    }
  }

  const grouped = new Map<string, MatchupSample[]>()

  for (const sample of samples) {
    const key = `${sample.opponent}__${sample.position}`
    const existing = grouped.get(key) || []
    existing.push(sample)
    grouped.set(key, existing)
  }

  const profiles: TeamMatchupProfile[] = []

  for (const [key, group] of grouped.entries()) {
    const [team, position] = key.split('__')
    const avgScoreConceded = group.reduce((sum, sample) => sum + sample.score, 0) / group.length
    const avgExpectedScore = group.reduce((sum, sample) => sum + sample.expected, 0) / group.length

    profiles.push({
      team,
      position,
      games: group.length,
      avgScoreConceded: round1(avgScoreConceded),
      avgExpectedScore: round1(avgExpectedScore),
      pointsConcededVsExpected: round1(avgScoreConceded - avgExpectedScore),
    })
  }

  if (profiles.length > 0) {
    const { error } = await supabase
      .from('team_matchup_profiles')
      .upsert(
        profiles.map((profile) => ({
          season,
          as_of_round: asOfRound,
          team: profile.team,
          position: profile.position,
          games: profile.games,
          avg_score_conceded: profile.avgScoreConceded,
          avg_expected_score: profile.avgExpectedScore,
          points_conceded_vs_expected: profile.pointsConcededVsExpected,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'season,as_of_round,team,position' }
      )

    if (error) throw error
  }

  return {
    season,
    asOfRound,
    sampleCount: samples.length,
    profileCount: profiles.length,
    profiles,
  }
}

export async function getTeamMatchupProfile(
  season: number,
  asOfRound: number,
  team: string,
  position: string
): Promise<TeamMatchupProfile | null> {
  const normalisedTeam = normaliseTeamName(team)
  const normalisedPosition = canonicalPosition(position)

  const { data, error } = await supabase
    .from('team_matchup_profiles')
    .select('*')
    .eq('season', season)
    .lte('as_of_round', asOfRound)
    .eq('team', normalisedTeam)
    .eq('position', normalisedPosition)
    .order('as_of_round', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch matchup profile:', {
      error,
      season,
      asOfRound,
      team: normalisedTeam,
      position: normalisedPosition,
    })

    return null
  }

  if (!data) {
    console.warn('No matchup profile found:', {
      season,
      asOfRound,
      team: normalisedTeam,
      position: normalisedPosition,
    })

    return null
  }

  return {
    team: data.team,
    position: data.position,
    games: Number(data.games || 0),
    avgScoreConceded: Number(data.avg_score_conceded || 0),
    avgExpectedScore: Number(data.avg_expected_score || 0),
    pointsConcededVsExpected: Number(data.points_conceded_vs_expected || 0),
  }
}

export async function getMatchupsForPlayers(
  season: number,
  asOfRound: number,
  players: Array<{ id: string; position: string; team: string }>,
  fixturesByPlayerId: Record<string, { opponent?: string } | undefined>
) {
  const entries = await Promise.all(
    players.map(async (player) => {
      const opponent = fixturesByPlayerId[player.id]?.opponent

      if (!opponent || opponent === 'Unknown') {
        return [player.id, null] as const
      }

      const matchup = await getTeamMatchupProfile(
        season,
        asOfRound,
        opponent,
        player.position
      )

      return [player.id, matchup] as const
    })
  )

  return Object.fromEntries(entries)
}