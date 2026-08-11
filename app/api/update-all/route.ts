import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchMatchRefsForSeason } from '@/lib/scrapers/footywireAdvancedStats'

// One "update everything" endpoint: squad sync -> real game-log backfill -> real advanced-stats
// backfill -> real injuries/selections -> refit the projection model. Meant to be triggered
// locally (npm run dev) against the same Supabase project as production - footywire's Cloudflare
// protection blocks Vercel's IPs, so the backfill/injury steps below just come back empty if this
// is called against the deployed site (squad sync and model-fit don't touch footywire, so those
// still work either way).
// Capped at 300 - Vercel Hobby plan's serverless function limit (this only matters for the
// deployed function's config; actually running this locally via `npm run dev` isn't bound by
// it at all, and it's meant to run locally anyway per the note above).
export const maxDuration = 300

interface UpdateAllBody {
  seasons?: number[]
  delayMs?: number
  batchSize?: number
}

async function postJson(origin: string, path: string, payload: object) {
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))
  return { httpStatus: res.status, ...json }
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin
  const body = ((await request.json().catch(() => ({}))) || {}) as UpdateAllBody
  const steps: Array<Record<string, unknown>> = []

  const syncResult = await postJson(origin, '/api/sync', {})
  steps.push({ step: 'sync', ...syncResult })

  const { data: squadRows, error: squadError } = await supabase.from('players').select('name, team')

  if (squadError) {
    steps.push({ step: 'backfill-game-logs', error: squadError.message })
  } else {
    // Resolve the player list once and pass it through explicitly on every batch call, so
    // pagination stays stable (the players table has no guaranteed row order otherwise).
    const players = (squadRows || []).map((row) => ({ name: row.name, team: row.team }))
    const batchSize = body.batchSize || 5

    let offset = 0
    let totalRowsUpserted = 0
    let batches = 0

    while (offset < players.length) {
      const batchResult = await postJson(origin, '/api/backfill-game-logs', {
        players,
        seasons: body.seasons,
        delayMs: body.delayMs,
        batchSize,
        offset,
        chain: false, // this route drives the loop itself, so each call should just do its batch and return
      })

      totalRowsUpserted += Number(batchResult.totalRowsUpserted) || 0
      batches += 1
      offset += batchSize
    }

    steps.push({ step: 'backfill-game-logs', totalPlayers: players.length, totalRowsUpserted, batches })
  }

  const currentSeason = new Date().getFullYear()
  const matchRefs = await fetchMatchRefsForSeason(currentSeason)

  if (matchRefs.length === 0) {
    steps.push({ step: 'backfill-advanced-stats', error: 'No match list found for current season' })
  } else {
    // Same "resolve once, pass through explicitly, drive the loop here" shape as the
    // game-logs step above - keeps offset-based pagination stable across batches.
    const batchSize = body.batchSize || 5

    let offset = 0
    let totalRowsUpserted = 0
    let batches = 0

    while (offset < matchRefs.length) {
      const batchResult = await postJson(origin, '/api/backfill-advanced-stats', {
        season: currentSeason,
        matchRefs,
        delayMs: body.delayMs,
        batchSize,
        offset,
        chain: false,
      })

      totalRowsUpserted += Number(batchResult.totalRowsUpserted) || 0
      batches += 1
      offset += batchSize
    }

    steps.push({ step: 'backfill-advanced-stats', season: currentSeason, totalMatches: matchRefs.length, totalRowsUpserted, batches })
  }

  const injuriesResult = await postJson(origin, '/api/sync-injuries', {})
  steps.push({ step: 'sync-injuries', ...injuriesResult })

  const modelResult = await postJson(origin, '/api/build-model', {})
  steps.push({ step: 'build-model', ...modelResult })

  return NextResponse.json({ success: true, steps })
}
