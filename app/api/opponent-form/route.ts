import { NextRequest, NextResponse } from 'next/server'
import { getPlayerOpponentHistory, HistorySummary } from '@/lib/gameLogStore'

interface OpponentFormRequestPlayer {
  id: string
  name: string
  opponent?: string
}

interface OpponentFormRequestBody {
  players?: OpponentFormRequestPlayer[]
}

const RECENT_GAMES = 3

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OpponentFormRequestBody
  const players = Array.isArray(body.players) ? body.players : []

  const entries = await Promise.all(
    players.map(async (player): Promise<[string, HistorySummary | null]> => {
      if (!player.opponent || player.opponent === 'Unknown') return [player.id, null]
      const history = await getPlayerOpponentHistory(player.name, player.opponent, RECENT_GAMES)
      return [player.id, history]
    })
  )

  return NextResponse.json({ success: true, form: Object.fromEntries(entries) })
}
