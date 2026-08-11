import { NextRequest, NextResponse } from 'next/server'
import { computeModelAccuracy } from '@/lib/modelAccuracy'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'

const CURRENT_YEAR = new Date().getFullYear()

export async function GET(request: NextRequest) {
  try {
    const seasonParam = request.nextUrl.searchParams.get('season')
    const season = seasonParam ? Number(seasonParam) : CURRENT_YEAR

    const summaries = await computeModelAccuracy(season)

    return NextResponse.json({ success: true, season, summaries })
  } catch (error) {
    console.error('model-accuracy API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
