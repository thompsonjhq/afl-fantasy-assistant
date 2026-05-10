import { NextRequest, NextResponse } from 'next/server'
import { fetchAllPlayers } from '@/lib/aflFantasy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')?.toLowerCase() || ''

  const players = await fetchAllPlayers()

  const matches = players
    .filter((player) => {
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase()
      return name ? fullName.includes(name) : true
    })
    .slice(0, 10)

  return NextResponse.json({
    count: matches.length,
    players: matches,
  })
}