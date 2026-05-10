import { NextRequest, NextResponse } from 'next/server'
import { getPlayerStatProfile, getSquadStatProfiles, PlayerStatProfile } from '@/lib/aflTables'
import { supabase } from '@/lib/supabase'

interface PlayerRow {
  name: string
}

function summariseProfile(profile: PlayerStatProfile) {
  return {
    games: profile.games.length,
    seasonAvg: profile.seasonAvg,
    last3Avg: profile.last3Avg,
    last5Avg: profile.last5Avg,
    overallFantasyAvg: profile.overallAvg.fantasyPoints,
    venueCount: profile.venueAverages.length,
    opponentCount: profile.opponentAverages.length,
    scrapedAt: profile.scrapedAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const playerName = searchParams.get('player')
    const year = Number(searchParams.get('year') || new Date().getFullYear())

    if (playerName) {
      const profile = await getPlayerStatProfile(playerName, year)

      return NextResponse.json({
        success: true,
        player: playerName,
        year,
        profile,
        summary: summariseProfile(profile),
      })
    }

    const { data, error } = await supabase
      .from('players')
      .select('name')
      .order('name', { ascending: true })

    if (error) throw error

    const playerNames = ((data || []) as PlayerRow[]).map((player) => player.name)
    const profiles = await getSquadStatProfiles(playerNames, year)

    const summary = Object.fromEntries(
      Object.entries(profiles).map(([name, profile]) => [name, summariseProfile(profile)])
    )

    return NextResponse.json({
      success: true,
      year,
      count: playerNames.length,
      summary,
    })
  } catch (error) {
    console.error('Scrape route error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape/cache AFL Tables data',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const year = Number(body.year || new Date().getFullYear())

    if (body.playerName) {
      const profile = await getPlayerStatProfile(String(body.playerName), year)

      return NextResponse.json({
        success: true,
        player: body.playerName,
        year,
        profile,
        summary: summariseProfile(profile),
      })
    }

    const playerNames = Array.isArray(body.playerNames)
      ? body.playerNames.map(String)
      : []

    if (playerNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide playerName or playerNames',
        },
        { status: 400 }
      )
    }

    const profiles = await getSquadStatProfiles(playerNames, year)

    const summary = Object.fromEntries(
      Object.entries(profiles).map(([name, profile]) => [name, summariseProfile(profile)])
    )

    return NextResponse.json({
      success: true,
      year,
      count: playerNames.length,
      summary,
    })
  } catch (error) {
    console.error('Scrape route error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape/cache AFL Tables data',
      },
      { status: 500 }
    )
  }
}