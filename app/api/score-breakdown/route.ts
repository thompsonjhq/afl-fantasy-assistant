import { NextRequest, NextResponse } from 'next/server'
import { getScoreBreakdownForPlayer } from '@/lib/scoreBreakdown'
import { getRoleProfileSummary } from '@/lib/advancedStatsStore'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'

const CURRENT_YEAR = new Date().getFullYear()

export async function GET(request: NextRequest) {
  try {
    const playerName = request.nextUrl.searchParams.get('player')
    const seasonParam = request.nextUrl.searchParams.get('season')

    if (!playerName) {
      return NextResponse.json({ success: false, error: 'Missing required "player" query param' }, { status: 400 })
    }

    const season = seasonParam ? Number(seasonParam) : undefined
    const [breakdown, roleProfile] = await Promise.all([
      getScoreBreakdownForPlayer(playerName, season),
      getRoleProfileSummary(playerName, season || CURRENT_YEAR),
    ])

    return NextResponse.json({ success: true, breakdown, roleProfile })
  } catch (error) {
    console.error('score-breakdown API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
