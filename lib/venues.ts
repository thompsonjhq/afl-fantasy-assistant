import { supabase } from '@/lib/supabase'
import { fetchAllPlayers, getAflFantasyTeamName } from '@/lib/aflFantasy'
import { getSquiggleFixtures } from '@/lib/afl'
import { normaliseTeamName } from '@/lib/matchups'

export interface PlayerVenueProfile {
  playerName: string
  venue: string
  games: number
  avgScoreAtVenue: number
  avgExpectedScore: number
  pointsVsExpected: number
}

export interface OpponentVenuePositionProfile {
  opponent: string
  venue: string
  position: string
  games: number
  avgScoreConceded: number
  avgExpectedScore: number
  pointsConcededVsExpected: number
}

export interface VenueProfilesForProjection {
  playerVenue: PlayerVenueProfile | null
  opponentVenuePosition: OpponentVenuePositionProfile | null
}

interface VenueSample {
  playerName: string
  playerTeam: string
  opponent: string
  position: string
  venue: string
  score: number
  expected: number
}

const POSITIONS = ['DEF', 'MID', 'RUC', 'FWD']

const VENUE_ALIASES: Record<string, string[]> = {
  Gabba: ['Gabba', 'The Gabba', 'Brisbane Cricket Ground'],
  'M.C.G.': ['M.C.G.', 'MCG', 'Melbourne Cricket Ground'],
  'Marvel Stadium': ['Marvel Stadium', 'Docklands', 'Docklands Stadium', 'Etihad Stadium'],
  'Adelaide Oval': ['Adelaide Oval'],
  'Optus Stadium': ['Optus Stadium', 'Perth Stadium'],
  SCG: ['SCG', 'Sydney Cricket Ground'],
  'GMHBA Stadium': ['GMHBA Stadium', 'Kardinia Park', 'Simonds Stadium'],
  'People First Stadium': ['People First Stadium', 'Carrara', 'Metricon Stadium', 'Heritage Bank Stadium'],
  'ENGIE Stadium': ['ENGIE Stadium', 'Giants Stadium', 'Spotless Stadium', 'Sydney Showground'],
  'Manuka Oval': ['Manuka Oval'],
  'UTAS Stadium': ['UTAS Stadium', 'York Park'],
  'TIO Stadium': ['TIO Stadium'],
  'Blundstone Arena': ['Blundstone Arena', 'Bellerive Oval'],
  'Mars Stadium': ['Mars Stadium', 'Eureka Stadium'],
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function cleanText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

export function normaliseVenueName(venue: string): string {
  const clean = cleanText(venue)

  for (const [canonical, aliases] of Object.entries(VENUE_ALIASES)) {
    if (aliases.some((alias) => cleanText(alias) === clean)) {
      return canonical
    }
  }

  return venue.trim().replace(/\s+/g, ' ')
}

function sameTeam(a: string, b: string): boolean {
  return normaliseTeamName(a) === normaliseTeamName(b)
}

function canonicalPosition(position?: string): string {
  if (!position) return 'MID'
  if (POSITIONS.includes(position)) return position
  return 'MID'
}

async function getFixtureContextForRound(
  team: string,
  round: number,
  season: number
): Promise<{ opponent: string; venue: string } | null> {
  const fixtures = await getSquiggleFixtures(round, season)
  const fixture = fixtures.find((game) => sameTeam(game.hteam, team) || sameTeam(game.ateam, team))

  if (!fixture?.venue) return null

  const isHome = sameTeam(fixture.hteam, team)
  const opponent = isHome ? fixture.ateam : fixture.hteam

  return {
    opponent: normaliseTeamName(opponent),
    venue: normaliseVenueName(fixture.venue),
  }
}

function aggregatePlayerVenueSamples(samples: VenueSample[]): Omit<PlayerVenueProfile, 'playerName' | 'venue'> {
  const avgScoreAtVenue = samples.reduce((sum, sample) => sum + sample.score, 0) / samples.length
  const avgExpectedScore = samples.reduce((sum, sample) => sum + sample.expected, 0) / samples.length

  return {
    games: samples.length,
    avgScoreAtVenue: round1(avgScoreAtVenue),
    avgExpectedScore: round1(avgExpectedScore),
    pointsVsExpected: round1(avgScoreAtVenue - avgExpectedScore),
  }
}

function aggregateOpponentVenueSamples(samples: VenueSample[]): Omit<OpponentVenuePositionProfile, 'opponent' | 'venue' | 'position'> {
  const avgScoreConceded = samples.reduce((sum, sample) => sum + sample.score, 0) / samples.length
  const avgExpectedScore = samples.reduce((sum, sample) => sum + sample.expected, 0) / samples.length

  return {
    games: samples.length,
    avgScoreConceded: round1(avgScoreConceded),
    avgExpectedScore: round1(avgExpectedScore),
    pointsConcededVsExpected: round1(avgScoreConceded - avgExpectedScore),
  }
}

async function buildVenueSamples(season: number, asOfRound: number): Promise<VenueSample[]> {
  const allPlayers = await fetchAllPlayers()
  const fixtureCache = new Map<string, { opponent: string; venue: string } | null>()
  const samples: VenueSample[] = []

  for (const player of allPlayers) {
    const playerName = `${player.firstName} ${player.lastName}`
    const playerTeam = normaliseTeamName(getAflFantasyTeamName(player))
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

      const cacheKey = `${playerTeam}_${round}_${season}`

      if (!fixtureCache.has(cacheKey)) {
        fixtureCache.set(cacheKey, await getFixtureContextForRound(playerTeam, round, season))
      }

      const fixture = fixtureCache.get(cacheKey)

      if (!fixture) continue

      samples.push({
        playerName,
        playerTeam,
        opponent: fixture.opponent,
        position,
        venue: fixture.venue,
        score,
        expected,
      })
    }
  }

  return samples
}

