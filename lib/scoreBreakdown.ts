import { getPlayerGameLog } from '@/lib/gameLogStore'
import type { PlayerGameLogRow } from '@/types'

export type ScoreBreakdownBucketKey = 'disposal' | 'marking' | 'tackling' | 'scoring' | 'ruck' | 'discipline'

export interface ScoreBreakdownBucket {
  key: ScoreBreakdownBucketKey
  label: string
  points: number
  share: number
  description: string
}

export interface ScoreBreakdown {
  season: number
  gamesCounted: number
  totalFantasyPoints: number
  buckets: ScoreBreakdownBucket[]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function num(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Same weights as footywireShared.calculateFantasyPoints, split into "where did these points
 * come from" buckets instead of one total. Deliberately not a stoppage-vs-transition split -
 * footywire's free per-game totals don't carry play-by-play context, so that split would be
 * guesswork. This is an exact accounting of the real scoring formula instead. */
function bucketPointsForRow(row: PlayerGameLogRow) {
  return {
    disposal: num(row.kicks) * 3 + num(row.handballs) * 2,
    marking: num(row.marks) * 3,
    tackling: num(row.tackles) * 4,
    scoring: num(row.goals) * 6 + num(row.behinds) * 1,
    ruck: num(row.hitouts) * 1,
    discipline: num(row.freesFor) * 1 - num(row.freesAgainst) * 3,
  }
}

const BUCKET_META: Record<ScoreBreakdownBucketKey, { label: string; description: string }> = {
  disposal: { label: 'Disposals', description: 'Kicks (3pt each) + handballs (2pt each).' },
  marking: { label: 'Marking', description: 'Marks (3pt each).' },
  tackling: { label: 'Tackling', description: 'Tackles (4pt each).' },
  scoring: { label: 'Scoring', description: 'Goals (6pt) + behinds (1pt).' },
  ruck: { label: 'Ruck', description: 'Hitouts (1pt each).' },
  discipline: { label: 'Discipline', description: 'Frees for (+1) minus frees against (-3).' },
}

/** Rows scraped before the raw-stat columns were added (see migration 007) only have
 * fantasy_points/disposals/goals - `kicks` is the marker column that tells them apart from
 * rows that have been (re-)scraped since. Those older rows are excluded rather than
 * half-counted, since a partial bucket total would understate the real score. */
export function summariseScoreBreakdown(rows: PlayerGameLogRow[]): ScoreBreakdown | null {
  const withRawStats = rows.filter((row) => row.kicks !== undefined)
  if (withRawStats.length === 0) return null

  const totals = withRawStats.reduce(
    (acc, row) => {
      const bucketed = bucketPointsForRow(row)
      acc.disposal += bucketed.disposal
      acc.marking += bucketed.marking
      acc.tackling += bucketed.tackling
      acc.scoring += bucketed.scoring
      acc.ruck += bucketed.ruck
      acc.discipline += bucketed.discipline
      acc.fantasyPoints += row.fantasyPoints
      return acc
    },
    { disposal: 0, marking: 0, tackling: 0, scoring: 0, ruck: 0, discipline: 0, fantasyPoints: 0 }
  )

  const positiveTotal = totals.disposal + totals.marking + totals.tackling + totals.scoring + totals.ruck +
    Math.max(0, totals.discipline)

  const bucketKeys: ScoreBreakdownBucketKey[] = ['disposal', 'marking', 'tackling', 'scoring', 'ruck', 'discipline']

  const buckets: ScoreBreakdownBucket[] = bucketKeys.map((key) => ({
    key,
    label: BUCKET_META[key].label,
    points: round1(totals[key]),
    share: positiveTotal > 0 ? round1((Math.max(0, totals[key]) / positiveTotal) * 100) : 0,
    description: BUCKET_META[key].description,
  }))

  const latestRow = withRawStats[withRawStats.length - 1]

  return {
    season: latestRow.season,
    gamesCounted: withRawStats.length,
    totalFantasyPoints: round1(totals.fantasyPoints),
    buckets,
  }
}

export async function getScoreBreakdownForPlayer(playerName: string, season?: number): Promise<ScoreBreakdown | null> {
  const rows = await getPlayerGameLog(playerName)
  const filtered = season ? rows.filter((row) => row.season === season) : rows
  return summariseScoreBreakdown(filtered)
}
