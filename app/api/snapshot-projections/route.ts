import { NextRequest, NextResponse } from 'next/server'
import { snapshotProjections } from '@/lib/modelAccuracy'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import type { Player } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

interface SnapshotRequestBody {
  players?: Player[]
  round?: number
  season?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SnapshotRequestBody
    const players = Array.isArray(body.players) ? body.players : []
    const round = body.round || 1
    const season = body.season || CURRENT_YEAR

    if (players.length === 0) {
      return NextResponse.json({ success: false, error: 'No players provided' }, { status: 400 })
    }

    const result = await snapshotProjections(season, round, players)

    return NextResponse.json({ success: true, season, round, ...result })
  } catch (error) {
    console.error('snapshot-projections API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
