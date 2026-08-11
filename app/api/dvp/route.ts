import { NextRequest, NextResponse } from 'next/server'
import { getAllTeamMatchupProfiles } from '@/lib/matchups'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'

const CURRENT_YEAR = new Date().getFullYear()

export async function GET(request: NextRequest) {
  try {
    const seasonParam = request.nextUrl.searchParams.get('season')
    const season = seasonParam ? Number(seasonParam) : CURRENT_YEAR

    const profiles = await getAllTeamMatchupProfiles(season)

    return NextResponse.json({ success: true, season, profiles })
  } catch (error) {
    console.error('dvp API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
