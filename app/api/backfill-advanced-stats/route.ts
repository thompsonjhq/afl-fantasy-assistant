import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { fetchAdvancedStatsForMatch, fetchMatchRefsForSeason } from '@/lib/scrapers/footywireAdvancedStats'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import { upsertAdvancedStatsRows } from '@/lib/advancedStatsStore'

// Same self-chaining shape as /api/backfill-game-logs - each invocation only processes one
// batch of matches, then uses after() to trigger the next batch as a separate invocation, so
// this stays within Vercel Hobby's 60s cap regardless of how many matches a season has.
export const maxDuration = 30

const DEFAULT_BATCH_SIZE = 5
const MAX_BATCH_SIZE = 15

interface BackfillRequestBody {
  season?: number
  delayMs?: number
  offset?: number
  batchSize?: number
  chain?: boolean
  matchRefs?: Array<{ matchId: number; round: number }>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as BackfillRequestBody
    const season = body.season || new Date().getFullYear()
    const delayMs = Number(body.delayMs) || 400
    const offset = Math.max(0, Number(body.offset) || 0)
    const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batchSize) || DEFAULT_BATCH_SIZE))
    const shouldChain = body.chain !== false

    const matchRefs = Array.isArray(body.matchRefs) && body.matchRefs.length > 0
      ? body.matchRefs
      : await fetchMatchRefsForSeason(season)

    const batch = matchRefs.slice(offset, offset + batchSize)
    const results: Array<{ matchId: number; round: number; rowsFound: number; error?: string }> = []
    let totalUpserted = 0

    for (const ref of batch) {
      try {
        const rows = await fetchAdvancedStatsForMatch(ref.matchId, season)

        if (rows.length > 0) {
          const { upserted } = await upsertAdvancedStatsRows(rows)
          totalUpserted += upserted
        }

        results.push({ matchId: ref.matchId, round: ref.round, rowsFound: rows.length })
      } catch (error) {
        console.error(`backfill-advanced-stats error for match ${ref.matchId}:`, error)
        results.push({ matchId: ref.matchId, round: ref.round, rowsFound: 0, error: getErrorMessage(error) })
      }

      await sleep(delayMs)
    }

    const nextOffset = offset + batchSize
    const hasMore = nextOffset < matchRefs.length
    let chained = false

    if (hasMore && shouldChain) {
      const nextUrl = new URL(request.url).origin + '/api/backfill-advanced-stats'
      const nextBody = {
        season,
        matchRefs, // pass the already-resolved list through so every batch is stable
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
          console.error('Failed to chain next advanced-stats backfill batch:', error)
        }
      })

      chained = true
    }

    return NextResponse.json({
      success: true,
      season,
      totalMatches: matchRefs.length,
      batchStart: offset,
      batchEnd: Math.min(nextOffset, matchRefs.length),
      totalRowsUpserted: totalUpserted,
      results,
      nextOffset: hasMore ? nextOffset : null,
      chained,
    })
  } catch (error) {
    console.error('backfill-advanced-stats error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
