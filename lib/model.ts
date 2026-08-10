import { supabase } from '@/lib/supabase'
import { fetchAllPlayers } from '@/lib/aflFantasy'
import { getAllGameLogRows } from '@/lib/gameLogStore'
import { normaliseTeamName } from '@/lib/matchups'
import { normaliseVenueName } from '@/lib/venues'
import type { PlayerGameLogRow } from '@/types'

export interface ModelCoefficients {
  intercept: number
  seasonAvg: number
  recentForm: number
  opponentDvp: number
  venueEffect: number
  homeAway: number
}

export interface FittedModel {
  modelVersion: string
  coefficients: ModelCoefficients
  sampleSize: number
  rSquared: number
  fittedAt: string
}

export const MIN_TRAINING_ROWS = 30

interface TrainingRow {
  features: number[]
  target: number
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function seasonRoundKey(row: PlayerGameLogRow): number {
  return row.season * 100 + row.round
}

async function buildPositionLookup(): Promise<Map<string, string>> {
  const players = await fetchAllPlayers()
  const map = new Map<string, string>()

  for (const player of players) {
    map.set(`${player.firstName} ${player.lastName}`, player.position?.[0] || 'MID')
  }

  return map
}

/** Gauss-Jordan elimination with partial pivoting. Solves the small (features+1)-dimensional normal-equations system for OLS/ridge regression. */
function gaussianSolve(a: number[][], b: number[]): number[] {
  const n = a.length
  const m = a.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let pivotRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivotRow][col])) pivotRow = row
    }
    ;[m[col], m[pivotRow]] = [m[pivotRow], m[col]]

    const pivot = m[col][col]
    if (Math.abs(pivot) < 1e-10) continue

    for (let c = col; c <= n; c++) m[col][c] /= pivot

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = m[row][col]
      for (let c = col; c <= n; c++) m[row][c] -= factor * m[col][c]
    }
  }

  return m.map((row) => row[n])
}

function solveRidgeRegression(X: number[][], y: number[], lambda = 0.5): number[] {
  const p = X[0].length
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  const Xty: number[] = new Array(p).fill(0)

  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[i][a] * y[i]
      for (let b = 0; b < p; b++) XtX[a][b] += X[i][a] * X[i][b]
    }
  }

  for (let a = 1; a < p; a++) XtX[a][a] += lambda // don't regularise the intercept

  return gaussianSolve(XtX, Xty)
}

function computeRSquared(actual: number[], predicted: number[]): number {
  const meanActual = mean(actual)
  const ssTot = actual.reduce((sum, v) => sum + (v - meanActual) ** 2, 0)
  const ssRes = actual.reduce((sum, v, i) => sum + (v - predicted[i]) ** 2, 0)
  return ssTot > 0 ? 1 - ssRes / ssTot : 0
}

/**
 * Builds point-in-time-ish (leave-one-out, not fully walk-forward) training rows from every stored
 * game log row: [seasonAvgSoFar, recentFormLast3, opponentDvpForPosition, venueEffect, homeAway] -> actual fantasyPoints.
 * Known simplification: venueEffect and opponentDvp are computed leave-one-out across the WHOLE dataset
 * (not "as of that date"), so there's mild look-ahead bias - acceptable for a v1 fit, not for backtesting claims.
 */
