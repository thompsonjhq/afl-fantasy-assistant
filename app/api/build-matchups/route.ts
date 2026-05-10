import { NextRequest, NextResponse } from 'next/server'
import { buildTeamMatchupProfiles } from '@/lib/matchups'
import { buildPlayerVenueProfiles } from '@/lib/venues'

function errorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      type: 'Error',
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  if (typeof error === 'object' && error !== null) {
    return {
      type: 'Object',
      raw: error,
      json: JSON.stringify(error, null, 2),
    }
  }

  return {
    type: typeof error,
    message: String(error),
  }
}

async function build(season: number, asOfRound: number) {
  const matchupResult = await buildTeamMatchupProfiles(season, asOfRound)
  const venueResult = await buildPlayerVenueProfiles(season, asOfRound)

  return {
    success: true,
    season,
    asOfRound,
    matchups: {
      sampleCount: matchupResult.sampleCount,
      profileCount: matchupResult.profileCount,
    },
    venues: {
      sampleCount: venueResult.sampleCount,
      playerVenueProfileCount: venueResult.playerVenueProfileCount,
      opponentVenuePositionProfileCount: venueResult.opponentVenuePositionProfileCount,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const season = Number(body.season || new Date().getFullYear())
    const asOfRound = Number(body.asOfRound || body.round || 9)

    if (!Number.isFinite(season) || !Number.isFinite(asOfRound)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid season or round',
          received: { season, asOfRound },
        },
        { status: 400 }
      )
    }

    const result = await build(season, asOfRound)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Build matchups error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build matchup and venue profiles',
        detail: errorPayload(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const season = Number(searchParams.get('season') || new Date().getFullYear())
    const asOfRound = Number(searchParams.get('round') || '9')

    if (!Number.isFinite(season) || !Number.isFinite(asOfRound)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid season or round',
          received: { season, asOfRound },
        },
        { status: 400 }
      )
    }

    const result = await build(season, asOfRound)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Build matchups error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build matchup and venue profiles',
        detail: errorPayload(error),
      },
      { status: 500 }
    )
  }
}