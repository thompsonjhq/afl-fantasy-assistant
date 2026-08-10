import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchFreeAgentsWithStats } from '@/lib/aflFantasy'
import { fetchPlayerGameLogAcrossSeasons } from '@/lib/scrapers/footywireGameLog'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import { upsertGameLogRows } from '@/lib/gameLogStore'

// Each invocation only processes one small batch, then uses after() to trigger the next batch
// as a separate serverless invocation. This keeps every single invocation's duration bounded
// (roughly 2 batches' worth, see below) regardless of total squad size, so it stays well within
// Vercel Hobby's 60s cap without needing Fluid Compute or a long maxDuration.
export const maxDuration = 30

const DEFAULT_BATCH_SIZE = 5
const MAX_BATCH_SIZE = 20

interface BackfillPlayer {
  name: string
  team: string
}

interface BackfillRequestBody {
  seasons?: number[]
  players?: Array<{ name: string; team: string }>
  includeFreeAgents?: boolean
  freeAgentLimit?: number
  delayMs?: number
  offset?: number
  batchSize?: number
  chain?: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resolvePlayers(body: BackfillRequestBody): Promise<BackfillPlayer[]> {
  if (Array.isArray(body.players) && body.players.length > 0) {
    return body.players.map((player) => ({ name: String(player.name), team: String(player.team) }))
  }

  const { data, error } = await supabase.from('players').select('name, team')
  if (error) throw error

  const players: BackfillPlayer[] = (data || []).map((row) => ({ name: row.name, team: row.team }))

  if (body.includeFreeAgents) {
    const freeAgents = await fetchFreeAgentsWithStats(body.freeAgentLimit || 100)
    players.push(...freeAgents.map((player) => ({ name: player.name, team: player.team })))
  }

  return players
}

async function processBatch(
  players: BackfillPlayer[],
  seasons: number[],
  delayMs: number
): Promise<{ results: Array<{ player: string; team: string; rowsFound: number; error?: string }>; totalUpserted: number }> {
  const results: Array<{ player: string; team: string; rowsFound: number; error?: string }> = []
  let totalUpserted = 0

  for (const player of players) {
    try {
      const rows = await fetchPlayerGameLogAcrossSeasons(player.name, player.team, seasons)

      if (rows.length > 0) {
        const { upserted } = await upsertGameLogRows(rows)
        totalUpserted += upserted
      }

      results.push({ player: player.name, team: player.team, rowsFound: rows.length })
    } catch (error) {
      console.error(`backfill error for ${player.name}:`, error)
      results.push({
        player: player.name,
        team: player.team,
        rowsFound: 0,
        error: getErrorMessage(error),
      })
    }

    await sleep(delayMs)
  }

  return { results, totalUpserted }
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as BackfillRequestBody
    const currentYear = new Date().getFullYear()

    const seasons = Array.isArray(body.seasons) && body.seasons.length > 0
      ? body.seasons.map(Number)
      : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

    const allPlayers = await resolvePlayers(body)
    const delayMs = Number(body.delayMs) || 400
    const offset = Math.max(0, Number(body.offset) || 0)
    const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batchSize) || DEFAULT_BATCH_SIZE))
    const shouldChain = body.chain !== false

    const batch = allPlayers.slice(offset, offset + batchSize)
    const { results, totalUpserted } = await processBatch(batch, seasons, delayMs)

    const nextOffset = offset + batchSize
    const hasMore = nextOffset < allPlayers.length
    let chained = false

    if (hasMore && shouldChain) {
      const nextUrl = new URL(request.url).origin + '/api/backfill-game-logs'
      const nextBody = {
        players: allPlayers, // pass the already-resolved list through so every batch is stable
        seasons,
        delayMs,
        offset: nextOffset,
        batchSize,
        chain: true,
      }

      after(async () => {
        try {
          await fetch(nextUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(nextBody),
            signal: AbortSignal.timeout(55_000),
          })
        } catch (error) {
          console.error('Failed to chain next backfill batch:', error)
        }
      })

      chained = true
    }

    return NextResponse.json({
      success: true,
      totalPlayers: allPlayers.length,
      batchStart: offset,
      batchEnd: Math.min(nextOffset, allPlayers.length),
      seasons,
      totalRowsUpserted: totalUpserted,
      results,
      nextOffset: hasMore ? nextOffset : null,
      chained,
    })
  } catch (error) {
    console.error('backfill-game-logs error:', error)

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