async function buildTrainingRows(): Promise<TrainingRow[]> {
  const [allRows, positionByName] = await Promise.all([getAllGameLogRows(), buildPositionLookup()])

  const byPlayer = new Map<string, PlayerGameLogRow[]>()
  for (const row of allRows) {
    byPlayer.set(row.playerName, [...(byPlayer.get(row.playerName) || []), row])
  }
  for (const rows of byPlayer.values()) rows.sort((a, b) => seasonRoundKey(a) - seasonRoundKey(b))

  const opponentPositionTotals = new Map<string, { sum: number; count: number }>()
  for (const row of allRows) {
    if (!row.opponent) continue
    const position = positionByName.get(row.playerName) || 'MID'
    const key = `${normaliseTeamName(row.opponent)}__${position}`
    const existing = opponentPositionTotals.get(key) || { sum: 0, count: 0 }
    existing.sum += row.fantasyPoints
    existing.count += 1
    opponentPositionTotals.set(key, existing)
  }

  const trainingRows: TrainingRow[] = []

  for (const [playerName, rows] of byPlayer.entries()) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const priorSameSeason = rows.slice(0, i).filter((r) => r.season === row.season)
      const priorAny = rows.slice(0, i)

      const seasonAvg = priorSameSeason.length > 0
        ? mean(priorSameSeason.map((r) => r.fantasyPoints))
        : priorAny.length > 0
          ? mean(priorAny.map((r) => r.fantasyPoints))
          : null

      if (seasonAvg === null) continue

      const recentWindow = priorAny.slice(-3)
      const recentForm = recentWindow.length > 0 ? mean(recentWindow.map((r) => r.fantasyPoints)) : seasonAvg

      let opponentDvp = seasonAvg
      if (row.opponent) {
        const position = positionByName.get(playerName) || 'MID'
        const key = `${normaliseTeamName(row.opponent)}__${position}`
        const totals = opponentPositionTotals.get(key)
        if (totals && totals.count > 1) {
          opponentDvp = (totals.sum - row.fantasyPoints) / (totals.count - 1)
        }
      }

      let venueEffect = 0
      if (row.venue) {
        const venueRows = rows.filter((r, idx) => idx !== i && r.venue && normaliseVenueName(r.venue) === normaliseVenueName(row.venue!))
        if (venueRows.length > 0) venueEffect = mean(venueRows.map((r) => r.fantasyPoints)) - seasonAvg
      }

      const homeAway = row.isHome === true ? 1 : row.isHome === false ? -1 : 0

      trainingRows.push({ features: [seasonAvg, recentForm, opponentDvp, venueEffect, homeAway], target: row.fantasyPoints })
    }
  }

  return trainingRows
}

export async function fitProjectionModel(): Promise<FittedModel> {
  const trainingRows = await buildTrainingRows()

  if (trainingRows.length < MIN_TRAINING_ROWS) {
    throw new Error(
      `Not enough game-log rows to fit a model yet (${trainingRows.length} usable rows, need at least ${MIN_TRAINING_ROWS}). Run /api/backfill-game-logs first.`
    )
  }

  const X = trainingRows.map((row) => [1, ...row.features])
  const y = trainingRows.map((row) => row.target)
  const solved = solveRidgeRegression(X, y)

  const coefficients: ModelCoefficients = {
    intercept: solved[0],
    seasonAvg: solved[1],
    recentForm: solved[2],
    opponentDvp: solved[3],
    venueEffect: solved[4],
    homeAway: solved[5],
  }

  const predicted = X.map((row) => row.reduce((sum, x, idx) => sum + x * solved[idx], 0))
  const rSquared = round(computeRSquared(y, predicted), 3)

  const fitted: FittedModel = {
    modelVersion: 'v1-ridge-ols',
    coefficients,
    sampleSize: trainingRows.length,
    rSquared,
    fittedAt: new Date().toISOString(),
  }

  const { error } = await supabase.from('projection_model_coefficients').insert({
    model_version: fitted.modelVersion,
    coefficients: fitted.coefficients,
    sample_size: fitted.sampleSize,
    r_squared: fitted.rSquared,
    fitted_at: fitted.fittedAt,
  })

  if (error) throw error
  return fitted
}

export async function getLatestFittedModel(): Promise<FittedModel | null> {
  const { data, error } = await supabase
    .from('projection_model_coefficients')
    .select('*')
    .order('fitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    modelVersion: data.model_version,
    coefficients: data.coefficients,
    sampleSize: data.sample_size,
    rSquared: Number(data.r_squared) || 0,
    fittedAt: data.fitted_at,
  }
}
