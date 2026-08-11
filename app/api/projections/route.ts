import { NextRequest, NextResponse } from 'next/server'
import { getFixtureContext, getSquiggleFixtures } from '@/lib/afl'
import { fetchFreeAgentsWithStats } from '@/lib/aflFantasy'
import { CachedPlayerHistoricalStats, getHistoricalStatsForPlayers } from '@/lib/aflTables'
import { getMatchupsForPlayers } from '@/lib/matchups'
import { getVenueProfilesForPlayers } from '@/lib/venues'
import { calculateTeamProjections, HistoricalProjectionInput, RoleSecurityProjectionInput } from '@/lib/projections'
import { getRoleSecurityInputsForPlayers } from '@/lib/roleSecurity'
import { buildFreeAgentComparisons } from '@/lib/freeAgents'
import { getLatestFittedModel } from '@/lib/model'
import { Player } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

interface ProjectionsRequestBody {
  players?: Player[]
  round?: number
  includeFreeAgents?: boolean
  freeAgentLimit?: number
}

interface VenueProfilesForRoute {
  playerVenue: {
    games: number
    avgScoreAtVenue: number
    pointsVsExpected: number
  } | null
  opponentVenuePosition: {
    games: number
    avgScoreConceded: number
    pointsConcededVsExpected: number
  } | null
}

function mergeVenueIntoHistorical(
  historicalByPlayerId: Record<string, CachedPlayerHistoricalStats | undefined>,
  venueByPlayerId: Record<string, VenueProfilesForRoute | undefined>
): Record<string, HistoricalProjectionInput> {
  const merged: Record<string, HistoricalProjectionInput> = {}

  const playerIds = new Set([
    ...Object.keys(historicalByPlayerId),
    ...Object.keys(venueByPlayerId),
  ])

  for (const playerId of playerIds) {
    const historical = historicalByPlayerId[playerId]
    const venueProfiles = venueByPlayerId[playerId]

    merged[playerId] = {
      opponentAverage: historical?.opponentAverage,
      fantasyAverageFromAflTables: historical?.fantasyAverageFromAflTables,
      gamesInSample: historical?.gamesInSample,
      dataQuality: historical?.dataQuality,

      playerVenueGames: venueProfiles?.playerVenue?.games,
      playerVenueAverage: venueProfiles?.playerVenue?.avgScoreAtVenue,
      playerVenuePointsVsExpected: venueProfiles?.playerVenue?.pointsVsExpected,

      opponentVenueGames: venueProfiles?.opponentVenuePosition?.games,
      opponentVenueAverage: venueProfiles?.opponentVenuePosition?.avgScoreConceded,
      opponentVenuePointsVsExpected: venueProfiles?.opponentVenuePosition?.pointsConcededVsExpected,
    }
  }

  return merged
}

async function projectPlayers(players: Player[], round: number) {
  const asOfRound = round
  const fixtures = await getSquiggleFixtures(round, CURRENT_YEAR)
  const fittedModel = (await getLatestFittedModel()) ?? undefined

  const fixturesByPlayerId = Object.fromEntries(
    players.map((player) => [player.id, getFixtureContext(player.team, fixtures)])
  )

  const historicalByPlayerId = await getHistoricalStatsForPlayers(
    players,
    CURRENT_YEAR,
    fixturesByPlayerId
  )

  const venueByPlayerId = await getVenueProfilesForPlayers(
    CURRENT_YEAR,
    asOfRound,
    players,
    fixturesByPlayerId
  )

  const historicalWithVenue = mergeVenueIntoHistorical(
    historicalByPlayerId,
    venueByPlayerId
  )

  const matchupByPlayerId = await getMatchupsForPlayers(
    CURRENT_YEAR,
    asOfRound,
    players,
    fixturesByPlayerId
  )

  const roleSecurityByPlayerName = await getRoleSecurityInputsForPlayers(
    players.map((player) => player.name),
    CURRENT_YEAR
  )

  const roleSecurityByPlayerId: Record<string, RoleSecurityProjectionInput | undefined> = Object.fromEntries(
    players.map((player) => [player.id, roleSecurityByPlayerName[player.name]])
  )

  const projectedPlayers = calculateTeamProjections(
    players,
    fixturesByPlayerId,
    historicalWithVenue,
    matchupByPlayerId,
    fittedModel,
    roleSecurityByPlayerId
  )

  return {
    asOfRound,
    fixturesByPlayerId,
    projectedPlayers,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProjectionsRequestBody
    const players = Array.isArray(body.players) ? body.players : []
    const round = body.round || 1

    const squadProjection = await projectPlayers(players, round)
    const projectedSquad = squadProjection.projectedPlayers

    let projectedFreeAgents: Player[] = []
    let comparisons: ReturnType<typeof buildFreeAgentComparisons> = []

    if (body.includeFreeAgents) {
      const freeAgents = await fetchFreeAgentsWithStats(body.freeAgentLimit || 120)
      const freeAgentProjection = await projectPlayers(freeAgents, round)

      projectedFreeAgents = freeAgentProjection.projectedPlayers
      comparisons = buildFreeAgentComparisons(projectedFreeAgents, projectedSquad, 60)
    }

    return NextResponse.json({
      success: true,
      round,
      asOfRound: squadProjection.asOfRound,
      projections: projectedSquad,
      freeAgents: projectedFreeAgents,
      comparisons,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Projection API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate projections',
      },
      { status: 500 }
    )
  }
}