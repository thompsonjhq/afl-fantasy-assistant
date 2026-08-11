'use client'

import { useEffect, useState } from 'react'
import type { ScoreBreakdown, ScoreBreakdownBucketKey } from '@/lib/scoreBreakdown'
import type { RoleProfileSummary } from '@/lib/advancedStatsStore'

const BUCKET_COLOR_CLASS: Record<ScoreBreakdownBucketKey, string> = {
  disposal: 'bg-chart-1',
  marking: 'bg-chart-2',
  tackling: 'bg-chart-3',
  scoring: 'bg-chart-4',
  ruck: 'bg-chart-5',
  discipline: 'bg-destructive',
}

interface ScoreBreakdownChartProps {
  playerName: string
  season?: number
}

export function ScoreBreakdownChart({ playerName, season }: ScoreBreakdownChartProps) {
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null)
  const [roleProfile, setRoleProfile] = useState<RoleProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')

    const params = new URLSearchParams({ player: playerName })
    if (season) params.set('season', String(season))

    fetch(`/api/score-breakdown?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data.success) throw new Error(data.error || 'Failed to load score breakdown')
        setBreakdown(data.breakdown)
        setRoleProfile(data.roleProfile)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load score breakdown')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerName, season])

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading score breakdown…</div>
  }

  if (error || !breakdown) {
    return null
  }

  const visibleBuckets = breakdown.buckets.filter((bucket) => bucket.points !== 0)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-foreground">
        How {breakdown.totalFantasyPoints} points ({breakdown.season}, {breakdown.gamesCounted} game{breakdown.gamesCounted === 1 ? '' : 's'}) were earned
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {visibleBuckets.map((bucket) => (
          <div
            key={bucket.key}
            className={BUCKET_COLOR_CLASS[bucket.key]}
            style={{ width: `${bucket.share}%` }}
            title={`${bucket.label}: ${bucket.points} pts (${bucket.share}%)`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {visibleBuckets.map((bucket) => (
          <div key={bucket.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${BUCKET_COLOR_CLASS[bucket.key]}`} />
            <span className="text-foreground">{bucket.label}</span>
            <span>{bucket.points} pts ({bucket.share}%)</span>
          </div>
        ))}
      </div>

      {roleProfile && (
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="text-foreground">{roleProfile.contestedSharePct}% contested</span> ({roleProfile.avgContestedPossessions} CP / {roleProfile.avgUncontestedPossessions} UP per game)
          {' · '}{roleProfile.avgMarksInside50} MI5{' · '}{roleProfile.avgTacklesInside50} T-I50{' · '}{roleProfile.avgIntercepts} ITC{' · '}{roleProfile.avgTogPct}% TOG
          {' '}(advanced stats, {roleProfile.games} games)
        </div>
      )}
    </div>
  )
}
