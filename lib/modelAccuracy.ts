import { supabase } from '@/lib/supabase'
import type { Player } from '@/types'

export interface ModelAccuracySummary {
  modelVersion: string
  games: number
  mae: number
  bias: number
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

/** 'data' factor value looks like "Fitted (n=42, R²=0.31)" or "Heuristic" (see
 * lib/projections.ts getFittedModelScore) - collapsing to a short model_version key for
 * grouping snapshots, rather than storing the full formatted string as the key. */
function modelVersionForPlayer(player: Player): string {
  const dataFactor = player.projectionFactors?.find((factor) => factor.kind === 'data')
  return dataFactor?.available ? 'fitted' : 'heuristic'
}

export async function snapshotProjections(season: number, round: number, players: Player[]): Promise<{ upserted: number }> {
  const rows = players
    .filter((player) => typeof player.projectedScore === 'number')
    .map((player) => ({
      season,
      round,
      player_name: player.name,
      model_version: modelVersionForPlayer(player),
      projected_score: player.projectedScore,
      projection_low: player.projectionLow ?? null,
      projection_high: player.projectionHigh ?? null,
      factors: player.projectionFactors ?? null,
      created_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return { upserted: 0 }

  const { error } = await supabase
    .from('projection_snapshots')
    .upsert(rows, { onConflict: 'season,round,player_name,model_version' })

  if (error) throw error
  return { upserted: rows.length }
}

/** Joins projection_snapshots against player_game_logs' real fantasy_points for the same
 * season+round+player, so heuristic vs fitted-model accuracy can be compared once rounds
 * complete. Snapshots with no matching game log yet (round still in progress, or the round
 * was never snapshotted) are silently excluded rather than counted as zero error. */
export async function computeModelAccuracy(season: number): Promise<ModelAccuracySummary[]> {
  const { data: snapshots, error: snapshotError } = await supabase
    .from('projection_snapshots')
    .select('player_name, round, model_version, projected_score')
    .eq('season', season)

  if (snapshotError || !snapshots || snapshots.length === 0) return []

  const { data: gameLogs, error: gameLogError } = await supabase
    .from('player_game_logs')
    .select('player_name, round, fantasy_points')
    .eq('season', season)

  if (gameLogError || !gameLogs) return []

  const actualByKey = new Map<string, number>()
  for (const row of gameLogs) {
    actualByKey.set(`${row.player_name}__${row.round}`, Number(row.fantasy_points))
  }

  const byModel = new Map<string, { errors: number[]; absErrors: number[] }>()

  for (const snapshot of snapshots) {
    const actual = actualByKey.get(`${snapshot.player_name}__${snapshot.round}`)
    if (actual === undefined) continue

    const projected = Number(snapshot.projected_score)
    const error = actual - projected
    const modelVersion = String(snapshot.model_version)

    const bucket = byModel.get(modelVersion) || { errors: [], absErrors: [] }
    bucket.errors.push(error)
    bucket.absErrors.push(Math.abs(error))
    byModel.set(modelVersion, bucket)
  }

  return Array.from(byModel.entries())
    .map(([modelVersion, bucket]) => ({
      modelVersion,
      games: bucket.errors.length,
      mae: round1(mean(bucket.absErrors)),
      bias: round1(mean(bucket.errors)),
    }))
    .sort((a, b) => a.mae - b.mae)
}