export async function buildPlayerVenueProfiles(season: number, asOfRound: number) {
  const samples = await buildVenueSamples(season, asOfRound)

  const playerVenueGrouped = new Map<string, VenueSample[]>()
  const opponentVenuePositionGrouped = new Map<string, VenueSample[]>()

  for (const sample of samples) {
    const playerVenueKey = `${sample.playerName}__${sample.venue}`
    playerVenueGrouped.set(playerVenueKey, [...(playerVenueGrouped.get(playerVenueKey) || []), sample])

    const opponentVenuePositionKey = `${sample.opponent}__${sample.venue}__${sample.position}`
    opponentVenuePositionGrouped.set(
      opponentVenuePositionKey,
      [...(opponentVenuePositionGrouped.get(opponentVenuePositionKey) || []), sample]
    )
  }

  const playerVenueProfiles: PlayerVenueProfile[] = Array.from(playerVenueGrouped.entries()).map(([key, group]) => {
    const [playerName, venue] = key.split('__')

    return {
      playerName,
      venue,
      ...aggregatePlayerVenueSamples(group),
    }
  })

  const opponentVenuePositionProfiles: OpponentVenuePositionProfile[] = Array.from(opponentVenuePositionGrouped.entries()).map(([key, group]) => {
    const [opponent, venue, position] = key.split('__')

    return {
      opponent,
      venue,
      position,
      ...aggregateOpponentVenueSamples(group),
    }
  })

  if (playerVenueProfiles.length > 0) {
    const { error } = await supabase
      .from('player_venue_profiles')
      .upsert(
        playerVenueProfiles.map((profile) => ({
          season,
          as_of_round: asOfRound,
          player_name: profile.playerName,
          venue: profile.venue,
          games: profile.games,
          avg_score_at_venue: profile.avgScoreAtVenue,
          avg_expected_score: profile.avgExpectedScore,
          points_vs_expected: profile.pointsVsExpected,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'season,as_of_round,player_name,venue' }
      )

    if (error) throw new Error(JSON.stringify(error, null, 2))
  }

  if (opponentVenuePositionProfiles.length > 0) {
    const { error } = await supabase
      .from('opponent_venue_position_profiles')
      .upsert(
        opponentVenuePositionProfiles.map((profile) => ({
          season,
          as_of_round: asOfRound,
          opponent: profile.opponent,
          venue: profile.venue,
          position: profile.position,
          games: profile.games,
          avg_score_conceded: profile.avgScoreConceded,
          avg_expected_score: profile.avgExpectedScore,
          points_conceded_vs_expected: profile.pointsConcededVsExpected,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'season,as_of_round,opponent,venue,position' }
      )

    if (error) throw new Error(JSON.stringify(error, null, 2))
  }

  return {
    season,
    asOfRound,
    sampleCount: samples.length,
    playerVenueProfileCount: playerVenueProfiles.length,
    opponentVenuePositionProfileCount: opponentVenuePositionProfiles.length,
  }
}

export async function getPlayerVenueProfile(
  season: number,
  asOfRound: number,
  playerName: string,
  venue: string
): Promise<PlayerVenueProfile | null> {
  const normalisedVenue = normaliseVenueName(venue)

  const { data, error } = await supabase
    .from('player_venue_profiles')
    .select('*')
    .eq('season', season)
    .lte('as_of_round', asOfRound)
    .eq('player_name', playerName)
    .eq('venue', normalisedVenue)
    .order('as_of_round', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    playerName: data.player_name,
    venue: data.venue,
    games: Number(data.games || 0),
    avgScoreAtVenue: Number(data.avg_score_at_venue || 0),
    avgExpectedScore: Number(data.avg_expected_score || 0),
    pointsVsExpected: Number(data.points_vs_expected || 0),
  }
}

export async function getOpponentVenuePositionProfile(
  season: number,
  asOfRound: number,
  opponent: string,
  venue: string,
  position: string
): Promise<OpponentVenuePositionProfile | null> {
  const normalisedOpponent = normaliseTeamName(opponent)
  const normalisedVenue = normaliseVenueName(venue)
  const normalisedPosition = canonicalPosition(position)

  const { data, error } = await supabase
    .from('opponent_venue_position_profiles')
    .select('*')
    .eq('season', season)
    .lte('as_of_round', asOfRound)
    .eq('opponent', normalisedOpponent)
    .eq('venue', normalisedVenue)
    .eq('position', normalisedPosition)
    .order('as_of_round', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    opponent: data.opponent,
    venue: data.venue,
    position: data.position,
    games: Number(data.games || 0),
    avgScoreConceded: Number(data.avg_score_conceded || 0),
    avgExpectedScore: Number(data.avg_expected_score || 0),
    pointsConcededVsExpected: Number(data.points_conceded_vs_expected || 0),
  }
}

export async function getVenueProfilesForPlayers(
  season: number,
  asOfRound: number,
  players: Array<{ id: string; name: string; team: string; position: string }>,
  fixturesByPlayerId: Record<string, { opponent?: string; venue?: string } | undefined>
): Promise<Record<string, VenueProfilesForProjection>> {
  const entries = await Promise.all(
    players.map(async (player) => {
      const fixture = fixturesByPlayerId[player.id]
      const venue = fixture?.venue
      const opponent = fixture?.opponent

      if (!venue) {
        return [
          player.id,
          {
            playerVenue: null,
            opponentVenuePosition: null,
          },
        ] as const
      }

      const [playerVenue, opponentVenuePosition] = await Promise.all([
        getPlayerVenueProfile(season, asOfRound, player.name, venue),
        opponent && opponent !== 'Unknown'
          ? getOpponentVenuePositionProfile(season, asOfRound, opponent, venue, player.position)
          : Promise.resolve(null),
      ])

      return [
        player.id,
        {
          playerVenue,
          opponentVenuePosition,
        },
      ] as const
    })
  )

  return Object.fromEntries(entries)
}