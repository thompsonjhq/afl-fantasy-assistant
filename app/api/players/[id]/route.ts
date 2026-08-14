import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchAllPlayers, mapAflFantasyPlayer } from '@/lib/aflFantasy'
import { getPlayerGameLog } from '@/lib/gameLogStore'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import type { Player } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RECENT_GAMES = 10

function playerFromSquadRow(row: Record<string, unknown>): Player {
  return {
    id: String(row.id),
    name: String(row.name),
    team: String(row.team),
    position: String(row.position),
    position2: row.position2 ? String(row.position2) : '',
    avgScore: Number(row.avg_score) || 0,
    lastScore: Number(row.last_score) || 0,
    totalPoints: Number(row.total_points) || 0,
    injured: Boolean(row.injured),
    injuryNote: row.injury_note ? String(row.injury_note) : '',
    scores: Array.isArray(row.scores) ? (row.scores as number[]) : [],
    scoreRounds: Array.isArray(row.score_rounds) ? (row.score_rounds as number[]) : [],
    last3Avg: row.last3_avg != null ? Number(row.last3_avg) : undefined,
    last5Avg: row.last5_avg != null ? Number(row.last5_avg) : undefined,
    highScore: row.high_score != null ? Number(row.high_score) : undefined,
    lowScore: row.low_score != null ? Number(row.low_score) : undefined,
    gamesPlayed: row.games_played != null ? Number(row.games_played) : undefined,
    ownershipPct: row.rostered_percentage != null ? Number(row.rostered_percentage) : undefined,
  }
}

/** Squad players and free agents live in two different id spaces - squad players are keyed on
 * the players table's Supabase uuid, free agents on their raw AFL Fantasy numeric player id
 * (see mapAflFantasyPlayer, lib/aflFantasy.ts). Only try the Supabase lookup for something that
 * actually looks like a uuid - passing a plain number to `.eq('id', ...)` on a uuid column
 * throws a Postgres type error rather than just returning no rows. */
async function findPlayer(id: string): Promise<Player | null> {
  if (UUID_RE.test(id)) {
    const { data } = await supabase.from('players').select('*').eq('id', id).maybeSingle()
    if (data) return playerFromSquadRow(data)
  }

  const allPlayers = await fetchAllPlayers()
  const match = allPlayers.find((player) => String(player.id) === id)

  return match ? (mapAflFantasyPlayer(match) as Player) : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const player = await findPlayer(id)

    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 })
    }

    const gameLog = await getPlayerGameLog(player.name)
    const recentGameLog = gameLog.slice(-RECENT_GAMES).reverse()

    return NextResponse.json({ success: true, player, gameLog: recentGameLog })
  } catch (error) {
    console.error('player detail API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
